/** Pure result presentation. Failed jobs never replace the editable useful draft. */
export function architectResultPresentation(result, currentText = "") {
  const x = result || {},
    builder =
      x.valid === true &&
      x.mode === "builder" &&
      typeof x.deck === "string" &&
      x.deck.trim(),
    upgrader =
      x.valid === true &&
      x.mode === "upgrader" &&
      Array.isArray(x.packages) &&
      x.packages.length > 0;
  const valid = !!(builder || upgrader);
  const nextText = valid
    ? builder
      ? JSON.stringify({ deck: x.deck, strategy: x.strategy })
      : JSON.stringify({ packages: x.packages })
    : currentText;
  const messages = {
    timed_out:
      "Automatic generation deadline expired; this was not a user cancellation.",
    cancelled:
      "Generation was cancelled by Cancel, disconnect or a closed app connection.",
    empty_response: "ChatGPT completed without usable response text.",
    validation_failed: "The response failed local validation.",
    response_too_large: "The response exceeded the local text limit.",
  };
  const draft =
    x.draft?.unvalidated === true && typeof x.draft.text === "string"
      ? x.draft.text.slice(0, 32000)
      : "";
  const response = x.response;
  const receipt = response
    ? response.textReceived
      ? `Response text received: ${response.charactersReceived} characters (${response.charactersCaptured} retained).`
      : "No response text was received. Reasoning or allowance consumption may still have occurred."
    : "";
  const message = valid
    ? [x.warning || "Locally validated advisory result.", receipt]
        .filter(Boolean)
        .join("\n")
    : [
        messages[x.code] || x.error || "No validated deck was returned.",
        ...(Array.isArray(x.issues) ? x.issues : []),
        receipt,
        "Existing result text preserved. Any captured response is UNVALIDATED and may be incomplete; it cannot export without complete local validation. No automatic retry or provider fallback.",
      ]
        .filter(Boolean)
        .join("\n");
  return { valid, nextText, draft, message };
}
