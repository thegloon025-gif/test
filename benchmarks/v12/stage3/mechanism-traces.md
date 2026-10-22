# Hand-review mechanism examples

These cases are deliberately illustrative: fixed native pilot for both decks, first holdout satisfying a declared mechanism/counterexample condition. They do not select a candidate/pilot or estimate typical performance. Common retained cards share relative random order; absolute draw positions can move. Aggregate conclusions remain the paired full-cohort results.

## ulalek-b3 repair-03: realized-access

Seed `gameplay-shadow-2026-10-22:holdout:6`, native pilot for both. [Before receipts](ulalek-b3-repair-03-realized-access-before.json), [after receipts](ulalek-b3-repair-03-realized-access-after.json). Commander turn 4 → 4; effect draws 0 → 5; net cards 0 → 5.

| Turn | Before plays / resolved access | After plays / resolved access |
| --- | --- | --- |
| 1 | land: Battlefield Forge | land: Battlefield Forge |
| 2 | land: Karplusan Forest; cast-paid: Solar Transformer | land: Karplusan Forest; cast-paid: Solar Transformer |
| 3 | land: Caves of Koilos; cast-paid: Blisterpod; cast-paid: Millikin | land: Caves of Koilos; cast-paid: Up the Beanstalk; access-draw: Rapacious One; cast-paid: Millikin |
| 4 | land: Plains; cast-paid: Ulalek, Fused Atrocity | land: Plains; cast-paid: Ulalek, Fused Atrocity; access-draw: Glaring Fleshraker |
| 5 | land: Tomb of the Spirit Dragon; cast-paid: Glaring Fleshraker; optional-trigger-paid: Glaring Fleshraker | land: Tomb of the Spirit Dragon; cast-paid: Blisterpod; optional-trigger-paid: Blisterpod; cast-paid: Glaring Fleshraker; optional-trigger-declined: commander |
| 6 | cast-paid: Rapacious One; optional-trigger-declined: commander | land: Wastes; cast-paid: Eldrazi Ravager; optional-trigger-declined: commander; access-draw: Eldritch Immunity |
| 7 | cast-paid: Eldrazi Ravager; optional-trigger-declined: commander | land: Sulfurous Springs; cast-paid: Rapacious One; optional-trigger-paid: Rapacious One; access-draw: Zhulodok, Void Gorger |
| 8 | land: Wastes; cast-paid: Gideon Blackblade | cast-paid: Conduit of Ruin; optional-trigger-paid: Conduit of Ruin; access-draw: Island; land: Island |

## ulalek-b4 repair-03: realized-access

Seed `gameplay-shadow-2026-10-22:holdout:6`, native pilot for both. [Before receipts](ulalek-b4-repair-03-realized-access-before.json), [after receipts](ulalek-b4-repair-03-realized-access-after.json). Commander turn 4 → 4; effect draws 0 → 2; net cards 0 → 2.

| Turn | Before plays / resolved access | After plays / resolved access |
| --- | --- | --- |
| 1 | land: Battlefield Forge | land: Battlefield Forge |
| 2 | land: Karplusan Forest; cast-paid: Nightshade Dryad | land: Karplusan Forest; cast-paid: Nightshade Dryad |
| 3 | land: Dark Fortress; cast-paid: Solar Transformer; cast-paid: Millikin | land: Dark Fortress; cast-paid: Solar Transformer; cast-paid: Millikin |
| 4 | land: Caves of Koilos; cast-paid: Ulalek, Fused Atrocity | land: Gleaming Bastion; cast-paid: Ulalek, Fused Atrocity |
| 5 | land: Gleaming Bastion; cast-paid: Eldrazi Linebreaker; optional-trigger-paid: Eldrazi Linebreaker | land: Caves of Koilos; cast-paid: Up the Beanstalk; access-draw: Rapacious One |
| 6 | land: Flooded Grove; cast-paid: Rapacious One; optional-trigger-paid: Rapacious One | land: Flooded Grove; cast-paid: Eldrazi Linebreaker; optional-trigger-paid: Eldrazi Linebreaker |
| 7 | land: Plains; cast-paid: Glaring Fleshraker; optional-trigger-paid: Glaring Fleshraker | land: Plains; cast-paid: Glaring Fleshraker; optional-trigger-paid: Glaring Fleshraker |
| 8 | land: Reflecting Pool; cast-paid: Gideon Blackblade | land: Reflecting Pool; cast-paid: Eldrazi Ravager; optional-trigger-paid: Eldrazi Ravager; access-draw: Wastes |

## ulalek-b4 repair-04: timing-regression

Seed `gameplay-shadow-2026-10-22:holdout:4`, native pilot for both. [Before receipts](ulalek-b4-repair-04-timing-regression-before.json), [after receipts](ulalek-b4-repair-04-timing-regression-after.json). Commander turn 8 → not by T8; effect draws 1 → 1; net cards 0 → -1.

| Turn | Before plays / resolved access | After plays / resolved access |
| --- | --- | --- |
| 1 | land: Mountain; cast-paid: Giant's Boulder | land: Mountain; cast-paid: Giant's Boulder |
| 2 | land: Reflecting Pool | land: Reflecting Pool |
| 3 | land: Underground River; cast-paid: Great Forest Druid | land: Underground River; cast-paid: Great Forest Druid |
| 4 | cast-paid: Mind Stone; access-draw: Sire of Stagnation | cast-paid: Mind Stone; access-draw: Sire of Stagnation |
| 5 | cast-paid: Arcane Signet | No supported deployment/access |
| 6 | No supported deployment/access | No supported deployment/access |
| 7 | cast-paid: Writhing Chrysalis | land: Path of Ancestry |
| 8 | land: Path of Ancestry; cast-paid: Ulalek, Fused Atrocity | cast-paid: Writhing Chrysalis |
