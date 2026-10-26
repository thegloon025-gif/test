import { randomUUID } from "node:crypto";
/** Mandatory plan-only controller. No fetch, API key, provider switch or paid route. */
import { readFile, mkdir, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import { USAGE_URL } from "./chatgptSdk.mjs";
export const GENERATION_DEADLINE_MS = 165_000;
export const MAX_GENERATION_DEADLINE_MS = 170_000; // Pinned SDK body/request bound: 180,000 ms.
const MAX_RESPONSE_CHARACTERS = 32_000;
const scheduleDeadline = (ms, callback) => {
  const timer = setTimeout(callback, ms);
  return () => clearTimeout(timer);
};
export const QUOTA_MESSAGE =
  "ChatGPT usage limit reached. AI deckbuilding has stopped. No paid API fallback was attempted. You can continue using CommanderOracle's local features or try again after your usage resets.";
const fail = (code, message) => Object.assign(new Error(message), { code });
const known = new Set([
  "subscription_sharing_usage_limit_exceeded",
  "subscription_sharing_user_not_eligible",
  "subscription_sharing_usage_unavailable",
  "sharing_not_enabled",
  "model_not_found",
  "sign_in_required",
  "secure_storage_unavailable",
  "sdk_unavailable",
  "cancelled",
  "timed_out",
  "empty_response",
  "response_too_large",
  "response_incomplete",
  "validation_failed",
  "daily_limit",
  "confirmation_required",
  "disabled",
  "busy",
  "invalid_request",
  "session_changed",
  "subscription_sharing_route_not_supported",
  "subscription_sharing_unsupported_capability",
  "subscription_sharing_invalid_user",
  "chatpass_v2_scope_not_authorized",
  "chatpass_v2_invalid_authorization_context",
  "invalid_token",
  "token_expired",
  "invalid_grant",
  "identity_verification_unavailable",
  "network_error",
  "invalid_stream",
  "stream_interrupted",
  "revocation_failed",
]);
export function safePlanError(error) {
  const code = known.has(error?.code) ? error.code : "plan_request_failed";
  return {
    code,
    message:
      code === "subscription_sharing_usage_limit_exceeded"
        ? QUOTA_MESSAGE
        : code === "revocation_failed"
          ? "Local credentials were removed; remote revocation is unconfirmed. Remove CommanderOracle in ChatGPT Settings. No paid API fallback was attempted."
          : code === "secure_storage_unavailable"
            ? "Secure OS credential storage is unavailable; use manual copy/import."
            : code === "sdk_unavailable"
              ? "The pinned official SDK is not installed or verified; see local setup instructions."
              : code === "confirmation_required"
                ? "Confirm ChatGPT credit/app-limit settings and explicit plan-use authorization before enabling AI."
                : code === "daily_limit"
                  ? "Local daily request limit reached. No paid API fallback was attempted."
                  : code === "cancelled"
                    ? "Cancelled at your request, disconnect or closed app connection. Your existing draft is preserved. No automatic retry."
                    : code === "timed_out"
                      ? "Generation deadline expired. This was an automatic timeout, not a user cancellation. No automatic retry or paid fallback; inspect any unvalidated response text below."
                      : code === "empty_response"
                        ? "ChatGPT completed without usable response text. No automatic retry; your existing draft is preserved."
                        : code === "response_too_large"
                          ? "Response exceeded the local text limit. Captured text is an unvalidated draft only. No automatic retry."
                          : code === "validation_failed"
                            ? "Response failed local validation. Your existing draft is preserved; inspect the unvalidated response and issues below."
                            : "ChatGPT plan-only operation stopped (" +
                              code +
                              "). No paid API fallback was attempted. Manual/local features remain available.",
  };
}
export function createPlanOnly({
  sdkFactory,
  historyFile,
  clock = () => new Date(),
  generationDeadlineMs = GENERATION_DEADLINE_MS,
  deadlineScheduler = scheduleDeadline,
} = {}) {
  if (
    !Number.isInteger(generationDeadlineMs) ||
    generationDeadlineMs < 1000 ||
    generationDeadlineMs > MAX_GENERATION_DEADLINE_MS
  )
    throw fail("invalid_request", "Generation deadline must be 1–170 seconds.");
  let sdk = null,
    auth = { status: "disconnected", sharing: false },
    models = [],
    selected = null,
    enabled = false,
    confirmed = false,
    authorized = false,
    profile = null,
    active = null,
    authBusy = false,
    limit = 3,
    history = [],
    initialized = false,
    stopped = null,
    counter = { day: null, count: 0 };
  const day = () => clock().toISOString().slice(0, 10);
  async function load() {
    if (initialized) return;
    try {
      const saved = JSON.parse(await readFile(historyFile, "utf8"));
      if (!Array.isArray(saved.history) || saved.history.length > 500)
        throw Error();
      history = saved.history;
      if (
        !saved.counter ||
        !Number.isInteger(saved.counter.count) ||
        saved.counter.count < 0
      )
        throw Error();
      counter = saved.counter;
      if (
        Number.isInteger(saved.limit) &&
        saved.limit >= 1 &&
        saved.limit <= 10
      )
        limit = saved.limit;
      stopped = saved.stopped || null;
    } catch (e) {
      if (e.code !== "ENOENT")
        throw fail(
          "invalid_request",
          "Local usage ledger unreadable; refusing connected AI.",
        );
    }
    initialized = true;
  }
  async function save() {
    await mkdir(path.dirname(historyFile), { recursive: true, mode: 0o700 });
    const tmp = historyFile + ".tmp-" + randomUUID();
    await writeFile(
      tmp,
      JSON.stringify({ limit, history: history.slice(-500), stopped, counter }),
      { mode: 0o600, flag: "wx" },
    );
    await rename(tmp, historyFile);
  }
  function clear() {
    enabled = false;
    confirmed = false;
    authorized = false;
    selected = null;
    models = [];
    profile = null;
  }
  async function record(state, code, operation = "inference", receipt = null) {
    if (operation === "inference" && state === "started") {
      if (counter.day !== day()) counter = { day: day(), count: 0 };
      counter.count++;
    }
    history.push({
      timestamp: clock().toISOString(),
      day: day(),
      operation,
      state,
      ...(code ? { code } : {}),
      ...(receipt
        ? {
            textReceived: receipt.textReceived === true,
            responseCharacters: receipt.charactersReceived,
            capturedCharacters: receipt.charactersCaptured,
            deadlineMs: generationDeadlineMs,
          }
        : {}),
    });
    history = history.slice(-500);
    await save();
  }
  const used = () => (counter.day === day() ? counter.count : 0);
  async function client() {
    sdk ??= await sdkFactory();
    return sdk;
  }
  // Pinned DevKit sharing=true requires verified credentials and chatgpt.tokens.use.direct.
  async function fresh() {
    let session;
    try {
      session = await (await client()).getSession();
    } catch (e) {
      clear();
      auth = { status: "reauth_required", sharing: false };
      throw e;
    }
    if (profile && session.profileId !== profile) {
      clear();
      throw fail("session_changed", "Account changed.");
    }
    auth = { status: session.status, sharing: session.sharing === true };
    if (
      session.error ||
      session.status !== "connected" ||
      !session.sharing ||
      typeof session.profileId !== "string" ||
      !session.profileId
    ) {
      clear();
      throw fail(
        session.error?.code || "sharing_not_enabled",
        "Direct plan use unavailable.",
      );
    }
    return session;
  }
  async function gate() {
    await load();
    if (!enabled) throw fail("disabled", "AI disabled.");
    if (!confirmed || !authorized)
      throw fail("confirmation_required", "Confirmation missing.");
    if (stopped?.day === day())
      throw fail(stopped.code, "Plan requests stopped.");
    if (used() >= limit) throw fail("daily_limit", "Local limit reached.");
    await fresh();
    if (!models.some((m) => m.slug === selected))
      throw fail("model_not_found", "Select an eligible discovered model.");
  }
  return {
    async status() {
      await load();
      return {
        generationDeadlineMs,
        maximumGenerationDeadlineMs: MAX_GENERATION_DEADLINE_MS,
        strictPlanOnly: true,
        paidFallback: false,
        enabled,
        confirmed,
        userConfirmationNotTelemetry: true,
        usageAvailability: "unknown; not account billing telemetry",
        auth,
        models,
        selectedModel: selected,
        active: !!active,
        connecting: authBusy,
        dailyLimit: limit,
        requestsToday: used(),
        resetBasis: "UTC calendar day",
        stopped: stopped?.day === day() ? stopped : null,
        usageURL: USAGE_URL,
        history: history.slice(-100),
      };
    },
    async signIn({ directUseAuthorized = false } = {}) {
      await load();
      if (!directUseAuthorized)
        throw fail(
          "confirmation_required",
          "Explicit plan authorization required.",
        );
      if (authBusy || active) throw fail("busy", "Job or sign-in active.");
      authBusy = true;
      clear();
      try {
        const c = await client(),
          s = await c.signIn({ reconsent: true });
        auth = { status: s.status, sharing: s.sharing === true };
        await record("success", null, "sign-in");
        return auth;
      } catch (e) {
        auth = { status: "disconnected", sharing: false };
        await record("failed", safePlanError(e).code, "sign-in");
        throw e;
      } finally {
        authBusy = false;
      }
    },
    async discover() {
      if (active || authBusy) throw fail("busy", "Wait for current job.");
      await fresh();
      try {
        models = (await sdk.listModels())
          .slice(0, 200)
          .filter(
            (m) =>
              typeof m.slug === "string" && typeof m.displayName === "string",
          );
        if (!models.length)
          throw fail("model_not_found", "No eligible models.");
        await record("success", null, "models");
        return models;
      } catch (e) {
        clear();
        await record("failed", safePlanError(e).code, "models");
        throw e;
      }
    },
    async configure(p) {
      await load();
      if (active || authBusy) throw fail("busy", "Job active.");
      if (!p.enabled) {
        clear();
        return;
      }
      if (
        p.accountSettingsConfirmed !== true ||
        p.directUseAuthorized !== true ||
        p.creditsSettingReviewed !== true ||
        !Number.isInteger(p.weeklyLimitPercent) ||
        p.weeklyLimitPercent < 1 ||
        p.weeklyLimitPercent >= 100
      )
        throw fail("confirmation_required", "Account confirmation missing.");
      if (
        !Number.isInteger(p.dailyLimit) ||
        p.dailyLimit < 1 ||
        p.dailyLimit > 10
      )
        throw fail("invalid_request", "Daily limit must be 1–10.");
      const s = await fresh();
      if (!models.some((m) => m.slug === p.model))
        throw fail("model_not_found", "Model not discovered.");
      limit = p.dailyLimit;
      selected = p.model;
      profile = s.profileId;
      confirmed = true;
      authorized = true;
      enabled = true;
      await save();
    },
    cancel() {
      active?.abort(
        fail(
          "cancelled",
          "User cancellation, disconnect or closed app connection.",
        ),
      );
      sdk?.cancelSignIn();
    },
    async disconnect() {
      active?.abort(
        fail(
          "cancelled",
          "User cancellation, disconnect or closed app connection.",
        ),
      );
      sdk?.cancelSignIn();
      clear();
      auth = { status: "disconnected", sharing: false };
      if (sdk) await sdk.disconnect();
    },
    async run({ prompt, validate, maxRepairs = 2 }) {
      if (!Number.isInteger(maxRepairs) || maxRepairs < 0 || maxRepairs > 2)
        throw fail("invalid_request", "Repair bound must be 0–2.");
      if (active || authBusy) throw fail("busy", "Only one active AI job.");
      if (typeof prompt !== "string" || Buffer.byteLength(prompt) > 64000)
        throw fail("invalid_request", "Input exceeds 64 KB.");
      const controller = new AbortController();
      active = controller;
      let captured = "",
        receivedCharacters = 0,
        attempts = 0,
        terminalCode = null;
      const evidence = () => ({
        response: {
          textReceived: receivedCharacters > 0,
          charactersReceived: receivedCharacters,
          charactersCaptured: captured.length,
          deadlineMs: generationDeadlineMs,
          scope:
            "Output text only; no text does not imply no reasoning, provider activity or allowance consumption.",
        },
        ...(captured
          ? {
              draft: {
                text: captured,
                unvalidated: true,
                mayBeIncomplete: true,
              },
            }
          : {}),
      });
      const failure = (code, issues = [safePlanError({ code }).message]) => ({
        valid: false,
        code,
        issues,
        iterations: attempts,
        advisory: true,
        ...evidence(),
      });
      try {
        await gate();
        let input = prompt,
          lastIssues = [];
        for (let iteration = 0; iteration <= maxRepairs; iteration++) {
          controller.signal.throwIfAborted();
          await gate();
          controller.signal.throwIfAborted();
          if (Buffer.byteLength(input) > 64000)
            throw fail("invalid_request", "Repair context exceeds 64 KB.");
          await record("started", null);
          attempts++;
          captured = "";
          receivedCharacters = 0;
          const stopDeadline = deadlineScheduler(generationDeadlineMs, () =>
            controller.abort(
              fail("timed_out", "Automatic generation deadline expired."),
            ),
          );
          let output;
          try {
            const response = await sdk.streamResponse({
              model: selected,
              input,
              instructions:
                "Return only the requested JSON. Card names, prices and rules are locally verified. Advisory only. Never request purchases, credentials or external tools.",
              signal: controller.signal,
              onDelta(delta) {
                if (typeof delta !== "string")
                  throw fail("invalid_stream", "Unexpected text delta.");
                receivedCharacters += delta.length;
                captured = (captured + delta).slice(0, MAX_RESPONSE_CHARACTERS);
                if (receivedCharacters > MAX_RESPONSE_CHARACTERS)
                  controller.abort(
                    fail("response_too_large", "Output exceeds local bound."),
                  );
              },
            });
            stopDeadline(); // Network generation completed; local bookkeeping is not inference.
            controller.signal.throwIfAborted();
            output = response?.text;
            if (typeof output === "string") {
              receivedCharacters = Math.max(receivedCharacters, output.length);
              // Never discard a useful streamed prefix because a completion is empty.
              if (output.length)
                captured = output.slice(0, MAX_RESPONSE_CHARACTERS);
            }
            if (typeof output !== "string" || !output.trim())
              throw fail("empty_response", "No usable completed text.");
            if (output.length > MAX_RESPONSE_CHARACTERS)
              throw fail("response_too_large", "Output exceeds local bound.");
            await record("completed", null, "inference", evidence().response);
          } catch (e) {
            const upstream = safePlanError(e).code;
            const providerTerminal =
              /^(subscription_sharing_|chatpass_|token_|invalid_token|invalid_grant|sign_in_required|model_not_found|sharing_not_enabled)/.test(
                upstream,
              );
            const code = providerTerminal
              ? upstream
              : controller.signal.aborted
                ? controller.signal.reason?.code || "cancelled"
                : e?.code === "cancelled"
                  ? "stream_interrupted"
                  : safePlanError(e).code;
            terminalCode = code;
            // Local stops are recoverable only through another explicit user click.
            // Provider/session/quota failures retain the existing daily stop latch.
            if (
              ![
                "cancelled",
                "timed_out",
                "empty_response",
                "response_too_large",
              ].includes(code)
            ) {
              stopped = { day: day(), code };
              enabled = false;
            }
            await record("failed", code, "inference", evidence().response);
            throw fail(code, safePlanError({ code }).message);
          } finally {
            stopDeadline();
          }
          controller.signal.throwIfAborted();
          const result = await validate(output);
          controller.signal.throwIfAborted();
          if (result?.valid === true)
            return {
              ...result,
              iterations: iteration + 1,
              advisory: true,
              response: evidence().response,
            };
          lastIssues =
            Array.isArray(result?.issues) && result.issues.length
              ? result.issues
              : ["Local validation failed."];
          await record(
            "failed",
            "validation_failed",
            "validation",
            evidence().response,
          );
          if (iteration === maxRepairs)
            return failure("validation_failed", lastIssues);
          input =
            prompt +
            "\nLOCAL VALIDATION ERRORS: " +
            JSON.stringify(lastIssues).slice(0, 6000) +
            "\nPREVIOUS OUTPUT: " +
            output.slice(0, 16000) +
            "\nReturn corrected full JSON; do not patch or fabricate prices.";
        }
      } catch (e) {
        const code =
          terminalCode ||
          (controller.signal.aborted
            ? controller.signal.reason?.code || "cancelled"
            : safePlanError(e).code);
        await record(
          "blocked",
          code,
          "job",
          attempts ? evidence().response : null,
        );
        const error = fail(code, safePlanError({ code }).message);
        if (attempts) error.generation = failure(code);
        throw error;
      } finally {
        active = null;
      }
    },
  };
}
