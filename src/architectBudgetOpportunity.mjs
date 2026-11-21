/** Advisory budget opportunity review: no spend floor, score, selection or inference. */
const euros = n => Math.round(n * 100) / 100;
export function architectBudgetOpportunity({price, budget, tolerance = 0, functionalReview}) {
  if (![price, budget, tolerance].every(Number.isFinite) || budget < 0 || tolerance < 0)
    return {status:"unknown", reason:"Reliable original value or ceiling not available.", suggestedRevision:null};
  const ceiling = euros(budget + tolerance);
  const headroom = euros(Math.max(0, ceiling - price));
  const pct = budget > 0 ? euros(100 * price / budget) : null;
  const mana = functionalReview?.manaPolish;
  const swaps = Array.isArray(mana?.suggestions) ? mana.suggestions : [];
  const gaps = [];
  if (swaps.length)
    gaps.push("The local mana review found " + swaps.length + " budget-feasible possible land swap(s); compare their printed entry conditions and any lost abilities.");
  const seen = new Set();
  const interesting = new Set([
    "no-recognized-persistent-access", "missing-prerequisite", "missing-colored-land-channel",
    "colorless-land-concentration", "no-recognized-native-input",
    "unobserved-expensive-followups", "win-conversion-unresolved"
  ]);
  for (const w of functionalReview?.warnings || []) {
    if (!interesting.has(w.code) || seen.has(w.code)) continue;
    seen.add(w.code);
    if (gaps.length < 4) gaps.push(String(w.explanation).slice(0, 280));
  }
  // Headroom is *context* for solving printed functional gaps, never a quality score.
  // Small headroom never creates a pressure-to-spend warning.
  const needsReview = headroom >= 25 && gaps.length > 0;
  const suggestedRevision = needsReview
    ? ("Reconsider this already validated deck, preserving its commander, complete engine/combo packages, existing win paths, bracket and " +
      "100-card legality. The local selected-printing estimate is €" + price.toFixed(2) +
      " against a hard deck ceiling of €" + ceiling.toFixed(2) +
      "; there is €" + headroom.toFixed(2) + " headroom, NOT a spending target. " +
      "Only replace weak cards when a better affordable alternative meaningfully improves real early mana tempo, " +
      "card access, interaction, protection or win conversion. Investigate these observed gaps: " +
      gaps.slice(0, 3).join(" ") +
      " Explain retained/lost functions and unknowns; do not spend merely to approach the ceiling.")
    : null;
  return {
    status:"advisory-only", originalEUR:euros(price), targetEUR:euros(budget),
    ceilingEUR:ceiling, headroomEUR:headroom, budgetUsePercent:pct,
    attention:needsReview ? "functional-opportunities-with-headroom" : "no-spend-pressure",
    observedGaps:gaps, suggestedRevision,
    scope:"Headroom and printed observations only. No minimum spending, deck ranking, simulated win rate, automatic edits, inference or proof that pricier cards are better."
  };
}
