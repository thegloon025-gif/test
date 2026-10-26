# Architect generation deadlines and draft recovery (unreleased 1.1.5)

This continuation is stacked on draft PR #14. It does not change the official
SDK, authentication, plan/app/account confirmations, model selection, daily
request accounting, budget/legality/bracket checks or version number. No live
inference is required for development tests.

## Deadline and stop reasons

The user-observed Windows request started at `01:38:19.840Z` and stopped at
`01:39:49.842Z`: **90,002 ms**. PR #14 passed a 90,000 ms timeout signal to the
pinned SDK. That SDK reports an aborted caller signal as `cancelled`, losing the
reason at the application boundary. These are user observations, not a live
reproduction by this task.

The app now uses **165,000 ms per generation attempt**, with a finite configuration
cap of **170,000 ms**. These are below the pinned official SDK's existing
180,000 ms body/request deadline in
[`responses.ts`](https://github.com/openai/sign-in-with-chatgpt-devkit/blob/0a36fefeb913055c8c7a1a29b63d82b96b2e841a/packages/local/src/responses.ts#L37).
The SDK and its zero-retry, plan-backed OAuth route are untouched. The app timer
starts immediately before calling the SDK (including any SDK credential setup)
and is cleared when the generation settles, before local validation/bookkeeping.
It is not a guarantee that a full response will complete within 165 seconds.

The controller preserves its own abort reason even when the SDK maps it to
`cancelled`:

- `timed_out`: automatic generation deadline expired.
- `cancelled`: Cancel, explicit disconnect or a closed HTTP app connection.
- `empty_response`: completion returned no usable text; streamed text, if any,
  is retained only as an unvalidated draft.
- `response_too_large`: the existing 32,000-character local bound was exceeded;
  this is not labeled user cancellation.
- `validation_failed`: response text arrived but failed complete local checks.

Unexplained SDK cancellation without an app abort is a stream interruption,
not a fabricated user action or local timeout. Explicit quota/eligibility/session
errors retain their stop latch even if a local deadline fires concurrently.
Historical `cancelled` log entries are not rewritten or guessed retrospectively.

A Builder click makes **one** request, including invalid/empty/timed-out results.
No timeout/empty/transport failure is automatically retried, including in the
Upgrader. Its existing at-most-two repairs still apply only to completed text
that fails local validation. No provider/model/key fallback is added. Another
user click must pass the same authorization, confirmations, eligible model,
account/local caps and quota/session guards. A started request remains counted
when it times out or returns no text.

## Text receipts and optional recovery

A completed or failed inference reports whether output text was observed, the
received/captured character counts and the app deadline. These refer to SDK
**output text deltas/completed text**, not reasoning events, raw network bytes,
tokens or billing. No text does not prove that the provider did no work or used
no allowance.

Usage history stores these nonsecret counts and the stop code, never response
text, prompts or credentials. Up to 32,000 characters of captured response text
can be returned to the requesting page as `draft.unvalidated: true`. This is
memory/response-only recovery; drafts are not written into caches or usage logs.
A closed browser connection cannot receive that response, and reloading the page
can lose an uncopied partial draft.

The UI displays captured text separately in **Unvalidated response text —
inspection only**. It never replaces a useful editable result on failure, never
serializes a missing deck/packages field into `{}`, and cannot enable export.
Earlier captured text remains labeled if a subsequent request returns nothing.
Only a correctly shaped, locally valid complete result replaces the editor.

Use **Copy unvalidated response** to inspect/copy it. If desired, paste it into
the result editor and explicitly choose **Import ChatGPT result**. There is no
partial-export path. The exact 100-card, commander/color, singleton, bracket,
selected-printing and budget checks must all pass before the normal revalidated
export becomes available. Incomplete JSON/card lists are not automatically
completed or patched. A manual import/copy is not an AI call.

## Smaller prompts without replacing strategy evidence

`architectPrompt.mjs` moves repeated exact Oracle text and shared prerequisite
boilerplate into clearly documented `oracleEvidence`/`sharedRequirements`
dictionaries. References are resolved explicitly by the brief; costs and guards
are not summarized away. Repeated original basic lands use exact quantities,
and an original Oracle excerpt may refer to an already supplied fuller matching
clause. Original card prices, casting costs, physical count and protected names
remain explicit.

Builder targets 32 KB and retains all selected engine packages and the same
four critical combo packages preserved by PR #14, with full recorded
prerequisites/policy. Only optional record/source/extra combo examples are
trimmed toward this target; the hard verified-prompt cap stays 46 KB and the
controller input cap stays 64 KB. All priced function options remain.

The Upgrader must also carry the complete original. It retains its prior 46 KB
bound and optional-discovery trimming when needed, prioritizing original card
facts, protected identities, locks and committed-combo requirements. It does not
claim every newly discovered hypothetical package can fit. No card whitelist,
quality score, spending bonus or generator/ranking change is introduced.

## Verification and Windows checks

```sh
node --test tests/chatgpt-plan-only.test.mjs tests/ai-architect.test.mjs tests/architect-quality.test.mjs tests/architect-result.test.mjs tests/architect-prompt.test.mjs
npm test
node tools/audit-architect-prompt.mjs CATALOG COMMUNITY LIBRARY NEW_REPORT
```

The deadline regressions inject a deterministic timer and mocked SDK that maps
caller abort to `cancelled`; they do not wait 165 seconds or invoke a live model.
The browser recovery script mocks auth/configuration/generation transport while
using the real renderer and local import gate. The separate existing manual
workflow smoke uses real local APIs. Neither validates live model latency or
provider billing.

On Windows, close the old app process, switch to this branch while keeping the
existing `data` folder, and run the unchanged `start-windows.bat`. The local
`/api/architect/status` should report `generationDeadlineMs: 165000` and
`maximumGenerationDeadlineMs: 170000`. Existing connection/account settings
remain; do not delete the SDK or credentials to test this fix.

When you choose to spend an authorized request, inspect the pending 165-second
message, result/error receipt and local history. Cancel should log `cancelled`;
automatic expiry should log `timed_out`. Inspect any captured unvalidated text
before deciding on a further explicit request. Native Windows generation and
completion within the new deadline still require user verification; no live
inference was performed during this development task.
