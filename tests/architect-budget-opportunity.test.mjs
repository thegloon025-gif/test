import test from "node:test";
import assert from "node:assert/strict";
import { architectBudgetOpportunity } from "../src/architectBudgetOpportunity.mjs";
const seeded = {
  price: 70, budget: 200, tolerance: 4,
  functionalReview: {
    manaPolish: { suggestions: [{cut:"Temple of Deceit",add:"Darkslick Shores"}] },
    warnings: [{ code:"no-recognized-persistent-access", status:"unknown",
      explanation:"No persistent card-access job recognized." }]
  }
};
test("€70 of €200 creates function-grounded advice but no spending instruction or mutation", () => {
  const before = JSON.stringify(seeded);
  const x = architectBudgetOpportunity(seeded);
  assert.equal(x.originalEUR,70);
  assert.equal(x.ceilingEUR,204);
  assert.equal(x.headroomEUR,134);
  assert.equal(x.attention,"functional-opportunities-with-headroom");
  assert.match(x.suggestedRevision,/NOT a spending target/);
  assert.match(x.suggestedRevision,/land swap/);
  assert.match(x.scope,/No minimum spending/);
  assert.equal(JSON.stringify(seeded), before);
});
test("a cheap coherent deck with no identified gaps never receives spend pressure", () => {
  const x = architectBudgetOpportunity({...seeded,functionalReview:{warnings:[],manaPolish:{suggestions:[]}}});
  assert.equal(x.attention, "no-spend-pressure");
  assert.equal(x.suggestedRevision,null);
});
test("small headroom and invalid budget are safe, zero model actions", () => {
  assert.equal(architectBudgetOpportunity({...seeded,price:199}).suggestedRevision,null);
  const unknown=architectBudgetOpportunity({...seeded,price:NaN});
  assert.equal(unknown.status,"unknown");
  assert.equal(unknown.suggestedRevision,null);
});
test("warning text and revision length are bounded and unknown mechanics remain claims, not gates", () => {
  const x=architectBudgetOpportunity({...seeded,functionalReview:{
    warnings:Array(10).fill({code:"unobserved-expensive-followups",explanation:"X".repeat(500)}),
    manaPolish:{suggestions:[]}
  }});
  assert.ok(x.suggestedRevision.length < 2000);
  assert.equal(x.observedGaps.length,1);
  assert.match(x.suggestedRevision,/NOT a spending target/);
});
