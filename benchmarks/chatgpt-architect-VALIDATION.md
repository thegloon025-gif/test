# ChatGPT Architect — strict plan-only experiment (unreleased 1.1.5)

Branch `codex/chatgpt-plan-only-architect` is stacked on PR #12, base `406f8ae`. Implementation `bb73b6f`, security/readability hardening `d8e8ccc`, bounded protected-card/combo prompt context `c571be9`. Source and generated evidence are separate commits. No prior PR is merged, released or modified.

## Delivery and live-verification boundary

**Implemented:** optional official local SDK connection, Windows OS-backed credential adapter, permanent no-API-key/no-paid-fallback policy, explicit account-settings confirmation, eligible-model discovery, bounded advisory Builder/Upgrader jobs, cancellation/disconnect, local usage controls, and a fully working manual copy/import/approval/export bridge.

**Not verified live:** native Windows DPAPI, an actual user's OAuth authorization, current account/workspace eligibility, direct model inference, provider credit settings, actual remaining allowance or billing. Connected AI is disabled by default. On this Linux host secure storage is unavailable, so connection fails **before OAuth** and the manual workflow remains functional. Do not describe this as a verified zero-charge guarantee or claim GPT generated the example lists.

The application has no Platform API-key inference route, key-input setting, paid-provider switch, credit purchase or automatic credit opt-in. Its only inference delegate is OpenAI's pinned official plan SDK. This proves an application design property, not the provider's actual future funding/billing behavior under incorrectly confirmed account settings.

## Official integration evidence

The four supplied developer/help URLs could not be fetched: the execution proxy rejected the HTTPS tunnels with 403. An official source was found instead: [OpenAI Sign in with ChatGPT DevKit](https://github.com/openai/sign-in-with-chatgpt-devkit), revision **`0a36fefeb913055c8c7a1a29b63d82b96b2e841a`**. README, security guidance, OAuth/model/Responses/storage implementations, exported types and upstream tests were reviewed.

The SDK implements PKCE, nonce/state, signed ID-token issuer/audience/subject verification, verified refresh/rotation, stable persisted host identity and supported dynamic registration through an IPv4 loopback callback. The host-ID authorization extension remains at the official example/default `false`; SDK host identity still persists. No unofficial endpoint or session-cookie extraction is used.

The optional installer successfully cloned the immutable revision, installed **14 packages** for the local SDK/build workspace with dependency install scripts disabled, built it and verified the resulting manifest in a disposable directory, including a clean directory without an existing data parent. Import exposed the expected `createChatGPT` and official Usage URL. Existing install directories are refused rather than overwritten. Normal app startup performs no installation.

The SDK is private/local workspace software under OpenAI's **Noncommercial License v1.0**; it is not silently relicensed as commercial/permissive code. This repository implements an independent interface adapter and does not vendor modified SDK code. License and service eligibility are distinct. See [setup/license details](../docs/CHATGPT_ARCHITECT.md).

The SDK's normal direct Responses route is `api.openai.com/v1/responses`, also used by Platform clients. **Credential provenance and authorization distinguish plan usage, not a different URL.** The pinned source explicitly supplies the OAuth access token, null organization/project, protected auth headers, `maxRetries: 0`, `store: false`, `stream: true` and redirect rejection. Upstream mocked tests verify API-key environment/custom-header isolation. No application code constructs an alternative API-key client.

## Financial and session controls

Before enabling inference, the user must explicitly authorize included-plan access, sign in with the actual direct grant, discover an eligible model, review credits and confirm a saved weekly app limit **1–99%**, preferably **25%**, in ChatGPT Settings → Usage. The app does not read or modify those account controls. The checkbox and percentage are **user confirmation, not verified telemetry**. Usage remaining is always unknown locally. If settings cannot be confirmed or grant/model/route is unavailable, use the manual bridge.

Local safeguards are independent of provider billing controls: off by default; one active job; an explicit task click; default three, configurable 1–10 inference attempts per UTC day; at most two local-validation repairs (three calls total); persistent counter separate from bounded history; 46 KB prompt/64 KB repair-input bounds; 32,000 output characters and a 90-second application deadline; cancellation; no inference on startup/form change/import/view. The current SDK exposes no server-side max-output-token option, so these are **not exact token or reasoning-consumption caps** and cannot replace the account app limit.

Quota, eligibility, usage-unavailable, scope, unsupported model/route, session and transport failures stop. No quota/transport retry, model substitution, provider substitution or repeated automatic sign-in is performed. A same-UTC-day stop latch and persisted attempt count survive disconnect/restart; later recovery still requires explicit user action. Official SDK bounded credential refresh/verification is retained, without changing billing path.

Windows DPAPI CurrentUser encryption is mandatory for connected credentials. There is no plaintext/key-in-a-file fallback. Secrets travel through private process pipes, never browser JSON/logs/command arguments. The SDK's encrypted credential/profile/registration state is isolated under a new data directory; host metadata is non-secret. Other OS providers are not implemented. Disconnect clears local credentials and attempts revocation; unconfirmed remote revocation is reported explicitly.

New Architect actions require local Host/Origin checks and a random per-launch same-origin request token. Cross-origin/invalid-token attempts are rejected. This does not defend against malicious code already running as the same OS user or modifying trusted runtime dependencies.

## Test evidence — distinct categories

| Category | Actual result | What it establishes |
| --- | --- | --- |
| Full application suite | **326/326**, zero failures/skips/cancellations, **117.600 s** | Existing regression foundation plus new guard/manual-verification cases |
| Focused new tests | **25/25** (included in full count), **369.884 ms** | Mocked plan/session/error/cancellation/repair controls and pure local card validation |
| Pinned upstream SDK tests | **57/57**, mocked/synthetic, **422.345 ms** | SDK identity, encrypted-store, refresh and streaming behavior under test fixtures |
| Independent export audit | **500/500 slots**, five complete decks | Text identity, canonical singleton/color, known GC metadata, exact printing cents and €191 fixture cap |
| Actual local HTTP/browser | Passed, zero page errors | Manual requests/imports, revalidated download, separate upgrade approval and undo |
| Guarded runtime egress | **0 recorded outbound fetch attempts** | Blocked-auth/manual workflows made no remote inference request in this experiment |
| Live account/plan/billing | **Unverified** | No account was authorized; no real inference or no-charge proof is claimed |

Focused cases include normal **mocked** authorization, missing direct permission, eligible-model restriction, the three specified subscription-sharing errors, route/scope rejection, expired/disconnected/switched sessions, network errors, repeated attempts, stream cancellation, persistent daily counting, two-repair cap, unreadable usage state, bounded inputs, missing confirmation, 100% weekly-limit rejection and unexpected synthetic API-key environment presence. Model text/card objects/prices are untrusted; malformed/unknown/overbudget results reject without editing the original.

The official upstream tests additionally verify signed identity/nonce failures, pending rotation/JWKS recovery, encrypted state preservation, unavailable-encryption rejection before OAuth, stable host identity, explicit OAuth headers and direct Responses flags. Those tests use synthetic credentials/keys and mocked endpoints. They are not real Windows storage or account tests.

App tests demonstrate there is no alternate inference delegate to call after failure. They cannot prove actual provider billing is zero after a future eligible user connects. In particular, incorrect account-setting confirmation is outside the app's telemetry. No remaining-free-allowance or unlimited-free claim is made.

## Manual complete-deck fixtures and local approval

These **already archived decks** were supplied as scripted manual JSON/text results to exercise the same validator used for connected output. They were **not generated by ChatGPT in this task**. All use frozen Scryfall EUR selected-record estimates, existing owned-basic convention, B3 and a €191 total ceiling.

| Fixture | Selected-record value | Complete export |
| --- | ---: | --- |
| Ulalek | €174.24 | [100 cards](chatgpt-architect/ulalek-validated-manual-fixture.txt) |
| Wilhelt | €163.25 | [100 cards](chatgpt-architect/wilhelt-validated-manual-fixture.txt) |
| Y'shtola | €90.68 | [100 cards](chatgpt-architect/yshtola-validated-manual-fixture.txt) |
| Yuriko | €126.04 | [100 cards](chatgpt-architect/yuriko-validated-manual-fixture.txt) |
| Zada | €152.66 | [100 cards](chatgpt-architect/zada-validated-manual-fixture.txt) |

All five passed exact count, canonical identity, commander/color, known local policy and pricing audits. Builder checks a conservative supported-source commander payment path; the recognized Eldrazi-copy trigger additionally needs an inventory-supported qualifying cast plus separate CC. Sources fund their admission without self-created mana; allocations spend a source once per transaction. This is an **inventory upper bound**, not a turn-by-turn demonstration, card-access result or win certification. Unknown sources/mechanics never become successful execution evidence.

Scripted manual upgrade recommendations were separately validated together:

- Ulalek: Solar Transformer → Liquimetal Torque, €1.73 full new-card acquisition; retained C versus lost energy fixing remains a tradeoff.
- Wilhelt: Village Rites → Vampiric Rites, €0.11 acquisition; burst access versus mana/material-paid persistent sacrifice access.
- Y'shtola: Cast Away Doubt → Greed, €0.20 acquisition; immediate draw/table damage versus life-paid persistent access.

These are the existing PR #12 illustrated tradeoffs, not fresh GPT advice or stronger-deck results. They were not automatically accepted. The real browser transferred the Wilhelt JSON into the existing Upgrader, required a separate package approval, produced a 100-card export and restored the original on undo. Complete original/proposed examples remain in [PR #12's validation](experimental-upgrader-VALIDATION.md).

The browser also copied both request types (including protected-card and cached prerequisite context), imported a builder result and revalidated its download. Tests use real local APIs/catalog/library rather than mocked upgrade responses. The app's displayed inference counter stayed zero, while the test server's outgoing-fetch guard recorded no attempts. Synthetic API-key environment content did not appear in responses or inference authorization.

## Preservation and limits

- Version **1.1.5**, Windows launcher, deterministic generator/selector, original Upgrader hard gates, pricing/research/legacy fallback and all earlier benchmark archives remain unchanged. No PR #4 stateful ranking, Pod activation, official-policy refresh or external evaluator claim.
- Immutable catalog/library hashes match prior frozen inputs. SDK installation and server tests ran in disposable directories, not against the working checkout's cache. No original catalog/research data was overwritten. New guard/credential directories are separate and ignored by Git.
- Models are discovered, not hardcoded. The bounded context includes clipped Oracle text, incomplete alphabetical candidates, user locks/ownership and selected known inventory-complete cached combo prerequisites. These are not all possible plans or proof of execution. Excluded strategies/preferences are advisory; arbitrary natural-language intent is not mechanically certified.
- Builder and Upgrader outputs share manual/connected local validation. Unknown native combat/ninjutsu/death/copy/resource mechanics remain unknown. Legal/priced output is not proof of strategy quality. No score, forced spending, reference memorization or random cheap engine repair is introduced.
- Native Windows OAuth/DPAPI and actual eligible plan routing remain the smallest live-verification gate. If unavailable, the only supported alternative is manual copy/import, **not** a different way to charge the user.

## Reproduction and next step

Follow [the setup/preflight/local workflow](../docs/CHATGPT_ARCHITECT.md). Optional SDK install requires Git/npm and Node 22.12+, with the official noncommercial license. Connected AI starts disabled; set actual account credit/app limits before confirming anything. If the below-100% setting or eligibility cannot be established, leave it disabled.

The [compact evidence directory](chatgpt-architect/README.md) contains complete fixtures, lossless selected-printing/upgrade receipts, hashes and test summaries. A user-run Windows smoke should separately verify encrypted persistence/restart, official consent/grant/model discovery, cancellation, disconnect/revocation and actual account usage under a small included-plan allowance. No account credentials should be pasted into issues or this chat. Inspect provider account usage directly; do not interpret mocked route tests as billing telemetry.

Keep the new PR draft and all parent PRs unmerged. No release or version bump.
