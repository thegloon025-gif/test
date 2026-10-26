import test from "node:test";
import assert from "node:assert/strict";
import { architectResultPresentation } from "../public/architectResult.mjs";
for (const x of [
  { valid: false, issues: ["Expected 100 cards"] },
  {
    code: "timed_out",
    valid: false,
    response: {
      textReceived: false,
      charactersReceived: 0,
      charactersCaptured: 0,
    },
  },
  {
    valid: false,
    code: "cancelled",
    draft: { text: "1 Sol Ring", unvalidated: true },
  },
  { valid: false, code: "empty_response" },
  {
    valid: false,
    code: "validation_failed",
    draft: { text: "{}", unvalidated: true },
  },
  {},
  { valid: true, mode: "builder" },
  { valid: true, mode: "upgrader" },
])
  test(
    "failed/malformed result preserves useful editor draft " +
      JSON.stringify(x),
    () => {
      const before = "1 Useful commander *CMDR*\n99 Wastes",
        r = architectResultPresentation(x, before);
      assert.equal(r.valid, false);
      assert.equal(r.nextText, before);
      assert.match(r.message, /preserved/);
      assert.notEqual(r.nextText, "{}");
      assert.notEqual(r.nextText, undefined);
    },
  );
test("timeout/cancel/no-output messages and unvalidated partial are explicit", () => {
  const timeout = architectResultPresentation({
    code: "timed_out",
    response: { textReceived: false },
  });
  assert.match(timeout.message, /not a user cancellation/);
  assert.match(timeout.message, /No response text/);
  const cancel = architectResultPresentation({
    code: "cancelled",
    draft: { text: "<script>untrusted</script>", unvalidated: true },
    response: {
      textReceived: true,
      charactersReceived: 26,
      charactersCaptured: 26,
    },
  });
  assert.match(cancel.message, /cancelled by Cancel/);
  assert.match(cancel.message, /UNVALIDATED/);
  assert.equal(cancel.valid, false);
  assert.equal(cancel.nextText, "");
  assert.equal(cancel.draft, "<script>untrusted</script>");
});
test("only explicit valid complete-shaped local results replace the editor", () => {
  const b = architectResultPresentation({
    valid: true,
    mode: "builder",
    deck: "validated by local gate",
  });
  assert.equal(JSON.parse(b.nextText).deck, "validated by local gate");
  const u = architectResultPresentation({
    valid: true,
    mode: "upgrader",
    packages: [{ cuts: ["A"], adds: ["B"] }],
  });
  assert.equal(JSON.parse(u.nextText).packages.length, 1);
});
