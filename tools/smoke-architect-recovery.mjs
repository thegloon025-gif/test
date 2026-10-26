/** Mocked generation responses through real browser/UI. No connected model call. */
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
const [base, out] = process.argv.slice(2);
const lib = await import(process.env.PLAYWRIGHT_MODULE || "playwright"),
  chromium = lib.chromium || lib.default.chromium;
const status = await (await fetch(base + "/api/architect/status")).json();
const useful = await readFile(
  "benchmarks/chatgpt-architect/ulalek-validated-manual-fixture.txt",
  "utf8",
);
const fixture = await (
  await fetch(base + "/api/architect/import", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-commander-ai-session": status.csrf,
    },
    body: JSON.stringify({
      mode: "builder",
      commanderName: "Ulalek, Fused Atrocity",
      bracket: 3,
      budget: 191,
      result: JSON.stringify({ deck: useful }),
    }),
  })
).json();
assert.equal(fixture.valid, true);
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
let calls = 0,
  next;
const errors = [],
  checks = [];
try {
  const context = await browser.newContext(),
    page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("https://**", (route) => route.abort());
  await page.route("**/api/architect/status", (route) =>
    route.fulfill({
      json: {
        ...status,
        enabled: true,
        generationDeadlineMs: 165000,
        models: [{ slug: "mock-model", displayName: "Mock only" }],
        selectedModel: "mock-model",
        active: false,
        auth: { status: "connected", sharing: true },
      },
    }),
  );
  await page.route("**/api/architect/configure", (route) =>
    route.fulfill({ json: { mock: true } }),
  );
  await page.route("**/api/architect/run", (route) => {
    calls++;
    return route.fulfill({ status: next.status || 200, json: next.body });
  });
  await page.goto(base);
  await page.locator("#chatgpt-architect summary").first().click();
  await page.locator("#ai-name").fill("Ulalek, Fused Atrocity");
  for (const id of ["ai-authorize", "ai-settings", "ai-credits"])
    await page.locator("#" + id).check();
  await page.locator("#ai-enable").click();
  await page.waitForFunction(() => !document.getElementById("ai-run").disabled);
  const cases = [
    {
      code: "timed_out",
      status: 400,
      body: {
        valid: false,
        code: "timed_out",
        error: "Deadline expired",
        response: {
          textReceived: false,
          charactersReceived: 0,
          charactersCaptured: 0,
        },
      },
    },
    {
      code: "timed_out",
      status: 400,
      body: {
        valid: false,
        code: "timed_out",
        error: "Deadline expired",
        response: {
          textReceived: true,
          charactersReceived: 18,
          charactersCaptured: 18,
        },
        draft: { text: "1 Sol Ring\n1 Wastes", unvalidated: true },
      },
    },
    {
      code: "cancelled",
      status: 400,
      body: {
        valid: false,
        code: "cancelled",
        response: {
          textReceived: true,
          charactersReceived: 7,
          charactersCaptured: 7,
        },
        draft: { text: "partial", unvalidated: true },
      },
    },
    {
      code: "empty_response",
      status: 400,
      body: {
        valid: false,
        code: "empty_response",
        response: {
          textReceived: false,
          charactersReceived: 0,
          charactersCaptured: 0,
        },
      },
    },
    {
      code: "validation_failed",
      body: {
        valid: false,
        code: "validation_failed",
        issues: ["Expected 100 cards."],
        response: {
          textReceived: true,
          charactersReceived: 2,
          charactersCaptured: 2,
        },
        draft: { text: "{}", unvalidated: true },
      },
    },
    { code: "malformed-envelope", body: {} },
  ];
  for (const c of cases) {
    next = c;
    await page.locator("#ai-result").fill(useful);
    const before = calls;
    await page.locator("#ai-run").click();
    await page.waitForFunction(() =>
      document.getElementById("ai-message").textContent.includes("preserved"),
    );
    assert.equal(await page.locator("#ai-result").inputValue(), useful);
    assert.equal(await page.locator("#ai-download").isDisabled(), true);
    assert.equal(await page.locator("#ai-review").isDisabled(), true);
    assert.equal(calls, before + 1);
    if (c.body.draft) {
      assert.equal(
        await page.locator("#ai-partial").inputValue(),
        c.body.draft.text,
      );
      assert.match(
        await page.locator("#ai-draft-details").textContent(),
        /Unvalidated/,
      );
    }
    checks.push(
      c.code +
        ": useful draft retained, exports disabled, one click/one mocked request",
    );
    await page.waitForFunction(
      () => !document.getElementById("ai-run").disabled,
    );
  }
  // Failed text must traverse the actual local validation gate before any export.
  await page
    .locator("#ai-result")
    .fill("1 Ulalek, Fused Atrocity *CMDR*\n1 Sol Ring");
  await page.locator("#ai-import").click();
  await page.waitForFunction(() =>
    document.getElementById("ai-message").textContent.includes("100"),
  );
  assert.equal(await page.locator("#ai-download").isDisabled(), true);
  checks.push("partial import rejected by real 100-card validator");
  next = { body: fixture };
  const before = calls;
  await page.locator("#ai-run").click();
  await page.waitForFunction(
    () => !document.getElementById("ai-download").disabled,
  );
  assert.equal(
    JSON.parse(await page.locator("#ai-result").inputValue()).deck,
    fixture.deck,
  );
  assert.equal(calls, before + 1);
  checks.push(
    "only locally validated complete fixture replaces the editor and enables revalidated download",
  );
  assert.deepEqual(errors, []);
  await writeFile(
    out,
    JSON.stringify(
      {
        scope:
          "Mocked auth/configure/generation transport; real renderer and local import gate. No OAuth or inference. Not a Windows/live-model test.",
        mockedRequests: calls,
        checks,
        pageErrors: errors,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    JSON.stringify({
      mockedRequests: calls,
      checks: checks.length,
      pageErrors: errors,
    }),
  );
} finally {
  await browser.close();
}
