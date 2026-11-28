/** Read-only, bounded land-tempo evidence and optional single-swap previews.
 * No AI calls, quality score, automatic cuts, deck mutation or official bracket claim.
 */
import { coloredSources, isLandSlot, legalFor, landFaces, landManaQuality, priceOf, trueColorlessSource, oracleId } from "./cards.mjs";
import { earlyLandSource, openingManaReview } from "./openingMana.mjs";

const colors = ["W", "U", "B", "R", "G"];
const key = c => String(oracleId(c));
const text = c => landFaces(c).map(f => f.oracle_text || "").join("\n") || c.oracle_text || "";
const cents = n => Math.round(n * 100);
const subset = (a, b) => a.every(v => b.includes(v));

/** Classify actual printed entry clauses conservatively. No guessed untap probability. */
export function landEntryEvidence(c) {
  if (!isLandSlot(c)) return { kind: "not-a-land", reason: "Not a land slot." };
  const faces = landFaces(c);
  if (faces.length > 1) {
    const choices = faces.map(face => landEntryEvidence({ ...face, layout: 'normal' }));
    if (choices.every(choice => choice.kind === choices[0].kind)) return choices[0];
    return { kind: "entry-cost-or-unknown", reason: "Entry depends on the land face played.", printed: text(c).slice(0, 400) };
  }
  const t = text(c);
  const normalized = t.replaceAll(faces[0].name || c.name, 'This land');
  const clauses = normalized.split(/(?<=\.)\s+|\n/);
  const selfEntry = /^(?:this (?:land|permanent|creature)|it) enters(?: the battlefield)? tapped\b/i;
  const forced = clauses.find(s => /^this (?:land|permanent|creature) enters(?: the battlefield)? tapped\.$/i.test(s));
  if (forced) return { kind: "always-tapped", reason: "Printed clause requires entering tapped.", printed: forced };
  if (clauses.some(s => selfEntry.test(s) || /^(?:if|unless)\b[^.]*, (?:this land|it) enters(?: the battlefield)? tapped/i.test(s)))
    return { kind: "conditional-tapped", reason: "Printed tapped-entry condition depends on board or payment.", printed: t.slice(0, 400) };
  if (/(?:\{T\},?\s*)?Sacrifice (?:this land|[^:\n]+):[^\n]*Search your library[^.\n]*put (?:it|that card) onto the battlefield tapped/i.test(t))
    return { kind: "delayed-fetch", reason: "Fetching a tapped replacement can defer available mana.", printed: t.slice(0, 400) };
  if (/\b(?:enters|enter)(?: the battlefield)?\b/i.test(t) && /\b(sacrifice|return a land|pay \d+ life|unless)\b/i.test(t))
    return { kind: "entry-cost-or-unknown", reason: "Entry/payment condition needs review.", printed: t.slice(0, 400) };
  return { kind: "no-recognized-tap-clause", reason: "No tapped-entry clause recognized; other restrictions may remain.", printed: t.slice(0, 400) };
}
function channels(c) {
  return { colors: coloredSources(c), trueC: trueColorlessSource(c) };
}
function adequateReplacement(old, next) {
  const a = channels(old), b = channels(next);
  return subset(a.colors, b.colors) && (!a.trueC || b.trueC);
}
function conservativeCandidate(c, commander) {
  const e = landEntryEvidence(c);
  const t = text(c), q = landManaQuality(c);
  if (e.kind === "conditional-tapped" && earlyLandSource(c, commander)?.delayed === false) return true;
  const earlyFastland = e.kind === "conditional-tapped" && /unless you control two or fewer other lands/i.test(t);
  // Favor source channels known to be untapped immediately, or fastlands whose early
  // timing is explicitly printed. Other conditional effects stay unsupported.
  if (e.kind !== "no-recognized-tap-clause" && !earlyFastland) return false;
  return !q.restricted && !q.needsActivationPayment && !q.consumable && !q.unusable &&
    !/\b(?:sacrifice (?:a|an|this) land|return a land|pay \d+ life|doesn't untap|skip your untap|at the beginning of your upkeep)\b/i.test(t);
}
function demand(cards, commander) {
  const early = [commander, ...cards.filter(c => !isLandSlot(c) && Number(c.cmc) <= 4)];
  const result = Object.fromEntries(colors.map(c => [c, { printedPips: 0, spells: 0 }]));
  for (const card of early) {
    const symbols = [...String(card.mana_cost || "").matchAll(/\{([^}]+)\}/g)].map(m => m[1]);
    for (const symbol of symbols) {
      if (/^[WUBRG]$/.test(symbol)) { result[symbol].printedPips++; result[symbol].spells++; }
      // Hybrid symbols are genuine choices, not simultaneous color obligations.
    }
  }
  return result;
}
/** Budget and original cards are immutable inputs. Every suggestion is a single optional pair. */
export function manaPolishReview({ commander, cards, catalog = [], budget = null, tolerance = 0, maxSuggestions = 5 }) {
  const lands = cards.filter(isLandSlot), counts = {
    "always-tapped": 0, "conditional-tapped": 0, "delayed-fetch": 0,
    "entry-cost-or-unknown": 0, "no-recognized-tap-clause": 0
  };
  const entries = lands.map(c => {
    const entry = landEntryEvidence(c), production = channels(c), mana = landManaQuality(c);
    counts[entry.kind] = (counts[entry.kind] || 0) + 1;
    return { name: c.name, kind: entry.kind, printed: entry.printed, colors: production.colors,
      trueC: production.trueC, restricted: mana.restricted || mana.needsActivationPayment || mana.consumable };
  });
  const sources = Object.fromEntries(colors.map(k => [k, {
    printed: entries.filter(e => e.colors.includes(k)).length,
    withoutRecognizedTapClause: entries.filter(e => e.colors.includes(k) && e.kind === "no-recognized-tap-clause").length,
    conditional: entries.filter(e => e.colors.includes(k) && e.kind === "conditional-tapped").length
  }]));
  const knownC = entries.filter(e => e.trueC).length;
  const sourceDemand = demand(cards, commander);
  const unknownPrices = [commander, ...cards].some(c => priceOf(c) === null);
  const originalCents = unknownPrices ? null : [commander, ...cards].reduce((n, c) => n + cents(priceOf(c)), 0);
  const ceilingCents = Number.isFinite(budget) && Number.isFinite(tolerance) ? cents(budget + tolerance) : null;
  const current = new Set([commander, ...cards].map(key));
  const suggestions = [];
  if (originalCents !== null && ceilingCents !== null && Array.isArray(catalog)) {
    const pool = catalog.filter(c =>
      isLandSlot(c) && !current.has(key(c)) && legalFor(c, commander) &&
      priceOf(c) !== null && c.printing?.eligibleVersion === 2 && conservativeCandidate(c, commander)
    );
    const unique = new Map(pool.map(c => [key(c), c]));
    for (const old of lands) {
      if (suggestions.length >= Math.max(0, Math.min(10, maxSuggestions))) break;
      // A bounce/lotus-style land can produce multiple mana or require returning
      // another land. Replacing it with an ordinary dual is not a free tempo gain.
      const oldText = text(old);
      if (/\breturn (?:a|an|another) land you control to its owner.s hand/i.test(oldText) ||
          /\bAdd\s+(?:\{[WUBRGC]\}){2,}/i.test(oldText)) continue;
      const from = landEntryEvidence(old);
      if (from.kind !== "always-tapped" && from.kind !== "conditional-tapped") continue;
      if (from.kind === "conditional-tapped" && earlyLandSource(old, commander)?.delayed === false) continue;
      const matches = [...unique.values()].filter(c =>
        adequateReplacement(old, c) &&
        originalCents - cents(priceOf(old)) + cents(priceOf(c)) <= ceilingCents
      ).sort((a, b) =>
        cents(priceOf(a)) - cents(priceOf(b)) || a.name.localeCompare(b.name)
      );
      if (!matches.length) continue;
      // Cheapest feasible equivalent printed channels is a budget-filtering choice, not a power score.
      const next = matches[0];
      suggestions.push({
        cut: old.name, add: next.name,
        before: from.kind, after: landEntryEvidence(next).kind,
        oldColors: channels(old).colors, newColors: channels(next).colors,
        preservesPrintedTrueC: !trueColorlessSource(old) || trueColorlessSource(next),
        cutPriceEUR: priceOf(old), addPriceEUR: priceOf(next),
        priceDeltaEUR: (cents(priceOf(next)) - cents(priceOf(old))) / 100,
        proposedFullDeckEUR: (originalCents - cents(priceOf(old)) + cents(priceOf(next))) / 100,
        ceilingEUR: ceilingCents / 100,
        caveat: (/scry|surveil|search your library|draw|life|sacrifice|counter|cycling|when(?:ever)?/i.test(oldText)
          ? "Cut has additional printed function(s); review what is lost. "
          : "") + (landEntryEvidence(next).kind === "conditional-tapped"
          ? (/pay 2 life/i.test(text(next)) ? "Untapped entry costs 2 life. " : "Fastland is early-untapped only when its printed condition holds. ")
          : "") + "Other mana/entry restrictions and turn sequencing are not fully modeled.",
        status: "advisory-only; no change or gameplay proof"
      });
    }
  }
  const warning = counts["always-tapped"] + counts["conditional-tapped"] + counts["delayed-fetch"];
  return {
    mode: "read-only mana-polish",
    openingMana: openingManaReview(commander, cards, counts["always-tapped"]),
    lands: lands.length, entryCounts: counts, entries, sources,
    printedTrueColorlessLands: knownC, earlyPrintedDemand: sourceDemand,
    originalFullDeckEUR: originalCents === null ? null : originalCents / 100,
    ceilingEUR: ceilingCents === null ? null : ceilingCents / 100,
    suggestions,
    advisory: warning
      ? "Tapped/conditional/delayed land slots identified; check early-turn tempo without treating every conditional land as always tapped."
      : "No recognized tapped/delayed entries. This is not proof of perfect tempo.",
    unavailableSuggestions: originalCents === null ? "Unpriced deck; no budget-safe suggestions." :
      ceilingCents === null ? "No ceiling supplied; no budget-safe suggestions." :
      !catalog.length ? "Full local priced catalog was not supplied." : null,
    scope: "Source counts describe printed channels, not probabilities. Opening mana evaluates exactly two land slots before mulligans and compares printed spell costs using modeled sources. New land options preserve printed color channels and true-C but may lose other utility. No automatic edits."
  };
}
