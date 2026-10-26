# Architect strategy evidence — validation, 2026-10-26

Unreleased **1.1.5**; separate branch stacked on draft PR #13, base
`61087a981d117ce130aae3aee5b3d0832eccf348`. No merge, release, production
selection/ranking change or actual gameplay-power claim.

## Findings and implementation

The old request selected the first 80 affordable legal names alphabetically,
provided no Archidekt source structures, and could certify only hard gates plus
a conservative mana-inventory upper bound. A complete legal pile could receive
no structured functional warning. This was an information/review failure, not
evidence that a different internal quality number was needed.

`architectEvidence.mjs` now retrieves typed commander predicates, engine/support
relationships, resource/death packages, complete bracket-matched cached source
structures, bounded Spellbook requirements, and complementary priced functions.
No private reference recipes, commander-name scoring, popularity-as-power or
universal quotas are used. Exact catalog cards outside the examples are allowed.
See [implementation semantics](../docs/ARCHITECT_STRATEGY_EVIDENCE.md).

`architectReview.mjs` attaches the existing read-only ledger, physical dependency
analysis, supported mana/hand probes and independent receipt audits **after**
100-card/legality/printing/price/known-policy gates. It returns separate warnings,
not a score or strength certification. Unknown effects do not become failed
strategy obligations. Review/audit failure returns explicit unknown coverage;
it cannot fabricate a successful trace or erase hard errors.

The model is asked to choose a direction and preserve required packages before
filling slots. The prompt includes real printed costs/guards, adverse effects,
chosen-type/zone conditions and distinct cast-versus-copy requirements. Context
trimming preserves whole combo prerequisites and a reserved published-policy
disclosure. Concise priced function options remain even when detailed Oracle
records are omitted. Truncation and incomplete coverage are explicit.

A Builder click now permits one call, including invalid results. Warnings never
cause automatic inference. A strategic revision needs an explicit instruction
and a previously validated complete deck. The Upgrader still has at most two
hard-validation repairs and separate approval/undo; its implementation is intact.
Authentication, SDK, confirmations, quota/session stops, cancellation, usage
logging and lack of paid/API-key fallback are unchanged. `planOnly.mjs` only
adds a validated lower repair bound (never above the existing maximum).

## Frozen-input complete-deck checks

These are **archived complete decks used as manual-result fixtures**, not newly
GPT-generated decks. Their 100-card lists and selected prices remain unchanged:
[Ulalek](chatgpt-architect/ulalek-validated-manual-fixture.txt),
[Wilhelt](chatgpt-architect/wilhelt-validated-manual-fixture.txt),
[Y'shtola](chatgpt-architect/yshtola-validated-manual-fixture.txt),
[Yuriko](chatgpt-architect/yuriko-validated-manual-fixture.txt),
[Zada](chatgpt-architect/zada-validated-manual-fixture.txt).

All use the same immutable uploaded 32,197-record catalog, frozen cached
community/library inputs, B3, €191 cap, owned basics, zero tolerance and
selected-printing Scryfall EUR estimates. These are not verified EN NM offers.
Full input hashes, old alphabetical names, new typed evidence, warnings and
observations are preserved losslessly in [comparison.json.gz](architect-quality/comparison.json.gz).

| Commander | Unchanged price | Verified matching sources | Package examples | Prompt bytes | Prompt / validation+negative-count check ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| Ulalek, Fused Atrocity | €174.24 | 15 | 12 | 45780 | 1634 / 683 |
| Wilhelt, the Rotcleaver | €163.25 | 8 | 12 | 45835 | 748 / 481 |
| Y'shtola, Night's Blessed | €90.68 | 0 | 3 | 45944 | 1108 / 447 |
| Yuriko, the Tiger's Shadow | €126.04 | 0 | 3 | 45550 | 694 / 443 |
| Zada, Hedron Grinder | €152.66 | 0 | 0 | 45616 | 457 / 430 |

The source structures are observed alternatives, not endorsements or affordable
recipes: their complete selected-record totals are disclosed separately. Missing
or unmatched-bracket research stays absent; no public-source results are invented.

Concrete context differences:

- Ulalek receives actual Eldrazi cast predicates, separate `{C}{C}`, Echoes
  copying/multiplication, Zhulodok cascade, Conduit tutor/reduction, Mystic Forge
  top access and Up the Beanstalk's MV condition, alongside real supporting names.
- Wilhelt receives Zombie material, voluntary sacrifice, replacement tokens,
  Undead Augur access and Diregraf Captain pressure, with actual costs/guards.
  Off-tribe death packages cannot masquerade as native material merely because
  their cards also contain death text. Source-observed alternatives stay labeled.
- Y'shtola receives the noncreature **MV 3+** predicate and printed life-loss/end
  step conditions. A controlled test includes Read the Bones but excludes
  MV-2 Night's Whisper from qualifying casts; the latter can still be an access
  option. A reduction such as Blood Funnel retains its sacrifice/counter drawback
  in printed evidence, not a free-mana claim.
- Yuriko and Zada receive their recognized needs with explicit native unknowns;
  no absence of simulated ninjutsu/combat/target-copy value penalizes their decks.

## Compact combo and count regressions

The original Gemini Argon and CommanderOracle 101-card lists are unavailable;
the user confirmed they no longer have them. **They were not reconstructed.**
Controlled count/combo fixtures are clearly marked as such, not external decks
or source templates.

One explicit public Spellbook query verified [1988-5641](https://commanderspellbook.com/combo/1988-5641/),
now an attributed small Architect-only source snapshot, separate from user caches.
Broodscale and Blade must be on the battlefield, Blade attached, and an initial
counter must be supplied. Broodscale's Adapt costs `{1}{G}` if it has no counters;
legal equip costs `{1}` separately. The empty published starting-mana field
cannot make that setup free. The resolved Spawn can sacrifice for `{C}`; that
same object cannot pay another cost. Blade's death trigger then supplies the
next counter. Published mana/counter/ETB/death results are not automatically
lethal damage or a game win. Timing/reliability remains **unknown**.

Both 101-card controlled imports fail. An explicit cut to 100 still fails B3
with this inventory-complete compact infinite under the **existing conservative
local policy**, while B4 passes that policy/count gate if actual payments and
budget also pass. This does not assert current Wizards certification, a turn
estimate, or activate Pod High-Power. Existing cache absence no longer silently
hides this reviewed example in the Architect. Production constructor policy and
the existing standalone Upgrader remain untouched.

## Specific functional warnings and negative controls

- A controlled legal 100-card expensive-threat pile passes hard accounting but
  receives distinct no-recognized-persistent-access and unobserved-follow-up
  warnings. More expensive or more numerous threats earn no benefit.
- Replacing persistent top access with a one-shot effect removes the exact
  persistent job. One-shot/conditional text is not called reliable recurring draw.
- Absent eligible Zombie sacrifice material identifies a specific prerequisite;
  concentrated true-colorless basics with actual colored costs identifies fixing
  risk. Ulalek's `{C/color}` alternatives are not falsely mandatory colored pips.
- Nominal combos sharing a physical or absent piece are exposed as shared
  dependencies, never counted as independent available wins. Missing cached
  packages are optional hypotheses, not commands to insert bracket-illegal pieces.
- Conditional cast/entry access and copied-spell qualifications remain printed
  relationships, not fabricated realized draws. Utility cards need no closed combo.

The five benchmark reviews ran eight fixed trials under each of two pilots,
turns 1–8, seed `architect-functional-v1`: **80 independently audited runs**.
Both pilots recorded commander deployment by turn 8 in 1/8 Ulalek, 4/8 Wilhelt,
1/8 Y'shtola, 5/8 Yuriko and 0/8 Zada runs. These very small model observations
have broad Wilson intervals and incomplete mana-source/native coverage. The
same seeds across pilots are not independent extra trials.

All realized immediate-draw counts here are zero **in the narrow supported
immediate-draw grammar**, while ledger access engines are present. This is a
coverage limitation, not evidence that those decks cannot draw cards. Restricted
mana, native triggers, combat, top access and recovery are not modeled by these
PR #9 probes. These observations cannot establish strategy superiority or actual
win rates; no production ranking or deck replacement is justified by them.

## Tests, verification and failures corrected

- Baseline: **326/326**, no failures/skips, 115,816.139478 ms.
- Focused: **38/38**, no failures/skips, 894.510760 ms.
- Full: **339/339**, no failures/skips, 117,842.957284 ms.
- Local API: five original complete lists and three combined Upgrader previews;
  overbudget, malformed, unknown-card, financial-confirmation, disabled-request,
  origin/CSRF and unavailable-storage checks pass; zero inference requests.
- Real Chromium: default off, typed request/policy context, functional warnings,
  explicit manual revision, 101-card rejection, revalidated download, separate
  Upgrader acceptance/export and original undo all pass; zero page errors.
- Independent export audit: **500/500 physical slots**, canonical singleton/color,
  selected-printing cents, known Game Changer metadata and €191 ceiling pass.
- Runtime model/probe requests: zero. Guarded runtime network egress: zero.
  The one explicit published-combo lookup and GitHub operations are separate.

The smoke test caught a genuine initial Upgrader context overflow: richer
metadata exceeded 46 KB. Concise original excerpts plus whole-unit trimming
fixed it without relaxing validation. The browser caught a compact-risk
truncation; a reserved reviewed-policy channel fixed it. Its initial asynchronous
status assertion also needed an explicit wait. These are resolved in final runs.

A mistaken first smoke launch used repository cwd and existing startup repair
changed only one combo-library `updatedAt` (no variants added). It was stopped;
an existing backup matching the recorded pre-test SHA restored the **exact
original bytes**. The rewritten file and detailed diff remain private in `/tmp`.
Final catalog, metadata, community, combo-library, launcher and package hashes
match the pre-run hashes. All actual API/browser smoke used a disposable copy.
See [preservation receipt](architect-quality/preservation.json).

## Remaining limits and decision

This fixes information retrieval and explanation, **not proven GPT deck quality**.
No account was authorized and no live model generated a new deck in this task;
mock guard tests/local manual imports cannot demonstrate zero provider billing
or external power improvement. Existing historical external ratings are unchanged.

Grammar and deterministic evidence sampling remain incomplete. The prompt may
still miss useful cards or include conditional/incidental options. Cached sources
are sparse for some commanders. Printed support is not throughput, payment,
recursion or executable lethal. Current official bracket data (#10), native
Windows execution and user-generated before/after lists with external/manual
play validation remain separate requirements.

Use this draft to test the new brief/manual workflow, then explicitly request a
fresh AI list under saved plan/account limits when desired. Compare the full
100-card result and warnings against the preserved baseline before claiming
better construction. Do not merge, release, enable gameplay ranking, turn on the
custom pod profile or introduce an automatic upgrade/paid fallback.

Reproduction commands and Windows steps are in
[ARCHITECT_STRATEGY_EVIDENCE.md](../docs/ARCHITECT_STRATEGY_EVIDENCE.md).
