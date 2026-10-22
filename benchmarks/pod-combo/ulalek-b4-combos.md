# Ulalek B4: infinite-combo requirement review

These are cached inventory matches and upstream loop claims, **not verified executions or independent wins**. Earliest and reliable turns remain unknown. All named quantities, template quantities, required states and actions below must be satisfied. Source starting mana is not total deployment cost. Conditional examples are in the comparison report.

## 74-4131 — The Enigma Jewel // Locus of Enlightenment + Basalt Monolith

[Commander Spellbook source](https://commanderspellbook.com/combo/74-4131/) · Commander participates: **no** · timing **unknown** · execution **unverified**.

| Named piece | Quantity | Starting zones | Required state | Front casting cost |
| --- | ---: | --- | --- | --- |
| The Enigma Jewel // Locus of Enlightenment | 1 | battlefield | Not specified (not proof of unrestricted state) | {U} |
| Basalt Monolith | 1 | battlefield | is untapped | {3} |

Recorded starting mana: **Unspecified; not assumed free**. Literal {C} symbols in that field: 0. Payment in the actions may require additional startup resources or use resources regenerated inside the loop; do not simply sum every occurrence.

**Setup warning — Locus of Enlightenment:** Owning the card does not establish transformation. Pay all front-face transformation/craft costs and supply its additional resources.

The Enigma Jewel enters tapped.
{T}: Add {C}{C}. Spend this mana only to activate abilities.
Craft with four or more nonlands with activated abilities {8}{U} ({8}{U}, Exile this artifact, Exile the four or more from among other permanents you control and/or cards in your graveyard: Return this card transformed under its owner's control. Craft only as a sorcery.)

Recorded order and priority:

1. Activate Basalt Monolith's first ability by tapping it, adding {C}{C}{C}
2. Activate Basalt Monolith's second ability by paying {3}
3. Locus of Enlightenment triggers, untapping Basalt Monolith
4. Holding priority, activate Basalt Monolith by tapping it, adding {C}{C}{C}
5. Resolve Basalt Monolith's ability from step 2, untapping it.
6. Repeat

Additional state/resource review:

- Required tap abilities need untapped objects; a creature using its own tap ability needs haste or control since turn began
- Creature tap abilities require untapped creatures without summoning sickness (or haste); sacrifice-only abilities do not themselves require haste. See exact action and Oracle text.

Published outcomes (not independently verified net output):

- Infinite colorless mana

Win conversion: **not verified**. Published direct-damage/win route: no. Otherwise an additional deployed outlet and its resources are required; infinite mana, tokens or ETBs do not automatically win. Full potential outlet Oracle/cost review is retained in the JSON audit.

## 5473-5657-5664 — Ulalek, Fused Atrocity + Annie Joins Up + Writhing Chrysalis

[Commander Spellbook source](https://commanderspellbook.com/combo/5473-5657-5664/) · Commander participates: **yes** · timing **unknown** · execution **unverified**.

| Named piece | Quantity | Starting zones | Required state | Front casting cost |
| --- | ---: | --- | --- | --- |
| Ulalek, Fused Atrocity | 1 | battlefield | Not specified (not proof of unrestricted state) | {C/W}{C/U}{C/B}{C/R}{C/G} |
| Annie Joins Up | 1 | battlefield | Not specified (not proof of unrestricted state) | {1}{R}{G}{W} |
| Writhing Chrysalis | 1 | hand | Not specified (not proof of unrestricted state) | {2}{R}{G} |

Recorded starting mana: **{2}{C}{C}{R}{G}**. Literal {C} symbols in that field: 2. Payment in the actions may require additional startup resources or use resources regenerated inside the loop; do not simply sum every occurrence.

Other recorded prerequisites:

- {2}{C}{C}{R}{G}

Recorded order and priority:

1. Cast Writhing Chrysalis by paying {2}{R}{G}.
2. Ulalek triggers twice, and Writhing Chrysalis' first ability triggers once.
3. Resolve one of Ulalek's triggers, causing you to pay {C}{C} to copy the Writhing Chrysalis spell, Ulalek's trigger and Writhing Chrysalis' trigger.
4. Resolve the copy of Writhing Chrysalis' trigger, creating two 0/1 Eldrazi Spawn creature tokens.
5. Activate both Eldrazi Spawn creature tokens by sacrificing it, adding {C}{C}.
6. Resolve the copy of Ulalek's trigger from step 3, causing you to pay {C}{C} to copy the Writhing Chrysalis spell, Ulalek's trigger and Writhing Chrysalis' trigger.
7. Repeat from step 4.

Additional state/resource review:

- Additional permanents/tokens/resources: see full prerequisites and actions
- Creature tap abilities require untapped creatures without summoning sickness (or haste); sacrifice-only abilities do not themselves require haste. See exact action and Oracle text.

Published outcomes (not independently verified net output):

- Infinite creature LTB
- Infinite creature ETB
- Infinite creature sacrifice triggers
- Infinite death triggers
- Infinite colorless mana
- Infinite creature tokens
- Infinite copies of abilities you control on the stack
- Infinite +1/+1 counters on an infinite number of creature tokens

Win conversion: **not verified**. Published direct-damage/win route: no. Otherwise an additional deployed outlet and its resources are required; infinite mana, tokens or ETBs do not automatically win. Full potential outlet Oracle/cost review is retained in the JSON audit.

## 5473-5657-5665 — Ulalek, Fused Atrocity + Annie Joins Up + Spawn-Gang Commander

[Commander Spellbook source](https://commanderspellbook.com/combo/5473-5657-5665/) · Commander participates: **yes** · timing **unknown** · execution **unverified**.

| Named piece | Quantity | Starting zones | Required state | Front casting cost |
| --- | ---: | --- | --- | --- |
| Ulalek, Fused Atrocity | 1 | battlefield | Not specified (not proof of unrestricted state) | {C/W}{C/U}{C/B}{C/R}{C/G} |
| Annie Joins Up | 1 | battlefield | Not specified (not proof of unrestricted state) | {1}{R}{G}{W} |
| Spawn-Gang Commander | 1 | hand | Not specified (not proof of unrestricted state) | {3}{R}{R} |

Recorded starting mana: **{3}{C}{C}{R}{R}**. Literal {C} symbols in that field: 2. Payment in the actions may require additional startup resources or use resources regenerated inside the loop; do not simply sum every occurrence.

Other recorded prerequisites:

- {3}{C}{C}{R}{R}

Recorded order and priority:

1. Cast Spawn-Gang Commander by paying {3}{R}{R}.
2. Ulalek triggers twice, and Spawn-Gang Commander triggers once.
3. Resolve one of Ulalek's triggers, causing you to pay {C}{C} to copy the Spawn-Gang Commander spell, Ulalek's trigger and Spawn-Gang Commander's trigger.
4. Resolve the copy of Spawn-Gang Commander's trigger, creating three 0/1 Eldrazi Spawn creature tokens.
5. Holding priority, activate two Eldrazi Spawns by sacrificing them, adding {C}{C}.
6. Resolve the Ulalek trigger from step 3, causing you to pay {C}{C} to copy the Spawn-Gang Commander spell, Ulalek's trigger and Spawn-Gang Commander's trigger.
7. Repeat from step 4.

Additional state/resource review:

- Additional permanents/tokens/resources: see full prerequisites and actions
- Creature tap abilities require untapped creatures without summoning sickness (or haste); sacrifice-only abilities do not themselves require haste. See exact action and Oracle text.

Published outcomes (not independently verified net output):

- Infinite creature LTB
- Infinite creature ETB
- Infinite creature sacrifice triggers
- Infinite death triggers
- Infinite colorless mana
- Infinite damage
- Infinite creature tokens
- Infinite copies of abilities you control on the stack

Win conversion: **not verified**. Published direct-damage/win route: yes. Otherwise an additional deployed outlet and its resources are required; infinite mana, tokens or ETBs do not automatically win. Full potential outlet Oracle/cost review is retained in the JSON audit.

## 5642-5657-5705 — Ulalek, Fused Atrocity + Glaring Fleshraker + Echoes of Eternity

[Commander Spellbook source](https://commanderspellbook.com/combo/5642-5657-5705/) · Commander participates: **yes** · timing **unknown** · execution **unverified**.

| Named piece | Quantity | Starting zones | Required state | Front casting cost |
| --- | ---: | --- | --- | --- |
| Ulalek, Fused Atrocity | 1 | battlefield | Not specified (not proof of unrestricted state) | {C/W}{C/U}{C/B}{C/R}{C/G} |
| Glaring Fleshraker | 1 | battlefield | Not specified (not proof of unrestricted state) | {2}{C} |
| Echoes of Eternity | 1 | battlefield | Not specified (not proof of unrestricted state) | {3}{C}{C}{C} |

Recorded starting mana: **Unspecified; not assumed free**. Literal {C} symbols in that field: 0. Payment in the actions may require additional startup resources or use resources regenerated inside the loop; do not simply sum every occurrence.

Other recorded prerequisites:

- You have a colorless Eldrazi card in hand with the mana to cast it.

Recorded order and priority:

1. Cast any colorless Eldrazi spell by paying its mana cost, triggering Ulalek twice, Echoes of Eternity twice and Glaring Fleshraker's first ability twice.
2. Resolve a Ulalek trigger, causing you to pay {C}{C} to copy the colorless spell, the remaining Ulalek trigger, both Echoes of Eternity triggers and both Glaring Fleshraker triggers.
3. Resolve the first Glaring Fleshraker trigger, creating a 0/1 Eldrazi Spawn creature token.
4. When the Eldrazi Spawn enters the battlefield, Glaring Fleshraker's second ability triggers, dealing 1 damage to each opponent.
5. Activate the Eldrazi Spawn by sacrificing it, adding {C}.
6. Repeat from step 3 one additional time.
7. Repeat from step 2.

Additional state/resource review:

- Additional permanents/tokens/resources: see full prerequisites and actions
- Creature tap abilities require untapped creatures without summoning sickness (or haste); sacrifice-only abilities do not themselves require haste. See exact action and Oracle text.

Published outcomes (not independently verified net output):

- Infinite creature LTB
- Infinite creature ETB
- Infinite creature sacrifice triggers
- Infinite death triggers
- Infinite damage
- Infinite creature tokens
- Infinite copies of abilities you control on the stack
- Infinite copies of a specific creature

Win conversion: **not verified**. Published direct-damage/win route: yes. Otherwise an additional deployed outlet and its resources are required; infinite mana, tokens or ETBs do not automatically win. Full potential outlet Oracle/cost review is retained in the JSON audit.

## 5642-5657-5664 — Ulalek, Fused Atrocity + Echoes of Eternity + Writhing Chrysalis

[Commander Spellbook source](https://commanderspellbook.com/combo/5642-5657-5664/) · Commander participates: **yes** · timing **unknown** · execution **unverified**.

| Named piece | Quantity | Starting zones | Required state | Front casting cost |
| --- | ---: | --- | --- | --- |
| Ulalek, Fused Atrocity | 1 | battlefield | Not specified (not proof of unrestricted state) | {C/W}{C/U}{C/B}{C/R}{C/G} |
| Echoes of Eternity | 1 | battlefield | Not specified (not proof of unrestricted state) | {3}{C}{C}{C} |
| Writhing Chrysalis | 1 | hand | Not specified (not proof of unrestricted state) | {2}{R}{G} |

Recorded starting mana: **{2}{R}{G}**. Literal {C} symbols in that field: 0. Payment in the actions may require additional startup resources or use resources regenerated inside the loop; do not simply sum every occurrence.

Other recorded prerequisites:

- {2}{R}{G}

Recorded order and priority:

1. Cast Writhing Chrysalis by paying {2}{R}{G}.
2. Ulalek and Writhing Chrysalis' first ability triggers twice, and Echoes of Eternity triggers once.
3. Resolve one of Writhing Chrysalis' triggers, creating two 0/1 Eldrazi Spawn creature tokens.
4. Resolve the Echoes of Eternity trigger, copying the Writhing Chrysalis spell.
5. Resolve the copy of the Writhing Chrysalis spell, creating a token copy of it.
6. Activate both Eldrazi Spawn creature tokens by sacrificing it, adding {C}{C}.
7. Writhing Chrysalis triggers twice for each Eldrazi sacrificed, putting a total of four +1/+1 counters on itself.
8. Resolve one of Ulalek's triggers, causing you to pay {C}{C} to copy the Writhing Chrysalis spell, Ulalek's trigger and Writhing Chrysalis' trigger.
9. Resolve the copy of Writhing Chrysalis' trigger, creating two 0/1 Eldrazi Spawn creature tokens.
10. Activate both Eldrazi Spawn creature tokens by sacrificing it, adding {C}{C}.
11. Writhing Chrysalis triggers twice for each Eldrazi sacrificed, putting a total of four +1/+1 counters on itself.
12. Resolve the copy of Ulalek's trigger from step 7, causing you to pay {C}{C} to copy each Writhing Chrysalis spell, Ulalek's trigger and Writhing Chrysalis' trigger.
13. Repeat from step 8 any number of times.
14. End the combo by letting the stack resolve, putting an infinite number of Writhing Chrysalis tokens onto the battlefield.

Additional state/resource review:

- Counters: see required quantities and instructions
- Additional permanents/tokens/resources: see full prerequisites and actions
- Creature tap abilities require untapped creatures without summoning sickness (or haste); sacrifice-only abilities do not themselves require haste. See exact action and Oracle text.

Published outcomes (not independently verified net output):

- Infinite copies of abilities you control on the stack
- Infinite creature tokens
- Infinite death triggers
- Infinite creature ETB
- Infinite creature LTB
- Infinite creature sacrifice triggers
- Infinite +1/+1 counters on a creature

Win conversion: **not verified**. Published direct-damage/win route: no. Otherwise an additional deployed outlet and its resources are required; infinite mana, tokens or ETBs do not automatically win. Full potential outlet Oracle/cost review is retained in the JSON audit.

## 5657-5664-7116 — Ulalek, Fused Atrocity + Writhing Chrysalis + Eldritch Immunity

[Commander Spellbook source](https://commanderspellbook.com/combo/5657-5664-7116/) · Commander participates: **yes** · timing **unknown** · execution **unverified**.

| Named piece | Quantity | Starting zones | Required state | Front casting cost |
| --- | ---: | --- | --- | --- |
| Ulalek, Fused Atrocity | 1 | battlefield | Not specified (not proof of unrestricted state) | {C/W}{C/U}{C/B}{C/R}{C/G} |
| Writhing Chrysalis | 1 | hand | Not specified (not proof of unrestricted state) | {2}{R}{G} |
| Eldritch Immunity | 1 | hand | Not specified (not proof of unrestricted state) | {C} |

Recorded starting mana: **{2}{C}{C}{C}{R}{G}**. Literal {C} symbols in that field: 3. Payment in the actions may require additional startup resources or use resources regenerated inside the loop; do not simply sum every occurrence.

Other recorded prerequisites:

- {2}{C}{C}{C}{R}{G}

Recorded order and priority:

1. Cast Writhing Chrysalis by paying {2}{R}{G}. Ulalek and Writhing Chrysalis' first ability trigger.
2. Holding priority, cast Eldritch Immunity by paying {C}.
3. Ulalek triggers, causing you to pay {C}{C} to copy the Writhing Chrysalis spell, Ulalek's trigger and Writhing Chrysalis' trigger.
4. Resolve the copy of Writhing Chrysalis' trigger, creating two 0/1 Eldrazi Spawn creature tokens.
5. Activate both Eldrazi Spawn creature tokens by sacrificing it, adding {C}{C}.
6. Resolve the copy of Ulalek's trigger from step 4, causing you to pay {C}{C} to copy the Writhing Chrysalis spell, Ulalek's trigger and Writhing Chrysalis' trigger.
7. Repeat from step 4.

Additional state/resource review:

- Additional permanents/tokens/resources: see full prerequisites and actions
- Creature tap abilities require untapped creatures without summoning sickness (or haste); sacrifice-only abilities do not themselves require haste. See exact action and Oracle text.

Published outcomes (not independently verified net output):

- Infinite creature LTB
- Infinite creature ETB
- Infinite creature sacrifice triggers
- Infinite death triggers
- Infinite creature tokens
- Infinite copies of abilities you control on the stack

Win conversion: **not verified**. Published direct-damage/win route: no. Otherwise an additional deployed outlet and its resources are required; infinite mana, tokens or ETBs do not automatically win. Full potential outlet Oracle/cost review is retained in the JSON audit.

## 5642-5657-5665 — Ulalek, Fused Atrocity + Echoes of Eternity + Spawn-Gang Commander

[Commander Spellbook source](https://commanderspellbook.com/combo/5642-5657-5665/) · Commander participates: **yes** · timing **unknown** · execution **unverified**.

| Named piece | Quantity | Starting zones | Required state | Front casting cost |
| --- | ---: | --- | --- | --- |
| Ulalek, Fused Atrocity | 1 | battlefield | Not specified (not proof of unrestricted state) | {C/W}{C/U}{C/B}{C/R}{C/G} |
| Echoes of Eternity | 1 | battlefield | Not specified (not proof of unrestricted state) | {3}{C}{C}{C} |
| Spawn-Gang Commander | 1 | hand | Not specified (not proof of unrestricted state) | {3}{R}{R} |

Recorded starting mana: **{3}{R}{R}**. Literal {C} symbols in that field: 0. Payment in the actions may require additional startup resources or use resources regenerated inside the loop; do not simply sum every occurrence.

Other recorded prerequisites:

- {3}{R}{R}

Recorded order and priority:

1. Cast Spawn-Gang Commander by paying {3}{R}{R}.
2. Ulalek and Spawn-Gang Commander trigger twice, and Echoes of Eternity triggers once.
3. Resolve the Echoes of Eternity trigger, copying the Spawn-Gang Commander spell.
4. Resolve the copy of the Spawn-Gang Commander spell.
5. Resolve one of the Spawn-Gang Commander triggers from step 2, creating three 0/1 Eldrazi Spawn creature tokens.
6. Activate two Eldrazi Spawn creature tokens by sacrificing them, adding {C}{C}.
7. Resolve the copy of Ulalek's trigger, causing you to pay {C}{C} to copy the Spawn-Gang Commander spell, Ulalek's trigger and Spawn-Gang Commander's trigger.
8. Repeat from step 4.

Additional state/resource review:

- Additional permanents/tokens/resources: see full prerequisites and actions
- Creature tap abilities require untapped creatures without summoning sickness (or haste); sacrifice-only abilities do not themselves require haste. See exact action and Oracle text.

Published outcomes (not independently verified net output):

- Infinite colorless mana
- Infinite copies of abilities you control on the stack
- Infinite creature tokens
- Infinite damage
- Infinite death triggers
- Infinite creature ETB
- Infinite creature LTB
- Infinite creature sacrifice triggers

Win conversion: **not verified**. Published direct-damage/win route: yes. Otherwise an additional deployed outlet and its resources are required; infinite mana, tokens or ETBs do not automatically win. Full potential outlet Oracle/cost review is retained in the JSON audit.

## 2751-5657-5664 — Ulalek, Fused Atrocity + Writhing Chrysalis + Strionic Resonator

[Commander Spellbook source](https://commanderspellbook.com/combo/2751-5657-5664/) · Commander participates: **yes** · timing **unknown** · execution **unverified**.

| Named piece | Quantity | Starting zones | Required state | Front casting cost |
| --- | ---: | --- | --- | --- |
| Ulalek, Fused Atrocity | 1 | battlefield | Not specified (not proof of unrestricted state) | {C/W}{C/U}{C/B}{C/R}{C/G} |
| Writhing Chrysalis | 1 | hand | Not specified (not proof of unrestricted state) | {2}{R}{G} |
| Strionic Resonator | 1 | battlefield | Not specified (not proof of unrestricted state) | {2} |

Recorded starting mana: **{4}{C}{C}{R}{G}**. Literal {C} symbols in that field: 2. Payment in the actions may require additional startup resources or use resources regenerated inside the loop; do not simply sum every occurrence.

Other recorded prerequisites:

- {4}{C}{C}{R}{G}

Recorded order and priority:

1. Cast Writhing Chrysalis by paying {2}{R}{G}.
2. Ulalek and Writhing Chrysalis' first ability trigger.
3. Holding priority, activate Strionic Resonator by paying {2} and tapping it, copying Ulalek's trigger.
4. Resolve the copy of Ulalek's trigger, causing you to pay {C}{C} to copy the Writhing Chrysalis spell, Ulalek's trigger and Writhing Chrysalis' trigger.
5. Resolve the copy of the Writhing Chrysalis spell.
6. Resolve the copy of Writhing Chrysalis' trigger, creating two 0/1 Eldrazi Spawn creature tokens.
7. Activate both Eldrazi Spawn creature tokens by sacrificing it, adding {C}{C}.
8. Each Writhing Chrysalis you control triggers twice, putting two +1/+1 counters on each of them.
9. Resolve the copy of Ulalek's trigger from step 4, causing you to pay {C}{C} to copy the Writhing Chrysalis spell, Ulalek's trigger and Writhing Chrysalis' trigger.
10. Repeat from step 5.

Additional state/resource review:

- Required tap abilities need untapped objects; a creature using its own tap ability needs haste or control since turn began
- Counters: see required quantities and instructions
- Additional permanents/tokens/resources: see full prerequisites and actions
- Creature tap abilities require untapped creatures without summoning sickness (or haste); sacrifice-only abilities do not themselves require haste. See exact action and Oracle text.

Published outcomes (not independently verified net output):

- Infinite +1/+1 counters on an infinite number of creature tokens
- Infinite copies of abilities you control on the stack
- Infinite creature tokens
- Infinite death triggers
- Infinite creature ETB
- Infinite creature LTB
- Infinite creature sacrifice triggers
- Infinite colorless mana

Win conversion: **not verified**. Published direct-damage/win route: no. Otherwise an additional deployed outlet and its resources are required; infinite mana, tokens or ETBs do not automatically win. Full potential outlet Oracle/cost review is retained in the JSON audit.

## 2751-5657-5665 — Ulalek, Fused Atrocity + Strionic Resonator + Spawn-Gang Commander

[Commander Spellbook source](https://commanderspellbook.com/combo/2751-5657-5665/) · Commander participates: **yes** · timing **unknown** · execution **unverified**.

| Named piece | Quantity | Starting zones | Required state | Front casting cost |
| --- | ---: | --- | --- | --- |
| Ulalek, Fused Atrocity | 1 | battlefield | Not specified (not proof of unrestricted state) | {C/W}{C/U}{C/B}{C/R}{C/G} |
| Strionic Resonator | 1 | battlefield | Not specified (not proof of unrestricted state) | {2} |
| Spawn-Gang Commander | 1 | hand | Not specified (not proof of unrestricted state) | {3}{R}{R} |

Recorded starting mana: **{5}{C}{C}{R}{R}**. Literal {C} symbols in that field: 2. Payment in the actions may require additional startup resources or use resources regenerated inside the loop; do not simply sum every occurrence.

Other recorded prerequisites:

- {5}{C}{C}{R}{R}

Recorded order and priority:

1. Cast Spawn-Gang Commander by paying {3}{R}{R}.
2. Ulalek and Spawn-Gang Commander trigger.
3. Holding priority, activate Strionic Resonator by paying {2} and tapping it, copying Ulalek's trigger.
4. Resolve the copy of Ulalek's trigger, causing you to pay {C}{C} to copy the Spawn-Gang Commander spell, then Ulalek's trigger and Spawn-Gang Commander's trigger.
5. Resolve the copy of Spawn-Gang Commander's trigger, creating three 0/1 Eldrazi Spawn creature tokens.
6. Activate two Eldrazi Spawn creature tokens by sacrificing them, adding {C}{C}.
7. Repeat from step 4 any number of times.
8. Once you have infinite {C} and Eldrazi Spawn tokens, you may sacrifice them to Spawn-Gang Commander to deal infinite damage to any target(s), and you may resolve all copies of the Spawn-Gang Commander spell.

Additional state/resource review:

- Required tap abilities need untapped objects; a creature using its own tap ability needs haste or control since turn began
- Additional permanents/tokens/resources: see full prerequisites and actions
- Creature tap abilities require untapped creatures without summoning sickness (or haste); sacrifice-only abilities do not themselves require haste. See exact action and Oracle text.

Published outcomes (not independently verified net output):

- Infinite colorless mana
- Infinite copies of abilities you control on the stack
- Infinite creature tokens
- Infinite damage
- Infinite death triggers
- Infinite creature ETB
- Infinite creature LTB
- Infinite creature sacrifice triggers

Win conversion: **not verified**. Published direct-damage/win route: yes. Otherwise an additional deployed outlet and its resources are required; infinite mana, tokens or ETBs do not automatically win. Full potential outlet Oracle/cost review is retained in the JSON audit.

## 5473-5637-5657--34 — Ulalek, Fused Atrocity + Annie Joins Up + Kozilek's Unsealing

[Commander Spellbook source](https://commanderspellbook.com/combo/5473-5637-5657--34/) · Commander participates: **yes** · timing **unknown** · execution **unverified**.

| Named piece | Quantity | Starting zones | Required state | Front casting cost |
| --- | ---: | --- | --- | --- |
| Ulalek, Fused Atrocity | 1 | battlefield | Not specified (not proof of unrestricted state) | {C/W}{C/U}{C/B}{C/R}{C/G} |
| Annie Joins Up | 1 | battlefield | Not specified (not proof of unrestricted state) | {1}{R}{G}{W} |
| Kozilek's Unsealing | 1 | battlefield | Not specified (not proof of unrestricted state) | {2}{U} |

Recorded starting mana: **{C}{C} plus enough mana to pay for the Eldrazi spell**. Literal {C} symbols in that field: 2. Payment in the actions may require additional startup resources or use resources regenerated inside the loop; do not simply sum every occurrence.

Additional required template inventory:

- 1 × Eldrazi Creature Card with MV=4, 5 or 6; starting hand; recorded query `(t:eldrazi or keyword:changeling) t:creature mv>3 mv<7`.
- Catalog inventory matches: Deathless Behemoth. These cards must also occupy the required zones at execution; being in the deck is insufficient.

Other recorded prerequisites:

- {C}{C} plus enough mana to pay for the Eldrazi spell

Recorded order and priority:

1. Cast an Eldrazi with mana value 4, 5 or 6 from your hand by paying its mana cost.
2. Ulalek triggers twice, and Kozilek's Unsealing's first ability triggers once. The Eldrazi cast also triggers if it has a cast ability.
3. Resolve the first Ulalek's trigger, causing you to pay {C}{C} to copy the Eldrazi spell, Ulalek's trigger, Kozilek's Unsealing's trigger, and the Eldrazi cast trigger if it had one.
4. Resolve the Eldrazi cast trigger, if applicable.
5. Resolve the Kozilek's Unsealing trigger, creating two 0/1 Eldrazi Spawn creature tokens.
6. Holding priority, activate the two Eldrazi Spawns by sacrificing them, adding {C}{C}.
7. Resolve the copy of Ulalek's trigger from step 3, causing you to pay {C}{C} to copy the Eldrazi spell, Ulalek's trigger, Kozilek's Unsealing's trigger, and the Eldrazi cast trigger if it had one.
8. Repeat from step 4.

Additional state/resource review:

- Additional permanents/tokens/resources: see full prerequisites and actions
- Creature tap abilities require untapped creatures without summoning sickness (or haste); sacrifice-only abilities do not themselves require haste. See exact action and Oracle text.

Published outcomes (not independently verified net output):

- Infinite creature LTB
- Infinite creature ETB
- Infinite creature sacrifice triggers
- Infinite death triggers
- Infinite colorless mana
- Infinite creature tokens
- Infinite copies of abilities you control on the stack
- Infinite copies of a specific creature

Win conversion: **not verified**. Published direct-damage/win route: no. Otherwise an additional deployed outlet and its resources are required; infinite mana, tokens or ETBs do not automatically win. Full potential outlet Oracle/cost review is retained in the JSON audit.

## 5637-5642-5657--34 — Ulalek, Fused Atrocity + Echoes of Eternity + Kozilek's Unsealing

[Commander Spellbook source](https://commanderspellbook.com/combo/5637-5642-5657--34/) · Commander participates: **yes** · timing **unknown** · execution **unverified**.

| Named piece | Quantity | Starting zones | Required state | Front casting cost |
| --- | ---: | --- | --- | --- |
| Ulalek, Fused Atrocity | 1 | battlefield | Not specified (not proof of unrestricted state) | {C/W}{C/U}{C/B}{C/R}{C/G} |
| Echoes of Eternity | 1 | battlefield | Not specified (not proof of unrestricted state) | {3}{C}{C}{C} |
| Kozilek's Unsealing | 1 | battlefield | Not specified (not proof of unrestricted state) | {2}{U} |

Recorded starting mana: **{C}{C} plus enough mana to pay for the Eldrazi spell**. Literal {C} symbols in that field: 2. Payment in the actions may require additional startup resources or use resources regenerated inside the loop; do not simply sum every occurrence.

Additional required template inventory:

- 1 × Eldrazi Creature Card with MV=4, 5 or 6; starting hand; recorded query `(t:eldrazi or keyword:changeling) t:creature mv>3 mv<7`.
- Catalog inventory matches: Deathless Behemoth. These cards must also occupy the required zones at execution; being in the deck is insufficient.

Other recorded prerequisites:

- {C}{C} plus enough mana to pay for the Eldrazi spell

Recorded order and priority:

1. Cast an Eldrazi with mana value 4, 5 or 6 from your hand by paying its mana cost.
2. Ulalek and Kozilek's Unsealing's first ability trigger twice, the Eldrazi cast triggers twice if it has a cast ability, Echoes of Eternity triggers once if the Eldrazi cast was colorless.
3. Resolve the first Ulalek's trigger, causing you to pay {C}{C} to copy the Eldrazi spell, the additional Ulalek's trigger, both Kozilek's Unsealing triggers, both Eldrazi cast triggers if it had one, and the Echoes of Eternity trigger if it triggered.
4. Resolve both Eldrazi cast triggers, if applicable.
5. Resolve both Kozilek's Unsealing triggers, creating four 0/1 Eldrazi Spawn creature tokens.
6. Holding priority, activate two Eldrazi Spawns by sacrificing them, adding {C}{C}.
7. Resolve the copy of Ulalek's trigger from step 3, causing you to pay {C}{C} to copy the Eldrazi spell, the additional Ulalek's trigger, both Kozilek's Unsealing triggers and any other abilities on the stack.
8. Repeat from step 4.

Additional state/resource review:

- Additional permanents/tokens/resources: see full prerequisites and actions
- Creature tap abilities require untapped creatures without summoning sickness (or haste); sacrifice-only abilities do not themselves require haste. See exact action and Oracle text.

Published outcomes (not independently verified net output):

- Infinite colorless mana
- Infinite copies of abilities you control on the stack
- Infinite copies of a specific creature
- Infinite creature tokens
- Infinite death triggers
- Infinite creature ETB
- Infinite creature LTB
- Infinite creature sacrifice triggers

Win conversion: **not verified**. Published direct-damage/win route: no. Otherwise an additional deployed outlet and its resources are required; infinite mana, tokens or ETBs do not automatically win. Full potential outlet Oracle/cost review is retained in the JSON audit.

## 2751-5637-5657--34 — Ulalek, Fused Atrocity + Strionic Resonator + Kozilek's Unsealing

[Commander Spellbook source](https://commanderspellbook.com/combo/2751-5637-5657--34/) · Commander participates: **yes** · timing **unknown** · execution **unverified**.

| Named piece | Quantity | Starting zones | Required state | Front casting cost |
| --- | ---: | --- | --- | --- |
| Ulalek, Fused Atrocity | 1 | battlefield | Not specified (not proof of unrestricted state) | {C/W}{C/U}{C/B}{C/R}{C/G} |
| Strionic Resonator | 1 | battlefield | Not specified (not proof of unrestricted state) | {2} |
| Kozilek's Unsealing | 1 | battlefield | Not specified (not proof of unrestricted state) | {2}{U} |

Recorded starting mana: **{2}{C}{C} plus enough mana to pay for the Eldrazi spell**. Literal {C} symbols in that field: 2. Payment in the actions may require additional startup resources or use resources regenerated inside the loop; do not simply sum every occurrence.

Additional required template inventory:

- 1 × Eldrazi Creature Card with MV=4, 5 or 6; starting hand; recorded query `(t:eldrazi or keyword:changeling) t:creature mv>3 mv<7`.
- Catalog inventory matches: Deathless Behemoth. These cards must also occupy the required zones at execution; being in the deck is insufficient.

Other recorded prerequisites:

- {2}{C}{C} plus enough mana to pay for the Eldrazi spell

Recorded order and priority:

1. Cast an Eldrazi from your hand by paying its mana cost.
2. Ulalek triggers, the Eldrazi cast triggers if it has a cast ability, and Kozilek's Unsealing's first ability triggers.
3. Holding priority, activate Strionic Resonator by paying {2} and tapping it, copying Ulalek's trigger.
4. Resolve the copy of Ulalek's trigger, causing you to pay {C}{C} to copy the Eldrazi spell, Ulalek's trigger, the Eldrazi cast trigger if it had one, and the Kozilek's Unsealing trigger.
5. Resolve the Eldrazi cast trigger, if applicable.
6. Resolve the copy of the Kozilek's Unsealing trigger, creating two 0/1 Eldrazi Spawn creature tokens.
7. Activate both Eldrazi Spawn creature tokens by sacrificing it, adding {C}{C}.
8. Resolve the copy of Ulalek's trigger from step 4, causing you to pay {C}{C} to copy the Eldrazi spell, Ulalek's trigger, the Eldrazi cast trigger if it had one, and the Kozilek's Unsealing trigger.
9. Repeat from step 5.

Additional state/resource review:

- Required tap abilities need untapped objects; a creature using its own tap ability needs haste or control since turn began
- Additional permanents/tokens/resources: see full prerequisites and actions
- Creature tap abilities require untapped creatures without summoning sickness (or haste); sacrifice-only abilities do not themselves require haste. See exact action and Oracle text.

Published outcomes (not independently verified net output):

- Infinite copies of abilities you control on the stack
- Infinite copies of a specific creature
- Infinite creature tokens
- Infinite death triggers
- Infinite creature ETB
- Infinite creature LTB
- Infinite creature sacrifice triggers

Win conversion: **not verified**. Published direct-damage/win route: no. Otherwise an additional deployed outlet and its resources are required; infinite mana, tokens or ETBs do not automatically win. Full potential outlet Oracle/cost review is retained in the JSON audit.
