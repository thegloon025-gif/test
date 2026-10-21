# v1.1.3 Pricing reconciliation regression

The motivating user-provided error was: `100/100 cards; 0 unpriced; calculated €228.93; generator €182.5; cap €191`.

The v1.1.2 name-based audit could resolve to a different price record; it did not preserve exact selection provenance. The release now audits the exact selected printings against their catalog records and the exported list, failing closed on discrepancies.

Tests include two different records with the same name priced at €2 and €45 and proof that neither incorrect credit nor incorrect debit is substituted. Both strategy-first and legacy synthetic full decks are re-audited end-to-end. Tests cannot independently reproduce the user's specific real-card numbers without their local Scryfall catalog.
