# Paired complete-deck measurements

Three fixed pilots per proposal; no favorable-pilot maximization. Values are after minus before, mean [nominal paired-bootstrap 95% interval]. Training n=8, holdout n=16 per pilot. Commander tempo is 9 minus deployment turn within the eight-turn horizon, zero if not deployed by T8; it is a censored timing observation, not a deck score. Optional payments are original paid cast triggers, with copying/execution unknown. Intervals are exploratory and conditional on model coverage, not external power or win probabilities.

## ulalek-b3 repair-01

[After export](proposals/ulalek-b3-repair-01.txt); €182.52, unused €8.48, Δ€8.28. **inconclusive-tradeoffs**: Intervals, pilot disagreements or ties do not support a robust complete-deck improvement. Raw [paired data](comparison.json); [all run vectors](ulalek-b3-repair-01-runs.json.gz).

| Fixed pilot | Train commander tempo | Holdout commander tempo | Train net cards | Holdout net cards | Holdout paid optional triggers |
| --- | --- | --- | --- | --- | --- |
| commander-first | -0.25 [-0.75, 0] | -0.063 [-0.375, 0.25] | 0 [0, 0] (all ties) | 0 [-0.375, 0.375] | 0 [-0.188, 0.188] |
| development | -0.375 [-1.125, 0] | 0.063 [-0.125, 0.313] | 0 [0, 0] (all ties) | -0.063 [-0.375, 0.188] | 0 [-0.188, 0.188] |
| native | -0.25 [-0.75, 0] | -0.063 [-0.375, 0.25] | 0 [0, 0] (all ties) | 0 [-0.375, 0.375] | 0 [-0.188, 0.188] |

Identified access coverage before → after: supported records 11 → 10; unmodeled records 10 → 10; unmodeled clauses 10 → 10. Full Oracle coverage is unknown. Original copying/cascade, tutors, combat, sacrifice and target-copy execution remain outside these statistics.

## ulalek-b3 repair-03

[After export](proposals/ulalek-b3-repair-03.txt); €184.22, unused €6.78, Δ€9.98. **inconclusive-tradeoffs**: Intervals, pilot disagreements or ties do not support a robust complete-deck improvement. Raw [paired data](comparison.json); [all run vectors](ulalek-b3-repair-03-runs.json.gz).

| Fixed pilot | Train commander tempo | Holdout commander tempo | Train net cards | Holdout net cards | Holdout paid optional triggers |
| --- | --- | --- | --- | --- | --- |
| commander-first | -0.25 [-0.75, 0] | 0.063 [-0.25, 0.375] | 0.375 [0, 1.125] | 0.438 [-0.188, 1.188] | 0.125 [-0.125, 0.438] |
| development | -0.5 [-1.25, 0] | 0.188 [0, 0.375] | 0.5 [0, 1.5] | 0.563 [-0.063, 1.375] | 0.125 [-0.125, 0.438] |
| native | -0.25 [-0.75, 0] | 0.063 [-0.25, 0.375] | 0.375 [0, 1.125] | 0.438 [-0.188, 1.188] | 0.125 [-0.125, 0.438] |

Identified access coverage before → after: supported records 11 → 11; unmodeled records 10 → 10; unmodeled clauses 10 → 10. Full Oracle coverage is unknown. Original copying/cascade, tutors, combat, sacrifice and target-copy execution remain outside these statistics.

## ulalek-b3 repair-04

[After export](proposals/ulalek-b3-repair-04.txt); €186.84, unused €4.16, Δ€12.60. **inconclusive-tradeoffs**: Intervals, pilot disagreements or ties do not support a robust complete-deck improvement. Raw [paired data](comparison.json); [all run vectors](ulalek-b3-repair-04-runs.json.gz).

| Fixed pilot | Train commander tempo | Holdout commander tempo | Train net cards | Holdout net cards | Holdout paid optional triggers |
| --- | --- | --- | --- | --- | --- |
| commander-first | -0.25 [-0.75, 0] | 0.063 [-0.25, 0.375] | 0.5 [0, 1.5] | 0.438 [-0.188, 1.188] | 0.188 [-0.125, 0.5] |
| development | -0.375 [-1.125, 0] | 0.188 [0, 0.375] | 0.5 [0, 1.5] | 0.563 [-0.125, 1.375] | 0.188 [-0.125, 0.5] |
| native | -0.25 [-0.75, 0] | 0.063 [-0.25, 0.375] | 0.5 [0, 1.5] | 0.438 [-0.188, 1.188] | 0.125 [-0.125, 0.438] |

Identified access coverage before → after: supported records 11 → 11; unmodeled records 10 → 10; unmodeled clauses 10 → 10. Full Oracle coverage is unknown. Original copying/cascade, tutors, combat, sacrifice and target-copy execution remain outside these statistics.

## ulalek-b3 repair-11

[After export](proposals/ulalek-b3-repair-11.txt); €179.30, unused €11.70, Δ€5.06. **inconclusive-tradeoffs**: Intervals, pilot disagreements or ties do not support a robust complete-deck improvement. Raw [paired data](comparison.json); [all run vectors](ulalek-b3-repair-11-runs.json.gz).

| Fixed pilot | Train commander tempo | Holdout commander tempo | Train net cards | Holdout net cards | Holdout paid optional triggers |
| --- | --- | --- | --- | --- | --- |
| commander-first | -0.25 [-0.75, 0] | -0.063 [-0.375, 0.188] | 0 [0, 0] (all ties) | 0 [-0.375, 0.375] | 0 [-0.188, 0.188] |
| development | -0.375 [-1.125, 0] | 0.063 [0, 0.188] | 0 [0, 0] (all ties) | 0 [-0.375, 0.375] | 0 [-0.188, 0.188] |
| native | -0.25 [-0.75, 0] | -0.063 [-0.375, 0.188] | 0 [0, 0] (all ties) | -0.125 [-0.375, 0] | 0.125 [-0.188, 0.563] |

Identified access coverage before → after: supported records 11 → 10; unmodeled records 10 → 10; unmodeled clauses 10 → 10. Full Oracle coverage is unknown. Original copying/cascade, tutors, combat, sacrifice and target-copy execution remain outside these statistics.

## ulalek-b3 repair-13

[After export](proposals/ulalek-b3-repair-13.txt); €181.00, unused €10.00, Δ€6.76. **inconclusive-tradeoffs**: Intervals, pilot disagreements or ties do not support a robust complete-deck improvement. Raw [paired data](comparison.json); [all run vectors](ulalek-b3-repair-13-runs.json.gz).

| Fixed pilot | Train commander tempo | Holdout commander tempo | Train net cards | Holdout net cards | Holdout paid optional triggers |
| --- | --- | --- | --- | --- | --- |
| commander-first | -0.25 [-0.75, 0] | 0.063 [-0.25, 0.375] | 0.375 [0, 1.125] | 0.25 [-0.25, 0.875] | 0.125 [-0.188, 0.563] |
| development | -0.5 [-1.25, 0] | 0.188 [0, 0.375] | 0.5 [0, 1.5] | 0.438 [-0.125, 1.125] | 0.125 [-0.188, 0.563] |
| native | -0.25 [-0.75, 0] | 0.063 [-0.25, 0.375] | 0.375 [0, 1.125] | 0.25 [-0.25, 0.875] | 0.188 [-0.188, 0.75] |

Identified access coverage before → after: supported records 11 → 11; unmodeled records 10 → 10; unmodeled clauses 10 → 10. Full Oracle coverage is unknown. Original copying/cascade, tutors, combat, sacrifice and target-copy execution remain outside these statistics.

## ulalek-b3 repair-14

[After export](proposals/ulalek-b3-repair-14.txt); €183.62, unused €7.38, Δ€9.38. **inconclusive-tradeoffs**: Intervals, pilot disagreements or ties do not support a robust complete-deck improvement. Raw [paired data](comparison.json); [all run vectors](ulalek-b3-repair-14-runs.json.gz).

| Fixed pilot | Train commander tempo | Holdout commander tempo | Train net cards | Holdout net cards | Holdout paid optional triggers |
| --- | --- | --- | --- | --- | --- |
| commander-first | -0.25 [-0.75, 0] | 0.063 [-0.25, 0.375] | 0.5 [0, 1.5] | 0.25 [-0.25, 0.875] | 0.188 [-0.125, 0.625] |
| development | -0.375 [-1.125, 0] | 0.188 [0, 0.375] | 0.5 [0, 1.5] | 0.438 [-0.188, 1.125] | 0.188 [-0.125, 0.625] |
| native | -0.25 [-0.75, 0] | 0.063 [-0.25, 0.375] | 0.5 [0, 1.5] | 0.25 [-0.25, 0.875] | 0.188 [-0.188, 0.75] |

Identified access coverage before → after: supported records 11 → 11; unmodeled records 10 → 10; unmodeled clauses 10 → 10. Full Oracle coverage is unknown. Original copying/cascade, tutors, combat, sacrifice and target-copy execution remain outside these statistics.

## ulalek-b4 repair-01

[After export](proposals/ulalek-b4-repair-01.txt); €182.31, unused €8.69, Δ€8.43. **inconclusive-tradeoffs**: Intervals, pilot disagreements or ties do not support a robust complete-deck improvement. Raw [paired data](comparison.json); [all run vectors](ulalek-b4-repair-01-runs.json.gz).

| Fixed pilot | Train commander tempo | Holdout commander tempo | Train net cards | Holdout net cards | Holdout paid optional triggers |
| --- | --- | --- | --- | --- | --- |
| commander-first | 0.125 [0, 0.375] | -0.063 [-0.188, 0] | 0 [0, 0] (all ties) | 0 [-0.313, 0.25] | 0.188 [0, 0.563] |
| development | 0.25 [0, 0.75] | -0.063 [-0.188, 0] | 0 [0, 0] (all ties) | -0.063 [-0.375, 0.25] | 0.063 [0, 0.188] |
| native | 0.125 [0, 0.375] | -0.063 [-0.188, 0] | 0 [0, 0] (all ties) | 0 [-0.313, 0.25] | 0.188 [0, 0.563] |

Identified access coverage before → after: supported records 9 → 9; unmodeled records 11 → 11; unmodeled clauses 11 → 11. Full Oracle coverage is unknown. Original copying/cascade, tutors, combat, sacrifice and target-copy execution remain outside these statistics.

## ulalek-b4 repair-02

[After export](proposals/ulalek-b4-repair-02.txt); €176.50, unused €14.50, Δ€2.62. **inconclusive-tradeoffs**: Intervals, pilot disagreements or ties do not support a robust complete-deck improvement. Raw [paired data](comparison.json); [all run vectors](ulalek-b4-repair-02-runs.json.gz).

| Fixed pilot | Train commander tempo | Holdout commander tempo | Train net cards | Holdout net cards | Holdout paid optional triggers |
| --- | --- | --- | --- | --- | --- |
| commander-first | 0 [0, 0] (all ties) | -0.125 [-0.313, 0] | 0.125 [0, 0.375] | 0 [-0.188, 0.188] | 0 [0, 0] (all ties) |
| development | 0.125 [0, 0.375] | -0.063 [-0.188, 0] | 0.125 [0, 0.375] | 0 [-0.188, 0.188] | 0 [0, 0] (all ties) |
| native | 0 [0, 0] (all ties) | -0.125 [-0.313, 0] | 0.125 [0, 0.375] | 0 [-0.188, 0.188] | 0 [0, 0] (all ties) |

Identified access coverage before → after: supported records 9 → 9; unmodeled records 11 → 11; unmodeled clauses 11 → 11. Full Oracle coverage is unknown. Original copying/cascade, tutors, combat, sacrifice and target-copy execution remain outside these statistics.

## ulalek-b4 repair-03

[After export](proposals/ulalek-b4-repair-03.txt); €184.01, unused €6.99, Δ€10.13. **inconclusive-tradeoffs**: Intervals, pilot disagreements or ties do not support a robust complete-deck improvement. Raw [paired data](comparison.json); [all run vectors](ulalek-b4-repair-03-runs.json.gz).

| Fixed pilot | Train commander tempo | Holdout commander tempo | Train net cards | Holdout net cards | Holdout paid optional triggers |
| --- | --- | --- | --- | --- | --- |
| commander-first | 0.25 [0, 0.625] | -0.063 [-0.25, 0.125] | 0.25 [0, 0.625] | 0.188 [-0.25, 0.563] | 0.25 [0, 0.688] |
| development | 0.375 [0, 0.875] | -0.25 [-0.5, 0] | 0.25 [0, 0.625] | 0.25 [-0.313, 0.875] | 0.125 [0, 0.313] |
| native | 0.25 [0, 0.625] | -0.125 [-0.375, 0.125] | 0.25 [0, 0.625] | 0.188 [-0.25, 0.563] | 0.25 [0, 0.688] |

Identified access coverage before → after: supported records 9 → 10; unmodeled records 11 → 11; unmodeled clauses 11 → 11. Full Oracle coverage is unknown. Original copying/cascade, tutors, combat, sacrifice and target-copy execution remain outside these statistics.

## ulalek-b4 repair-04

[After export](proposals/ulalek-b4-repair-04.txt); €186.63, unused €4.37, Δ€12.75. **inconclusive-tradeoffs**: Intervals, pilot disagreements or ties do not support a robust complete-deck improvement. Raw [paired data](comparison.json); [all run vectors](ulalek-b4-repair-04-runs.json.gz).

| Fixed pilot | Train commander tempo | Holdout commander tempo | Train net cards | Holdout net cards | Holdout paid optional triggers |
| --- | --- | --- | --- | --- | --- |
| commander-first | 0.25 [0, 0.625] | -0.125 [-0.375, 0.125] | 0.375 [0, 0.875] | 0.063 [-0.313, 0.438] | 0.25 [0, 0.688] |
| development | 0.5 [0.125, 1] | -0.313 [-0.625, 0] | 0.375 [0, 0.875] | 0.125 [-0.375, 0.75] | 0.125 [0, 0.313] |
| native | 0.25 [0, 0.625] | -0.188 [-0.438, 0.063] | 0.375 [0, 0.875] | 0.063 [-0.313, 0.438] | 0.25 [0, 0.688] |

Identified access coverage before → after: supported records 9 → 10; unmodeled records 11 → 11; unmodeled clauses 11 → 11. Full Oracle coverage is unknown. Original copying/cascade, tutors, combat, sacrifice and target-copy execution remain outside these statistics.

## ulalek-b4 repair-13

[After export](proposals/ulalek-b4-repair-13.txt); €180.79, unused €10.21, Δ€6.91. **inconclusive-tradeoffs**: Intervals, pilot disagreements or ties do not support a robust complete-deck improvement. Raw [paired data](comparison.json); [all run vectors](ulalek-b4-repair-13-runs.json.gz).

| Fixed pilot | Train commander tempo | Holdout commander tempo | Train net cards | Holdout net cards | Holdout paid optional triggers |
| --- | --- | --- | --- | --- | --- |
| commander-first | 0.25 [0, 0.625] | -0.063 [-0.25, 0.125] | 0.25 [0, 0.625] | 0.125 [-0.25, 0.5] | 0.063 [0, 0.188] |
| development | 0.375 [0, 0.875] | -0.125 [-0.375, 0.125] | 0.25 [0, 0.625] | 0.063 [-0.313, 0.438] | 0.063 [0, 0.188] |
| native | 0.25 [0, 0.625] | -0.063 [-0.25, 0.125] | 0.25 [0, 0.625] | 0.125 [-0.25, 0.5] | 0.063 [0, 0.188] |

Identified access coverage before → after: supported records 9 → 10; unmodeled records 11 → 11; unmodeled clauses 11 → 11. Full Oracle coverage is unknown. Original copying/cascade, tutors, combat, sacrifice and target-copy execution remain outside these statistics.

## ulalek-b4 repair-14

[After export](proposals/ulalek-b4-repair-14.txt); €183.41, unused €7.59, Δ€9.53. **inconclusive-tradeoffs**: Intervals, pilot disagreements or ties do not support a robust complete-deck improvement. Raw [paired data](comparison.json); [all run vectors](ulalek-b4-repair-14-runs.json.gz).

| Fixed pilot | Train commander tempo | Holdout commander tempo | Train net cards | Holdout net cards | Holdout paid optional triggers |
| --- | --- | --- | --- | --- | --- |
| commander-first | 0.25 [0, 0.625] | -0.125 [-0.375, 0.125] | 0.375 [0, 0.875] | 0 [-0.375, 0.375] | 0.063 [0, 0.188] |
| development | 0.5 [0.125, 1] | -0.188 [-0.438, 0.063] | 0.375 [0, 0.875] | -0.063 [-0.438, 0.313] | 0.063 [0, 0.188] |
| native | 0.25 [0, 0.625] | -0.125 [-0.375, 0.125] | 0.375 [0, 0.875] | 0 [-0.375, 0.375] | 0.063 [0, 0.188] |

Identified access coverage before → after: supported records 9 → 10; unmodeled records 11 → 11; unmodeled clauses 11 → 11. Full Oracle coverage is unknown. Original copying/cascade, tutors, combat, sacrifice and target-copy execution remain outside these statistics.

## yuriko-b3 repair-01

[After export](proposals/yuriko-b3-repair-01.txt); €134.47, unused €56.53, Δ€8.43. **abstain-native-coverage**: Native execution is incomplete; partial probes cannot reject or endorse this strategy. Raw [paired data](comparison.json); [all run vectors](yuriko-b3-repair-01-runs.json.gz).

| Fixed pilot | Train commander tempo | Holdout commander tempo | Train net cards | Holdout net cards | Holdout paid optional triggers |
| --- | --- | --- | --- | --- | --- |
| commander-first | 0 [0, 0] (all ties) | 0 [0, 0] (all ties) | -0.125 [-0.375, 0] | 0.125 [0, 0.375] | unknown / not applicable |
| development | 0 [0, 0] (all ties) | 0.063 [0, 0.188] | -0.125 [-0.375, 0] | 0.25 [0, 0.563] | unknown / not applicable |
| native | 0 [0, 0] (all ties) | 0 [0, 0] (all ties) | -0.125 [-0.375, 0] | 0.063 [-0.188, 0.375] | unknown / not applicable |

Identified access coverage before → after: supported records 14 → 14; unmodeled records 13 → 13; unmodeled clauses 14 → 14. Full Oracle coverage is unknown. Original copying/cascade, tutors, combat, sacrifice and target-copy execution remain outside these statistics.

## yuriko-b3 repair-08

[After export](proposals/yuriko-b3-repair-08.txt); €131.25, unused €59.75, Δ€5.21. **abstain-native-coverage**: Native execution is incomplete; partial probes cannot reject or endorse this strategy. Raw [paired data](comparison.json); [all run vectors](yuriko-b3-repair-08-runs.json.gz).

| Fixed pilot | Train commander tempo | Holdout commander tempo | Train net cards | Holdout net cards | Holdout paid optional triggers |
| --- | --- | --- | --- | --- | --- |
| commander-first | 0.125 [0, 0.375] | 0 [0, 0] (all ties) | -0.125 [-0.375, 0] | 0.063 [0, 0.188] | unknown / not applicable |
| development | 0.25 [0, 0.5] | 0.063 [0, 0.188] | -0.125 [-0.375, 0] | 0.063 [0, 0.188] | unknown / not applicable |
| native | 0.125 [0, 0.375] | 0 [0, 0] (all ties) | -0.125 [-0.375, 0] | 0.063 [0, 0.188] | unknown / not applicable |

Identified access coverage before → after: supported records 14 → 14; unmodeled records 13 → 13; unmodeled clauses 14 → 14. Full Oracle coverage is unknown. Original copying/cascade, tutors, combat, sacrifice and target-copy execution remain outside these statistics.

## wilhelt-b3 repair-01

[After export](proposals/wilhelt-b3-repair-01.txt); €110.49, unused €80.51, Δ€8.43. **abstain-native-coverage**: Native execution is incomplete; partial probes cannot reject or endorse this strategy. Raw [paired data](comparison.json); [all run vectors](wilhelt-b3-repair-01-runs.json.gz).

| Fixed pilot | Train commander tempo | Holdout commander tempo | Train net cards | Holdout net cards | Holdout paid optional triggers |
| --- | --- | --- | --- | --- | --- |
| commander-first | -0.125 [-0.375, 0] | 0.25 [0, 0.75] | 0 [0, 0] (all ties) | -0.375 [-1.125, 0] | unknown / not applicable |
| development | -0.125 [-0.375, 0] | 0.188 [0, 0.563] | 0 [0, 0] (all ties) | -0.375 [-1.125, 0] | unknown / not applicable |
| native | -0.125 [-0.375, 0] | 0.25 [0, 0.75] | 0 [0, 0] (all ties) | -0.375 [-1.125, 0] | unknown / not applicable |

Identified access coverage before → after: supported records 6 → 6; unmodeled records 12 → 12; unmodeled clauses 12 → 12. Full Oracle coverage is unknown. Original copying/cascade, tutors, combat, sacrifice and target-copy execution remain outside these statistics.

## wilhelt-b3 repair-02

[After export](proposals/wilhelt-b3-repair-02.txt); €151.38, unused €39.62, Δ€49.32. **abstain-native-coverage**: Native execution is incomplete; partial probes cannot reject or endorse this strategy. Raw [paired data](comparison.json); [all run vectors](wilhelt-b3-repair-02-runs.json.gz).

| Fixed pilot | Train commander tempo | Holdout commander tempo | Train net cards | Holdout net cards | Holdout paid optional triggers |
| --- | --- | --- | --- | --- | --- |
| commander-first | 0.125 [0, 0.375] | 0.125 [-0.125, 0.438] | 0.125 [0, 0.375] | 0.063 [0, 0.188] | unknown / not applicable |
| development | 0.125 [0, 0.375] | 0.125 [-0.125, 0.438] | 0.125 [0, 0.375] | 0.063 [0, 0.188] | unknown / not applicable |
| native | 0.125 [0, 0.375] | 0.125 [-0.125, 0.438] | 0.125 [0, 0.375] | 0.063 [0, 0.188] | unknown / not applicable |

Identified access coverage before → after: supported records 6 → 5; unmodeled records 12 → 13; unmodeled clauses 12 → 13. Full Oracle coverage is unknown. Original copying/cascade, tutors, combat, sacrifice and target-copy execution remain outside these statistics.

## wilhelt-b3 repair-03

[After export](proposals/wilhelt-b3-repair-03.txt); €110.16, unused €80.84, Δ€8.10. **abstain-native-coverage**: Native execution is incomplete; partial probes cannot reject or endorse this strategy. Raw [paired data](comparison.json); [all run vectors](wilhelt-b3-repair-03-runs.json.gz).

| Fixed pilot | Train commander tempo | Holdout commander tempo | Train net cards | Holdout net cards | Holdout paid optional triggers |
| --- | --- | --- | --- | --- | --- |
| commander-first | 0 [-0.375, 0.375] | 0.25 [-0.125, 0.813] | 1 [0.25, 1.75] | 0.313 [-0.75, 1.125] | unknown / not applicable |
| development | -0.125 [-0.5, 0.25] | 0.188 [-0.125, 0.625] | 1 [0.25, 1.75] | 0.313 [-0.75, 1.125] | unknown / not applicable |
| native | 0 [-0.375, 0.375] | 0.25 [-0.125, 0.813] | 0.875 [0.25, 1.625] | 0.125 [-0.875, 0.875] | unknown / not applicable |

Identified access coverage before → after: supported records 6 → 6; unmodeled records 12 → 13; unmodeled clauses 12 → 13. Full Oracle coverage is unknown. Original copying/cascade, tutors, combat, sacrifice and target-copy execution remain outside these statistics.

## wilhelt-b3 repair-04

[After export](proposals/wilhelt-b3-repair-04.txt); €151.35, unused €39.65, Δ€49.29. **abstain-native-coverage**: Native execution is incomplete; partial probes cannot reject or endorse this strategy. Raw [paired data](comparison.json); [all run vectors](wilhelt-b3-repair-04-runs.json.gz).

| Fixed pilot | Train commander tempo | Holdout commander tempo | Train net cards | Holdout net cards | Holdout paid optional triggers |
| --- | --- | --- | --- | --- | --- |
| commander-first | 0 [-0.375, 0.375] | 0.188 [-0.063, 0.438] | 0.125 [0, 0.375] | 0.313 [0, 0.75] | unknown / not applicable |
| development | 0 [-0.375, 0.375] | 0.188 [-0.063, 0.438] | 0.125 [0, 0.375] | 0.313 [0, 0.75] | unknown / not applicable |
| native | 0 [-0.375, 0.375] | 0.188 [-0.063, 0.438] | 0.125 [0, 0.375] | 0.313 [0, 0.75] | unknown / not applicable |

Identified access coverage before → after: supported records 6 → 5; unmodeled records 12 → 12; unmodeled clauses 12 → 12. Full Oracle coverage is unknown. Original copying/cascade, tutors, combat, sacrifice and target-copy execution remain outside these statistics.

## wilhelt-b3 repair-06

[After export](proposals/wilhelt-b3-repair-06.txt); €110.32, unused €80.68, Δ€8.26. **abstain-native-coverage**: Native execution is incomplete; partial probes cannot reject or endorse this strategy. Raw [paired data](comparison.json); [all run vectors](wilhelt-b3-repair-06-runs.json.gz).

| Fixed pilot | Train commander tempo | Holdout commander tempo | Train net cards | Holdout net cards | Holdout paid optional triggers |
| --- | --- | --- | --- | --- | --- |
| commander-first | 0 [-0.375, 0.375] | 0.25 [-0.125, 0.813] | 1.125 [0.25, 2] | 0.5 [-0.625, 1.438] | unknown / not applicable |
| development | 0.125 [-0.25, 0.5] | 0.125 [-0.25, 0.563] | 1.125 [0.25, 2] | 0.688 [-0.563, 1.813] | unknown / not applicable |
| native | 0 [-0.375, 0.375] | 0.25 [-0.125, 0.813] | 1 [0.25, 1.75] | 0.25 [-0.813, 1] | unknown / not applicable |

Identified access coverage before → after: supported records 6 → 6; unmodeled records 12 → 12; unmodeled clauses 12 → 12. Full Oracle coverage is unknown. Original copying/cascade, tutors, combat, sacrifice and target-copy execution remain outside these statistics.

## wilhelt-b3 repair-14

[After export](proposals/wilhelt-b3-repair-14.txt); €101.63, unused €89.37, Δ€-0.43. **abstain-native-coverage**: Native execution is incomplete; partial probes cannot reject or endorse this strategy. Raw [paired data](comparison.json); [all run vectors](wilhelt-b3-repair-14-runs.json.gz).

| Fixed pilot | Train commander tempo | Holdout commander tempo | Train net cards | Holdout net cards | Holdout paid optional triggers |
| --- | --- | --- | --- | --- | --- |
| commander-first | -0.5 [-1.25, 0] | 0.313 [-0.313, 0.875] | 1.125 [0.25, 2] | 0.938 [0.375, 1.563] | unknown / not applicable |
| development | -0.5 [-1.25, 0] | 0.188 [-0.375, 0.625] | 1.125 [0.25, 2] | 0.938 [0.375, 1.563] | unknown / not applicable |
| native | -0.5 [-1.25, 0] | 0.313 [-0.313, 0.875] | 0.875 [0.25, 1.5] | 0.75 [0.313, 1.313] | unknown / not applicable |

Identified access coverage before → after: supported records 6 → 6; unmodeled records 12 → 12; unmodeled clauses 12 → 12. Full Oracle coverage is unknown. Original copying/cascade, tutors, combat, sacrifice and target-copy execution remain outside these statistics.

## zada-b3 repair-01

[After export](proposals/zada-b3-repair-01.txt); €166.99, unused €24.01, Δ€8.31. **abstain-native-coverage**: Native execution is incomplete; partial probes cannot reject or endorse this strategy. Raw [paired data](comparison.json); [all run vectors](zada-b3-repair-01-runs.json.gz).

| Fixed pilot | Train commander tempo | Holdout commander tempo | Train net cards | Holdout net cards | Holdout paid optional triggers |
| --- | --- | --- | --- | --- | --- |
| commander-first | -0.125 [-0.375, 0] | 0 [0, 0] (all ties) | 0 [0, 0] (all ties) | -0.063 [-0.188, 0] | unknown / not applicable |
| development | -0.25 [-0.75, 0] | 0 [0, 0] (all ties) | 0 [0, 0] (all ties) | -0.063 [-0.188, 0] | unknown / not applicable |
| native | -0.125 [-0.375, 0] | 0 [0, 0] (all ties) | 0 [0, 0] (all ties) | -0.063 [-0.188, 0] | unknown / not applicable |

Identified access coverage before → after: supported records 5 → 5; unmodeled records 12 → 12; unmodeled clauses 12 → 12. Full Oracle coverage is unknown. Original copying/cascade, tutors, combat, sacrifice and target-copy execution remain outside these statistics.

## zada-b3 repair-07

[After export](proposals/zada-b3-repair-07.txt); €163.77, unused €27.23, Δ€5.09. **abstain-native-coverage**: Native execution is incomplete; partial probes cannot reject or endorse this strategy. Raw [paired data](comparison.json); [all run vectors](zada-b3-repair-07-runs.json.gz).

| Fixed pilot | Train commander tempo | Holdout commander tempo | Train net cards | Holdout net cards | Holdout paid optional triggers |
| --- | --- | --- | --- | --- | --- |
| commander-first | -0.125 [-0.375, 0] | 0 [0, 0] (all ties) | 0 [0, 0] (all ties) | -0.125 [-0.313, 0] | unknown / not applicable |
| development | -0.25 [-0.75, 0] | 0 [0, 0] (all ties) | -0.125 [-0.375, 0] | -0.125 [-0.313, 0] | unknown / not applicable |
| native | -0.125 [-0.375, 0] | 0 [0, 0] (all ties) | 0 [0, 0] (all ties) | -0.125 [-0.313, 0] | unknown / not applicable |

Identified access coverage before → after: supported records 5 → 5; unmodeled records 12 → 12; unmodeled clauses 12 → 12. Full Oracle coverage is unknown. Original copying/cascade, tutors, combat, sacrifice and target-copy execution remain outside these statistics.
