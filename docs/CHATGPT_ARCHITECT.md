# Optional ChatGPT AI Architect — strict plan-only experiment, 1.1.5

The deterministic builder, manual Upgrader and research integrations remain independent. Nothing signs in, invokes inference or installs an SDK on startup. No API-key setting, separately billed inference route, credit purchase, paid-provider fallback or policy-off switch exists. Do not describe this as unlimited free AI or an independently verified no-charge guarantee.

## Official source and optional installation

The supplied developer/help pages were blocked by this environment's proxy (HTTP 403). The integration instead uses OpenAI's **official** [Sign in with ChatGPT DevKit](https://github.com/openai/sign-in-with-chatgpt-devkit) at pinned revision `0a36fefeb913055c8c7a1a29b63d82b96b2e841a`. Its source, security documentation, public types and 57 mocked regression tests were inspected/run. It provides dynamic registration, PKCE, OIDC nonce/state/signature/issuer/audience/subject verification, IPv4 loopback callback, stable persisted host identity, encrypted credential storage/rotation, model discovery and Responses streaming. The optional host-ID authorization extension stays at the SDK's default `false`; the SDK persists host identity regardless. No unofficial ChatGPT endpoint, cookie or reverse-engineered Codex session is used.

Optional connected setup, from the repository root:

```
node tools/install-chatgpt-devkit.mjs
```

Requires Git, npm and Node **22.12+** for the official SDK (ordinary local app remains Node 22+). The explicit installer checks out the immutable official revision under ignored `data/chatgpt-devkit`, uses its lockfile to install **only** the local SDK workspace/root build tools with dependency install scripts disabled, then runs its reviewed build. It preserves the official license/notices and records source/dist hashes. It never authorizes an account or invokes AI. Existing installation directories are refused, never overwritten or deleted. A failed partial install is preserved for inspection; do not delete user caches to repair it.

The DevKit is under OpenAI's **Noncommercial License v1.0**, not a permissive commercial SDK license. This experiment uses it for personal/noncommercial local development. Read the [pinned license](https://github.com/openai/sign-in-with-chatgpt-devkit/blob/0a36fefeb913055c8c7a1a29b63d82b96b2e841a/LICENSE) before installation; commercial use requires separate rights. This repository calls the SDK interface and does not redistribute a modified SDK or its dependencies. There is no mandatory new package dependency for the local/manual app.

Restart with `start-windows.bat` or `npm start`, then expand **Experimental ChatGPT AI Architect**. The runtime verifies the installed manifest before importing the official SDK. No alternate SDK path/provider is accepted from the browser or environment.

## Authentication and secure storage

Connected authentication currently requires **Windows DPAPI CurrentUser**, provided via bounded noninteractive PowerShell subprocesses. Credentials travel only over private stdin/stdout pipes; never command-line arguments, renderer state, logs or plaintext files. The official SDK stores the complete credential/registration state encrypted with this provider under `data/chatgpt-credentials`, with atomic locking/rotation. Its separate host-ID file is non-secret. There is no plaintext, hardcoded-key or unencrypted fallback.

On Linux/macOS, or if DPAPI is unavailable, connected features fail closed **before OAuth**. Manual copy/import remains usable. A native macOS/Linux secret-store provider is not implemented. Native Windows DPAPI, browser sign-in, remote revocation and live plan inference are **unverified in this Linux environment**. The installed SDK/build and upstream synthetic tests do not establish live account entitlement or zero billing.

Click **Sign in with ChatGPT** only after checking the explicit included-plan authorization checkbox. OAuth runs in the backend and opens the official system-browser consent flow with an ephemeral loopback callback. The SDK verifies returned identity before use. `sharing: true` in the pinned SDK means verified credentials plus the actual `chatgpt.tokens.use.direct` grant; a checkbox or API key cannot supply that grant. Explicit **Discover eligible models** uses the account's supported model catalog; no assumed model slug or fallback model is used.

Disconnect removes the local SDK profile credentials and attempts official revocation. If revocation cannot be confirmed, the SDK reports it; remove the app in ChatGPT Settings as needed. Cancellation aborts a pending sign-in or current model stream. The non-secret runtime host/registration metadata is retained by the SDK as documented.

## Required account-setting preflight

After registration and before enabling inference:

1. Open [ChatGPT Settings → Usage](https://chatgpt.com/settings/usage).
2. Disable **Allow apps to use credits**, if available.
3. Locate CommanderOracle in **App limits**, set a weekly app limit **below 100%**, preferably **25%**.
4. Save and verify those settings.
5. Confirm them in the local app, enter the below-100% percentage, choose a discovered eligible model and explicitly enable plan-only AI.

This implements the supplied safety requirement concerning below-100% limits. The application **cannot read or change account credit switches, app limits, usage remaining or actual billing**. Confirmation is a user statement, not verified telemetry. If the setting is unavailable or cannot be confirmed, do not enable connected AI: use the manual bridge. The help page's billing semantics could not be independently re-fetched here. Actual provider billing, especially if account settings differ from the user's confirmation, cannot be guaranteed by local tests.

Do not claim a Plus subscription alone establishes app eligibility or unlimited allowance. The SDK's explicit OAuth credential, base URL, tenant-null headers and `maxRetries: 0` ignore environment API-key/project/custom-auth settings rather than inheriting an API-key billing path. The official plan route is `https://api.openai.com/v1/responses`; the **authorization provenance**, not a different URL, distinguishes it from separately billed Platform API-key use. No application path constructs a Platform API client.

## Mandatory local controls

AI is disabled until sign-in, verified direct permission, explicit financial preflight, eligible model discovery and enablement. Confirmation is session-local and must be repeated after restart/account changes. These controls cannot be turned off by configuration:

- One active job; one explicit click per builder/upgrader task.
- Initial call plus **at most two** locally validated repairs, never transport/quota retries.
- Configurable daily inference-attempt maximum **1–10**, default **3**, UTC calendar day. Repairs count. A separate persistent counter cannot be reset by trimming history, disconnecting or reauthorizing.
- Bounded verified prompt (46 KB) and request/repair context (64 KB), output 32,000 characters, 90-second application deadline; cancel aborts the request. The pinned SDK does **not expose a server-side max-output-token option**, so character/time bounds are not exact token/reasoning-consumption caps and cannot replace account limits. In-flight generation may precede local cancellation.
- Financial, model, authorization and network errors stop the job, disable inference and retain a same-UTC-day stop latch. No automatic retry, re-login, model/provider switch or credit action. After a later day/reset, explicit confirmation/enablement is still required; no remaining allowance is asserted.
- Up to 500 local activity records with timestamps, operation/state/code; no prompts, cardlists, credentials, account identity or responses. `data/chatgpt-architect/usage.json` is a non-secret atomic local guard ledger. A corrupted/unreadable ledger blocks connected jobs rather than resetting limits. Manual routes remain independent.

On `subscription_sharing_usage_limit_exceeded`, the app says:

> ChatGPT usage limit reached. AI deckbuilding has stopped. No paid API fallback was attempted. You can continue using CommanderOracle's local features or try again after your usage resets.

`subscription_sharing_user_not_eligible`, `subscription_sharing_usage_unavailable`, missing direct permission, unsupported model/route, and session failures likewise stop. No free-allowance estimate is invented. The SDK may perform its documented bounded credential refresh/verification; it does not switch billing paths or retry quota responses.

Architect HTTP actions require the actual local Host/Origin and a random per-launch same-origin request token. No CORS access is enabled. OAuth access/refresh/identity tokens never enter renderer responses; the request token is only an anti-CSRF capability, not an OAuth credential. This does not protect against malicious software already running as the same OS user or modifying trusted app/dependency code.

## Builder and Upgrader

**Builder:** requested output includes an advisory strategy direction, native engines, mana plan, win-conversion prerequisites and unknowns alongside the complete list. Those explanations are bounded model advice, not execution evidence or a power score. Choose commander, bracket, total EUR budget, optional €4 leeway and basic-land ownership using the existing controls. Add advisory preferences/excluded strategies, then explicitly build. Local verification reparses the complete 100-card text against the current priced catalog, rejects unresolved identities/duplicates/color/known bracket violations, reconciles exact selected printings and the full total cap, and honors unowned-basic pricing. It checks a conservative supported-source payment path for the commander and, for the recognized Eldrazi-copy trigger, a jointly payable qualifying follow-up plus separate CC. This is an inventory upper bound, not turn timing or full game execution. Unknown source/engine mechanics are not counted as successes. Arbitrary strategy exclusions and full win conversion are not mechanically certified.

**Upgrader:** first import/validate your original in the existing Experimental Upgrader and set its purchase budget/ownership/locks. Choose AI task Upgrader, then explicitly analyze. The model returns only 1–3 atomic packages of 1–3 exact-name cuts/additions. Model prices/card objects do not become trusted data. Local checks apply every proposed package together, preserving original native functions/known combo commitments/mana and full new-card acquisition accounting. Invalid suggestions can receive up to two bounded corrections, without generic random engine cuts.

The preview does **not** accept changes. Click **Review packages in Experimental Upgrader**, inspect each tradeoff and accept/reject normally. Its existing combined gates, undo and export remain authoritative. No original text, external deck or account is overwritten. Advice is not proof of strength.

The bounded context includes original cards and an incomplete alphabetical candidate sample with selected local prices and Oracle text clipped to 400 characters. This is not a power ranking or a complete catalog/research dump. Final validation uses full records. A model can still propose mechanically weak decks; local legality/payment checks do not prove coherent strategy or better gameplay. No PR #4 ranking or paid research loop is activated.

## Manual bridge (no CommanderOracle AI request)

- **Copy AI deckbuilding request** / **Copy AI upgrade request** creates a structured local prompt, optionally copies it to the clipboard, and displays it for manual copying.
- Paste it into your own ChatGPT conversation, subject to that service's plan limits.
- Paste JSON or a supported plain deck result into **Import ChatGPT result**.
- The same `validateArchitectResult` path is used by manual and connected output. Invalid/budget-broken results cannot enable export; no API charge is initiated by this bridge.
- Builder download revalidates against the current catalog/settings before creating the TXT. Upgrader packages always go through separate user approval, combined checks and undo.

## Reproduction and evidence

```
node --test tests/chatgpt-plan-only.test.mjs tests/ai-architect.test.mjs
npm test
node tools/validate-architect-workflows.mjs http://127.0.0.1:4285 NEW_OUTPUT_DIRECTORY
```

Use a disposable app/catalog/library copy for smoke runs; root app startup retains the previous local cache-repair behavior. The workflow script validates public archived Ulalek/Wilhelt/Y'shtola/Yuriko/Zada lists as **scripted manual fixtures**, not new AI-generated decks. Native encryption/live sign-in is not performed by it.

Optional developer browser smoke uses locally installed Playwright/Chromium, never mandatory for app operation:

```
node tools/smoke-architect-browser.mjs http://127.0.0.1:4285 FIXTURE_OUTPUT_DIRECTORY NEW_BROWSER_REPORT.json
```

Set `PLAYWRIGHT_MODULE`/`CHROMIUM_PATH` to local installations if required. See `benchmarks/chatgpt-architect-VALIDATION.md` for actual results, route evidence, original-data preservation, known limitations and the distinction between mocked safety checks and live billing verification. Keep all PRs draft/unmerged and version 1.1.5.
