# Architect timeout and draft recovery — 2026-10-26

Version **1.1.5**, stacked on draft PR #14 at
`6fe466d6b9d857fb1fb43eec8481d5e2d3061a40`. No merge or release.
Implementation is separate from this compact evidence commit.

## Reported failure and bounded fix

User-observed Windows inference started at **01:38:19.840Z**, failed at
**01:39:49.842Z** (90,002 ms), and was labeled `cancelled`. PR #14 passed a
90,000 ms application timeout to the official SDK, whose caller-abort mapping
reports `cancelled`. This explains the match; no live inference was performed
to reproduce it. Whether that historical request emitted text is **unknown**:
the prior failure path discarded captured text and exposed no text receipt.

The app now preserves a separate controller abort reason and defaults to
**165 seconds**, with a finite **170-second configuration cap** below the
unchanged pinned SDK **180-second request/body bound**. It clears the timer when
generation settles, before local bookkeeping/validation. `timed_out` is automatic
expiry; `cancelled` covers Cancel/disconnect/closed app connection. SDK cancellation
without an app abort is a stream interruption. Output-limit stops have their own
code. Explicit quota failures still stop the account path even in a deadline race.

There is no automatic timeout/empty/transport retry, no model/provider fallback,
and no paid/key route. Builder remains **one explicit request per click**.
Upgrader retains only its existing bounded repairs for completed invalid text.
Started requests stay counted, even without visible output. Existing scope,
account confirmations, app/local limits, session/model and quota guards remain.

## Response handling

Every attempted inference failure exposes output-text presence/counts and the
configured deadline. History stores these nonsecret receipt fields, not prompts,
partial text or credentials. Up to 32,000 captured characters can be returned as
an explicitly unvalidated draft. No text does not prove no reasoning or allowance
consumption. These are character counts, not tokens or billing telemetry.

Failed output never serializes missing deck/packages into `{}` or overwrites a
useful editor draft. Captured response text is separate, readonly, explicitly
unvalidated and copyable for inspection. Previous captured text remains labeled
when another request yields nothing. No failed/partial result enables download
or Upgrader acceptance. Manual import must pass the **same complete local
100-card/legality/printing/budget/bracket checks** before revalidated export.
A lost HTTP connection cannot deliver a recovery response; uncopied drafts are
page-memory only and do not survive reload by design.

## Fixed-input prompt audit

The new wire format shares exact repeated Oracle clauses and common requirements
through documented dictionaries; prices and casting costs are not summarized.
Repeated original basics use exact quantities. Builder retains all selected
engine packages and the same four critical combos as PR #14, while trimming
optional examples toward a 32 KB target (46 KB hard prompt cap remains).

The independent fixed-input script compares dereferenced engine Oracle text and
requirements, critical combo prerequisites/policy/pieces and all priced function
options against PR #14's archived frozen evidence. No model is invoked.

| Commander | PR #14 bytes | New bytes | Reduction | Retained engine examples | Preserved critical combos |
| --- | ---: | ---: | ---: | ---: | ---: |
| Ulalek, Fused Atrocity | 45780 | 31703 | 30.75% | 12 | 4 |
| Wilhelt, the Rotcleaver | 45835 | 31990 | 30.21% | 12 | 4 |
| Y'shtola, Night's Blessed | 45944 | 31622 | 31.17% | 3 | 4 |
| Yuriko, the Tiger's Shadow | 45550 | 31988 | 29.77% | 3 | 4 |
| Zada, Hedron Grinder | 45616 | 31768 | 30.36% | 0 | 4 |

Byte reductions are not token counts, latency predictions or gameplay results.
The frozen complete decks and selected EUR prices remain unchanged. Native
coverage limitations for unfamiliar commanders are preserved.

Upgrader additionally needs its full original. Its three checked prompts remain
within the existing 46 KB cap, preserving all 99 mainboard physical copies,
34/35/22 protected identities for Ulalek/Wilhelt/Y'shtola and 6/1/0 committed
combo examples. Optional NEW discoveries can still be removed under its prior
bounded-context behavior. It does not claim all hypotheticals fit in context.

## Actual checks

- Baseline: **339/339**, zero failures/skips; 117,147.370241 ms.
- Focused: **61/61**, zero failures/skips; 862.577528 ms.
- Final full suite: **362/362**, zero failures/skips; 118,174.274723 ms.
- Mocked controller regressions: timeout with zero/partial text, SDK abort-code
  remapping, manual cancellation, deadline cleanup/cap, empty/whitespace/missing
  completion, streamed-prefix preservation, oversized response, invalid-deck
  preservation, daily count/no retry, and concurrent quota-stop precedence.
- Pure client regressions: invalid/malformed/empty result cannot replace editor
  text or become `{}`; valid complete-shaped local results alone may replace it.
- Prompt regressions: exact clauses/guards, full combo setup/policy, priced options,
  original quantities and all critical frozen evidence remain resolvable.
- Real Chromium with **mocked auth/config/generation transport**: seven explicit
  mocked requests cover timeout (no/partial text), cancel, empty, validation
  failure, malformed result and a locally validated complete fixture. Useful
  editor text remains on failure; no partial export; real local partial import
  fails the count gate. Zero page errors, zero live inference.
- Separate existing real local browser/API workflow: five frozen decks, three
  Upgrader previews, manual copy/revision/import, 101-card rejection, download,
  separate package approval and undo pass. No mocked AI outputs are labeled live.
- Independent export audit: **500 physical slots pass** exact selected-printing
  cents, singleton/color and €191 checks. Historical external ratings untouched.
- Runtime outbound request guard: **zero calls**. Root catalog, metadata,
  community, library, Windows launcher and package hashes unchanged. All server
  smoke runs used an absolute disposable-app path; no root cache startup.

The initial context reduction exposed an Upgrader overflow. Restoring its prior
optional-discovery trimming, plus shared original facts/quantities, fixed it
without relaxing any hard gate. Final API tests pass all three Upgrader cases.
No failed or incomplete check is represented as a pass.

## Reproduce and remaining limits

See [workflow/Windows steps](../docs/ARCHITECT_RECOVERY.md) and the compact
[receipts](architect-timeout/checks.json). Browser recovery mocking is explicit;
no OAuth, included-plan eligibility or provider billing is verified by those tests.
The unchanged SDK source, not a guessed timeout extension, establishes the
180-second bound. Tests trigger deterministic mocked deadlines rather than wait
165 seconds. Native Windows generation has **not** been retested live.

The longer deadline and smaller prompts remove the observed 90-second stop and
improve failure recovery. They do not guarantee a full response within 165
seconds or establish stronger decks, actual win rates or zero provider charges.
The next user Windows run can verify completion/latency or provide an explicit
`timed_out` text receipt. No automatic rerun is requested or enabled.
