import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  createPlanOnly,
  QUOTA_MESSAGE,
  safePlanError,
} from "../src/planOnly.mjs";
import { windowsCredentialEncryption } from "../src/chatgptSdk.mjs";
const config = {
  enabled: true,
  directUseAuthorized: true,
  accountSettingsConfirmed: true,
  creditsSettingReviewed: true,
  weeklyLimitPercent: 25,
  dailyLimit: 3,
  model: "eligible-model",
};
async function fixture(overrides = {}, controllerOptions = {}) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "plan-only-")),
    calls = [],
    state = { status: "connected", sharing: true, profileId: "synthetic" },
    sdk = {
      async signIn() {
        return state;
      },
      async getSession() {
        return state;
      },
      async listModels() {
        return [{ slug: "eligible-model", displayName: "Eligible" }];
      },
      async disconnect() {
        state.status = "disconnected";
      },
      cancelSignIn() {},
      async streamResponse(p) {
        calls.push(p);
        p.onDelta('{"ok":true}');
        return { text: '{"ok":true}' };
      },
      ...overrides,
    };
  const file = path.join(dir, "usage.json"),
    factory = async () => sdk,
    c = createPlanOnly({
      sdkFactory: factory,
      historyFile: file,
      ...controllerOptions,
    });
  return { c, calls, state, file, factory };
}
async function enable(f) {
  await f.c.signIn({ directUseAuthorized: true });
  await f.c.discover();
  await f.c.configure(config);
}
test("disabled by default, confirmation and below-100 limit required", async () => {
  const f = await fixture();
  await assert.rejects(
    f.c.run({ prompt: "x", validate: () => ({ valid: true }) }),
  );
  assert.equal(f.calls.length, 0);
  await assert.rejects(f.c.signIn({ directUseAuthorized: false }));
  await f.c.signIn({ directUseAuthorized: true });
  await f.c.discover();
  for (const changes of [
    { accountSettingsConfirmed: false },
    { directUseAuthorized: false },
    { creditsSettingReviewed: false },
    { weeklyLimitPercent: 100 },
  ])
    await assert.rejects(f.c.configure({ ...config, ...changes }));
  assert.equal(f.calls.length, 0);
});
test("authorized mocked plan, discovered model, no environment API key forwarded", async () => {
  const before = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "DO_NOT_USE_SYNTHETIC_KEY";
  try {
    const f = await fixture();
    await enable(f);
    const x = await f.c.run({
      prompt: "bounded verified cards",
      validate: () => ({ valid: true }),
    });
    assert.equal(x.valid, true);
    assert.equal(f.calls.length, 1);
    assert.equal(f.calls[0].model, "eligible-model");
    assert.ok(!JSON.stringify(f.calls).includes("DO_NOT_USE_SYNTHETIC_KEY"));
    assert.equal(f.calls[0].apiKey, undefined);
    const status = await f.c.status();
    assert.equal(status.strictPlanOnly, true);
    assert.equal(status.paidFallback, false);
    assert.match(
      safePlanError({ code: "revocation_failed" }).message,
      /unconfirmed/,
    );
    assert.equal(status.requestsToday, 1);
  } finally {
    if (before === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = before;
  }
});
for (const code of [
  "subscription_sharing_usage_limit_exceeded",
  "subscription_sharing_user_not_eligible",
  "subscription_sharing_usage_unavailable",
  "model_not_found",
  "sign_in_required",
  "network_error",
  "chatpass_v2_scope_not_authorized",
])
  test("stop without fallback/retry: " + code, async () => {
    const f = await fixture({
      async streamResponse(p) {
        f.calls.push(p);
        throw Object.assign(new Error("secret should not escape"), { code });
      },
    });
    await enable(f);
    await assert.rejects(
      f.c.run({ prompt: "x", validate: () => ({ valid: true }) }),
    );
    await assert.rejects(
      f.c.run({ prompt: "x", validate: () => ({ valid: true }) }),
    );
    assert.equal(f.calls.length, 1);
    assert.equal((await f.c.status()).enabled, false);
    assert.ok(!(await readFile(f.file, "utf8")).includes("secret"));
    if (code === "subscription_sharing_usage_limit_exceeded")
      assert.equal(safePlanError({ code }).message, QUOTA_MESSAGE);
  });
test("missing direct scope and unsupported discovered model never infer", async () => {
  const f = await fixture();
  f.state.sharing = false;
  await f.c.signIn({ directUseAuthorized: true });
  await assert.rejects(f.c.discover());
  assert.equal(f.calls.length, 0);
  const g = await fixture();
  await g.c.discover();
  await assert.rejects(g.c.configure({ ...config, model: "unavailable" }));
  assert.equal(g.calls.length, 0);
});
test("daily counter persists across restart and stop/auth resets do not erase it", async () => {
  const f = await fixture();
  await enable(f);
  await f.c.configure({ ...config, dailyLimit: 1 });
  await f.c.run({ prompt: "x", validate: () => ({ valid: true }) });
  await assert.rejects(
    f.c.run({ prompt: "x", validate: () => ({ valid: true }) }),
  );
  const other = createPlanOnly({ sdkFactory: f.factory, historyFile: f.file });
  await other.signIn({ directUseAuthorized: true });
  await other.discover();
  await other.configure({ ...config, dailyLimit: 1 });
  await assert.rejects(
    other.run({ prompt: "x", validate: () => ({ valid: true }) }),
  );
  assert.equal(f.calls.length, 1);
});
test("only two local-validation repairs, each counts toward daily maximum", async () => {
  const f = await fixture();
  await enable(f);
  const r = await f.c.run({
    prompt: "x",
    validate: () => ({ valid: false, issues: ["bad deck"] }),
  });
  assert.equal(r.iterations, 3);
  assert.equal(f.calls.length, 3);
  assert.equal((await f.c.status()).requestsToday, 3);
  await assert.rejects(
    f.c.run({ prompt: "x", validate: () => ({ valid: true }) }),
  );
});
test("one active request and stream cancellation; original input immutable", async () => {
  let notify;
  const started = new Promise((r) => (notify = r));
  const f = await fixture({
    async streamResponse(p) {
      f.calls.push(p);
      notify();
      return new Promise((resolve, reject) =>
        p.signal.addEventListener(
          "abort",
          () => reject(Object.assign(Error(), { code: "cancelled" })),
          { once: true },
        ),
      );
    },
  });
  await enable(f);
  const original = { deck: "unmodified" },
    snapshot = JSON.stringify(original),
    job = f.c.run({ prompt: snapshot, validate: () => ({ valid: true }) });
  await started;
  await assert.rejects(
    f.c.run({ prompt: "x", validate: () => ({ valid: true }) }),
  );
  f.c.cancel();
  await assert.rejects(job);
  assert.equal(f.calls.length, 1);
  assert.equal(JSON.stringify(original), snapshot);
});
test("expired/disconnected session and profile switches block before a call", async () => {
  for (const mutate of [
    (s) => (s.status = "reauth_required"),
    (s) => (s.status = "disconnected"),
    (s) => (s.profileId = "changed"),
  ]) {
    const f = await fixture();
    await enable(f);
    mutate(f.state);
    await assert.rejects(
      f.c.run({ prompt: "x", validate: () => ({ valid: true }) }),
    );
    assert.equal(f.calls.length, 0);
  }
});
test("OS encryption unavailable is explicit; no plaintext provider fallback", async () => {
  const p = windowsCredentialEncryption({ platform: "linux" });
  assert.equal(await p.isAvailable(), false);
  await assert.rejects(p.encrypt("secret"));
  let captured;
  const fake = windowsCredentialEncryption({
    platform: "win32",
    runner: async (bytes, decrypt) => {
      captured = { bytes: bytes.toString(), decrypt };
      return Buffer.from(bytes);
    },
  });
  await fake.encrypt("synthetic");
  assert.equal(captured.bytes, "synthetic");
  assert.equal(await fake.isAvailable(), true);
});
test("corrupted usage ledger fails closed, bounded requests do not infer", async () => {
  const f = await fixture();
  await writeFile(f.file, "bad json");
  await assert.rejects(f.c.status());
  assert.equal(f.calls.length, 0);
  const g = await fixture();
  await enable(g);
  await assert.rejects(
    g.c.run({ prompt: "x".repeat(64001), validate: () => ({ valid: true }) }),
  );
  assert.equal(g.calls.length, 0);
});

test("explicit one-request Builder bound never repairs invalid output or functional warnings", async () => {
  const f = await fixture();
  await f.c.discover();
  await f.c.configure(config);
  const r = await f.c.run({
    prompt: "Explicit Builder request",
    maxRepairs: 0,
    validate: () => ({ valid: false, issues: ["100 cards required"] }),
  });
  assert.equal(r.valid, false);
  assert.equal(r.iterations, 1);
  assert.equal(f.calls.length, 1);
  await assert.rejects(
    f.c.run({
      prompt: "invalid bound",
      maxRepairs: 3,
      validate: () => ({ valid: true }),
    }),
  );
  const ok = await f.c.run({
    prompt: "New explicit request",
    maxRepairs: 0,
    validate: () => ({
      valid: true,
      functionalReview: { warnings: [{ code: "unknown-access" }] },
    }),
  });
  assert.equal(ok.valid, true);
  assert.equal(f.calls.length, 2);
});

for (const partial of ["", "1 Commander *CMDR*\n1 Sol Ring"])
  test(`deadline is timed_out, not SDK cancelled; ${partial ? "partial" : "no"} text`, async () => {
    let trigger,
      cleared = false,
      notify;
    const started = new Promise((r) => (notify = r));
    const f = await fixture(
      {
        streamResponse(p) {
          f.calls.push(p);
          if (partial) p.onDelta(partial);
          notify();
          return new Promise((resolve, reject) =>
            p.signal.addEventListener(
              "abort",
              () =>
                reject(
                  Object.assign(Error("SDK caller aborted"), {
                    code: "cancelled",
                  }),
                ),
              { once: true },
            ),
          );
        },
      },
      {
        deadlineScheduler(ms, cb) {
          assert.equal(ms, 165000);
          trigger = cb;
          return () => {
            cleared = true;
          };
        },
      },
    );
    await enable(f);
    let validated = 0;
    const job = f.c.run({
      prompt: "one explicit request",
      maxRepairs: 2,
      validate() {
        validated++;
        return { valid: true };
      },
    });
    await started;
    trigger();
    await assert.rejects(job, (e) => {
      assert.equal(e.code, "timed_out");
      assert.equal(e.generation.response.textReceived, !!partial);
      assert.equal(e.generation.response.charactersReceived, partial.length);
      assert.equal(e.generation.draft?.text, partial || undefined);
      assert.equal(e.generation.draft?.unvalidated, partial ? true : undefined);
      return true;
    });
    assert.equal(validated, 0);
    assert.equal(f.calls.length, 1);
    assert.equal(cleared, true);
    const state = await f.c.status();
    assert.equal(state.requestsToday, 1);
    assert.equal(state.active, false);
    assert.equal(state.stopped, null);
    assert.ok(state.history.some((h) => h.code === "timed_out"));
    const receipt = state.history.find(
      (h) => h.state === "failed" && h.code === "timed_out",
    );
    assert.equal(receipt.responseCharacters, partial.length);
    assert.equal(receipt.textReceived, !!partial);
    assert.equal(receipt.deadlineMs, 165000);
    assert.ok(!state.history.some((h) => h.code === "cancelled"));
    assert.ok(!(await readFile(f.file, "utf8")).includes("1 Commander"));
  });
test("manual cancel preserves captured text, stays cancelled and clears deadline", async () => {
  let notify,
    cleared = false;
  const started = new Promise((r) => (notify = r));
  const f = await fixture(
    {
      streamResponse(p) {
        f.calls.push(p);
        p.onDelta("unfinished deck");
        notify();
        return new Promise((resolve, reject) =>
          p.signal.addEventListener("abort", () => reject(Error()), {
            once: true,
          }),
        );
      },
    },
    {
      deadlineScheduler(ms, cb) {
        return () => (cleared = true);
      },
    },
  );
  await enable(f);
  const job = f.c.run({
    prompt: "manual cancel",
    maxRepairs: 0,
    validate: () => assert.fail("No validation of cancelled stream"),
  });
  await started;
  f.c.cancel();
  await assert.rejects(
    job,
    (e) =>
      e.code === "cancelled" && e.generation.draft.text === "unfinished deck",
  );
  assert.equal(cleared, true);
  assert.equal(f.calls.length, 1);
  assert.equal((await f.c.status()).requestsToday, 1);
  assert.match(safePlanError({ code: "cancelled" }).message, /Cancelled/);
});
for (const text of ["", "   ", undefined])
  test(`empty completed response ${JSON.stringify(text)} does not repair or validate`, async () => {
    const f = await fixture({
      async streamResponse(p) {
        f.calls.push(p);
        return { text };
      },
    });
    await enable(f);
    await assert.rejects(
      f.c.run({
        prompt: "empty",
        maxRepairs: 2,
        validate: () => assert.fail("Empty cannot validate"),
      }),
      (e) => {
        assert.equal(e.code, "empty_response");
        assert.equal(
          e.generation.response.textReceived,
          typeof text === "string" && text.length > 0,
        );
        return true;
      },
    );
    assert.equal(f.calls.length, 1);
    assert.equal((await f.c.status()).requestsToday, 1);
  });
test("failed validation retains exact raw response and reports no automatic Builder retry", async () => {
  const text = '{"deck":"1 Commander *CMDR*"}';
  const f = await fixture({
    async streamResponse(p) {
      f.calls.push(p);
      p.onDelta(text);
      return { text };
    },
  });
  await enable(f);
  const r = await f.c.run({
    prompt: "Builder",
    maxRepairs: 0,
    validate: () => ({ valid: false, issues: ["Expected 100 cards."] }),
  });
  assert.equal(r.valid, false);
  assert.equal(r.code, "validation_failed");
  assert.equal(r.draft.text, text);
  assert.equal(r.draft.unvalidated, true);
  assert.equal(r.response.textReceived, true);
  assert.deepEqual(r.issues, ["Expected 100 cards."]);
  assert.equal(f.calls.length, 1);
  assert.equal(r.iterations, 1);
});
test("streamed prefix survives empty completion, and oversized response is not user cancellation", async () => {
  for (const mode of ["empty", "oversized"]) {
    const f = await fixture({
      async streamResponse(p) {
        f.calls.push(p);
        p.onDelta(mode === "empty" ? "useful prefix" : "x".repeat(32001));
        return { text: "" };
      },
    });
    await enable(f);
    await assert.rejects(
      f.c.run({ prompt: mode, maxRepairs: 0, validate: () => assert.fail() }),
      (e) => {
        assert.equal(
          e.code,
          mode === "empty" ? "empty_response" : "response_too_large",
        );
        assert.equal(
          e.generation.draft.text.length,
          mode === "empty" ? 13 : 32000,
        );
        return true;
      },
    );
    assert.equal(f.calls.length, 1);
  }
});
test("generation deadline defaults to 165 seconds and cannot exceed finite sub-SDK cap", async () => {
  const f = await fixture();
  const s = await f.c.status();
  assert.equal(s.generationDeadlineMs, 165000);
  assert.equal(s.maximumGenerationDeadlineMs, 170000);
  assert.ok(s.maximumGenerationDeadlineMs < 180000);
  assert.throws(() => createPlanOnly({ generationDeadlineMs: 170001 }));
  assert.throws(() => createPlanOnly({ generationDeadlineMs: Infinity }));
});

test("an explicit quota failure still latches if the local deadline fires concurrently", async () => {
  let trigger;
  const code = "subscription_sharing_usage_limit_exceeded";
  const f = await fixture(
    {
      async streamResponse(p) {
        f.calls.push(p);
        trigger();
        throw Object.assign(Error("do not expose raw message"), { code });
      },
    },
    {
      deadlineScheduler(ms, cb) {
        trigger = cb;
        return () => {};
      },
    },
  );
  await enable(f);
  await assert.rejects(
    f.c.run({
      prompt: "quota race",
      maxRepairs: 0,
      validate: () => assert.fail(),
    }),
    (e) => e.code === code,
  );
  assert.equal((await f.c.status()).stopped.code, code);
  assert.equal(f.calls.length, 1);
});
