const $ = (id) => document.getElementById(id);
let csrf = null,
  validated = null,
  rawResult = null,
  revision = 0;
const panel = document.createElement("section");
panel.className = "panel";
panel.id = "chatgpt-architect";
panel.innerHTML = `<details><summary><strong>Experimental ChatGPT AI Architect</strong></summary><h2>ChatGPT plan-only mode — no paid API fallback</h2><p>Optional and off by default. Included-plan eligibility and account limits apply. No API key is accepted. Local/manual features remain available without sign-in.</p><p><a href="https://chatgpt.com/settings/usage" target="_blank" rel="noopener noreferrer">ChatGPT Settings → Usage</a></p><ol><li>After sign-in, open Settings → Usage.</li><li>Disable “Allow apps to use credits” if available.</li><li>Find CommanderOracle under App limits, set its weekly limit below 100% (preferably 25%), save and verify.</li></ol><p>We cannot read or modify those account settings. Your confirmation is not verified billing telemetry, proof of remaining allowance or an unlimited-free-AI guarantee.</p><label><input id="ai-authorize" type="checkbox"> I explicitly authorize use of eligible included ChatGPT-plan allowance.</label><button id="ai-connect" type="button">Sign in with ChatGPT</button> <button id="ai-models" type="button">Discover eligible models</button> <button id="ai-disconnect" type="button">Disconnect</button><label>Eligible model<select id="ai-model"><option value="">Discover models after sign-in</option></select></label><label><input id="ai-settings" type="checkbox"> I saved and verified the account settings above, including this app’s below-100% weekly limit.</label><label><input id="ai-credits" type="checkbox"> I reviewed credit settings and disabled app credit use where available.</label><label>Weekly app limit I set (%)<input id="ai-weekly" type="number" min="1" max="99" value="25"></label><label>Local daily AI-request maximum (UTC day, including repairs)<input id="ai-daily" type="number" min="1" max="10" value="3"></label><button id="ai-enable" type="button">Confirm and enable plan-only AI</button> <button id="ai-disable" type="button">Disable AI</button><p id="ai-status" role="status"></p><label>Task<select id="ai-mode"><option value="builder">Deck Builder — uses commander/budget/bracket above</option><option value="upgrader">Deck Upgrader — uses original list and purchase settings in Upgrader</option></select></label><label>Exact commander name (Builder; blank uses selected commander above)<input id="ai-name" type="text"></label><label>Preferences<textarea id="ai-preferences" rows="2" maxlength="2000"></textarea></label><label>Excluded strategies (advisory, not mechanically certified)<textarea id="ai-exclusions" rows="2" maxlength="2000"></textarea></label><label>Optional strategic revision request (Builder; requires a validated deck below)<textarea id="ai-revision" rows="2" maxlength="2000"></textarea></label><button id="ai-run" type="button" disabled>Build / analyze with ChatGPT</button> <button id="ai-cancel" type="button">Cancel pending sign-in or AI job</button><p>Clicking the AI job button sends the current deck, preferences and bounded verified catalog context to OpenAI. No inference on startup, form changes, importing or viewing a deck. Builder: one request per click, no automatic repairs. Upgrader: at most two hard-validation repairs. Functional warnings never cause another request. Prompt size, response size and time are bounded; local controls do not replace account billing controls.</p><hr><h3>Manual copy/import bridge — no API call by CommanderOracle</h3><p>Copy the structured request into your ChatGPT conversation, then import its JSON/deck result here. Your ChatGPT plan’s own limits still apply.</p><button id="ai-copy" type="button">Copy AI deckbuilding request</button><label>Verified structured request<textarea id="ai-prompt" rows="6" readonly></textarea></label><label>Paste ChatGPT result<textarea id="ai-result" rows="8"></textarea></label><button id="ai-import" type="button">Import ChatGPT result</button><button id="ai-review" type="button" disabled>Review packages in Experimental Upgrader</button><button id="ai-download" type="button" disabled>Revalidate and download AI deck</button><p id="ai-message" role="status"></p><div id="ai-functional-review" role="status" style="white-space: pre-wrap"></div><div id="ai-budget-review"></div><div id="ai-mana-polish"></div><details><summary>Full local evidence (ledger, dependencies and sampled observations)</summary><pre id="ai-evidence"></pre></details><details><summary>Local usage history (no prompts or credentials)</summary><pre id="ai-history"></pre></details></details>`;
document.querySelector("main").append(panel);
async function status() {
  const r = await fetch("/api/architect/status"),
    x = await r.json();
  csrf = x.csrf;
  $("ai-status").textContent =
    `Authentication: ${x.auth?.status || "unavailable"}; direct plan permission: ${x.auth?.sharing ? "granted" : "not available"}. Model: ${x.selectedModel || "none"}. AI ${x.enabled ? "enabled" : "disabled"}. ${x.requestsToday ?? 0}/${x.dailyLimit ?? 3} local requests today (UTC). Account usage availability: unknown. ${x.stopped ? "Stopped: " + x.stopped.code + ". " : ""}${x.error?.message || ""}`;
  $("ai-run").disabled =
    !x.enabled ||
    x.active ||
    x.connecting ||
    !$("ai-authorize").checked ||
    !$("ai-settings").checked ||
    !$("ai-credits").checked ||
    Number($("ai-weekly").value) >= 100;
  $("ai-history").textContent = JSON.stringify(x.history || [], null, 2);
  if (x.models?.length) {
    const selected = $("ai-model").value;
    $("ai-model").replaceChildren(
      ...x.models.map((m) => new Option(m.displayName, m.slug)),
    );
    $("ai-model").value = x.models.some((m) => m.slug === selected)
      ? selected
      : x.selectedModel || x.models[0].slug;
  }
  return x;
}
async function post(action, payload) {
  if (!csrf) await status();
  const response = await fetch("/api/architect/" + action, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-commander-ai-session": csrf,
      },
      body: JSON.stringify(payload),
    }),
    x = await response.json();
  if (!response.ok) throw Error(x.error || "Architect operation failed");
  return x;
}
const names = (id) =>
  $(id)
    ?.value.split("\n")
    .map((s) => s.trim())
    .filter(Boolean) || [];
function params() {
  const common = {
    mode: $("ai-mode").value,
    preferences: $("ai-preferences").value,
    excludedStrategies: $("ai-exclusions").value,
  };
  return common.mode === "builder"
    ? {
        ...common,
        ...($("ai-revision").value.trim()
          ? {
              revisionRequest: $("ai-revision").value.trim(),
              revisionDeck: $("ai-result").value,
            }
          : {}),
        commanderName:
          $("ai-name").value.trim() || $("commander-name").textContent,
        budget: Number($("budget").value),
        budgetTolerance: $("budget-leeway").checked ? 4 : 0,
        bracket: Number($("bracket").value),
        basicLandsOwned: $("basics-owned").checked,
        pricingMode: $("pricing-mode").value,
      }
    : {
        ...common,
        text: $("up-text").value,
        commanderId: $("up-commander").value || null,
        budget: Number($("up-budget").value),
        budgetTolerance: $("up-tolerance").checked ? 4 : 0,
        bracket: Number($("up-bracket").value),
        pricingMode: $("up-pricing").value,
        owned: names("up-owned"),
        locked: names("up-locked"),
        resaleEnabled: $("up-resale").checked,
        resaleCredit: Number($("up-credit").value),
      };
}
function renderManaPolish(x, audit) {
  const root = $("ai-mana-polish");
  root.replaceChildren();
  if (!x.valid || x.mode !== "builder" || !audit) return;
  const details = document.createElement("details");
  const heading = document.createElement("summary");
  heading.textContent = "Mana reliability and optional land-swap review (no AI call)";
  details.append(heading);
  const summary = document.createElement("p");
  const n = audit.entryCounts || {};
  summary.textContent = String(audit.lands) + " lands; " +
    (n["always-tapped"] || 0) + " forced-tapped, " +
    (n["conditional-tapped"] || 0) + " conditional, " +
    (n["delayed-fetch"] || 0) + " delayed-fetch, " +
    (n["entry-cost-or-unknown"] || 0) + " other entry conditions; " +
    audit.printedTrueColorlessLands + " printed true-C sources. Counts are not turn probabilities or power scores.";
  details.append(summary);
  const note = document.createElement("p");
  note.textContent = audit.advisory + " " + (audit.unavailableSuggestions || "") +
    " Suggestions are budget-bounded single swaps, not confirmed improvements; the existing Upgrader still validates everything.";
  details.append(note);
  for (const swap of audit.suggestions || []) {
    const item = document.createElement("div");
    item.className = "discovery-box";
    const p = document.createElement("p");
    p.textContent = swap.cut + " → " + swap.add +
      " | original " + swap.before + ", replacement " + swap.after +
      " | estimated full-deck €" + swap.proposedFullDeckEUR.toFixed(2) +
      " / €" + swap.ceilingEUR.toFixed(2) + " ceiling. " + swap.caveat;
    item.append(p);
    const b = document.createElement("button");
    b.type = "button";
    b.className = "secondary";
    b.textContent = "Review this swap in Upgrader (not accept)";
    b.onclick = () => {
      if (!validated || validated.mode !== "builder" || validated.deck !== x.deck) {
        $("ai-message").textContent = "Inputs changed. Reimport/revalidate the deck before reviewing a swap.";
        return;
      }
      const up = $("experimental-upgrader"), input = $("up-text");
      if (!up || !input) {
        $("ai-message").textContent = "Experimental Upgrader is unavailable.";
        return;
      }
      if (input.value.trim() && input.value.trim() !== x.deck &&
          !window.confirm("Replace the Upgrader input with this validated Architect deck? The old Upgrader input should be backed up first.")) return;
      input.value = x.deck;
      $("up-bracket").value = String($("bracket").value);
      $("up-pricing").value = $("pricing-mode").value;
      window.dispatchEvent(new CustomEvent("architect-upgrade", {
        detail: { packages: [{ cuts: [swap.cut], adds: [swap.add],
          rationale: "User-selected optional mana-tempo experiment; preserve all hard gates and inspect utility loss." }] }
      }));
      up.querySelector("details").open = true;
      up.scrollIntoView();
    };
    item.append(b);
    details.append(item);
  }
  if (!(audit.suggestions || []).length) {
    const p = document.createElement("p");
    p.textContent = "No verified same-channel, ceiling-safe land replacement found in this bounded local review. No changes made.";
    details.append(p);
  }
  root.append(details);
}

function renderBudgetReview(x) {
  const target = $("ai-budget-review");
  target.replaceChildren();
  const report = x.valid && x.mode === "builder" ? x.budgetOpportunity : null;
  if (!report || report.status !== "advisory-only") return;
  const d = document.createElement("details");
  const h = document.createElement("summary");
  h.textContent = "Optional budget/strategy opportunity review — no extra AI call";
  d.append(h);
  const p = document.createElement("p");
  p.textContent = "Selected-printing deck estimate €" + report.originalEUR.toFixed(2) +
    " / hard ceiling €" + report.ceilingEUR.toFixed(2) +
    "; unspent €" + report.headroomEUR.toFixed(2) +
    ". This is NOT a spending target or a power score.";
  d.append(p);
  const ul = document.createElement("ul");
  for (const gap of (report.observedGaps || []).slice(0, 4)) {
    const li = document.createElement("li");
    li.textContent = gap;
    ul.append(li);
  }
  if (ul.childElementCount) d.append(ul);
  if (report.suggestedRevision) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "secondary";
    b.textContent = "Prepare optional strategic revision (does NOT send)";
    b.onclick = () => {
      if (!validated || validated.deck !== x.deck || !$("ai-result").value.trim()) {
        $("ai-message").textContent = "Revalidate the original AI deck first. Nothing sent.";
        return;
      }
      $("ai-revision").value = report.suggestedRevision.slice(0, 2000);
      $("ai-revision").dispatchEvent(new Event("input", { bubbles: true }));
      $("ai-message").textContent = "Revision text prepared. Inspect or edit it; only clicking Build / analyze with ChatGPT sends another plan request and consumes another local allowance attempt. Original deck text remains available.";
      $("ai-revision").scrollIntoView({block:"center"});
    };
    d.append(b);
  } else {
    const info = document.createElement("p");
    info.textContent = "No grounded reason here to spend more merely for budget utilization.";
    d.append(info);
  }
  target.append(d);
}

function show(x) {
  validated = x.valid ? x : null;
  $("ai-review").disabled = !x.valid || x.mode !== "upgrader";
  $("ai-download").disabled = !x.valid || x.mode !== "builder";
  $("ai-message").textContent = x.valid
    ? x.warning ||
      "Locally validated advisory result. No changes accepted automatically."
    : (x.issues || ["Validation failed"]).join("\n");
  const review = x.functionalReview;
  $("ai-functional-review").textContent = review
    ? [
        "Read-only functional review — no score or automatic revision",
        ...review.warnings.map(
          (w) => `[${w.status}] ${w.code}: ${w.explanation}`,
        ),
        ...(review.goldfish || []).map(
          (g) =>
            `${g.policy}: commander deployed in ${g.commanderByTurn8}/${g.trials} fixed model trials by turn 8; unsupported native events remain unknown. Not a win rate.`,
        ),
      ].join("\n")
    : "";
  renderBudgetReview(x);
  renderManaPolish(x, review?.manaPolish);
  $("ai-evidence").textContent = JSON.stringify(x, null, 2);
}
async function action(fn) {
  try {
    await fn();
  } catch (e) {
    $("ai-message").textContent = e.message;
  } finally {
    await status().catch(() => {});
  }
}
$("ai-connect").onclick = () =>
  action(async () => {
    await post("connect", { directUseAuthorized: $("ai-authorize").checked });
    $("ai-message").textContent =
      "Sign-in completed. Discover models, then confirm saved account settings before enabling requests.";
  });
$("ai-models").onclick = () =>
  action(async () => {
    const x = await post("models", {});
    $("ai-model").replaceChildren(
      ...x.models.map((m) => new Option(m.displayName, m.slug)),
    );
  });
$("ai-enable").onclick = () =>
  action(() =>
    post("configure", {
      enabled: true,
      directUseAuthorized: $("ai-authorize").checked,
      accountSettingsConfirmed: $("ai-settings").checked,
      creditsSettingReviewed: $("ai-credits").checked,
      weeklyLimitPercent: Number($("ai-weekly").value),
      dailyLimit: Number($("ai-daily").value),
      model: $("ai-model").value,
    }),
  );
$("ai-disable").onclick = () =>
  action(() => post("configure", { enabled: false }));
$("ai-disconnect").onclick = () => action(() => post("disconnect", {}));
$("ai-cancel").onclick = () => action(() => post("cancel", {}));
$("ai-run").onclick = () =>
  action(async () => {
    const p = params(),
      rev = revision;
    $("ai-run").disabled = true;
    $("ai-message").textContent = "Explicit plan-only job running…";
    const timer = setInterval(() => status().catch(() => {}), 1500);
    try {
      const x = await post("run", p);
      if (rev !== revision || JSON.stringify(params()) !== JSON.stringify(p)) {
        $("ai-message").textContent =
          "Inputs changed; result discarded. No automatic retry.";
        return;
      }
      if (!x.valid) {
        if (typeof x.unvalidatedDraft === "string" && x.unvalidatedDraft.trim()) {
          rawResult = x.unvalidatedDraft;
          $("ai-result").value = rawResult;
        }
        show(x);
        $("ai-message").textContent = (x.issues || ["Invalid deck"]).join("; ") +
          ". The model's completed but unvalidated draft (if any) is retained above; no automatic retry. Do not export without revalidation.";
        return;
      }
      rawResult =
        x.mode === "builder"
          ? JSON.stringify({ deck: x.deck, strategy: x.strategy, budgetOpportunity: x.budgetOpportunity })
          : JSON.stringify({ packages: x.packages });
      $("ai-result").value = rawResult;
      show(x);
    } finally {
      clearInterval(timer);
    }
  });
$("ai-copy").onclick = () =>
  action(async () => {
    const x = await post("request", params());
    $("ai-prompt").value = x.prompt;
    try {
      await navigator.clipboard.writeText(x.prompt);
      $("ai-message").textContent =
        "Copied. Paste into your ChatGPT conversation; CommanderOracle made no AI call.";
    } catch {
      $("ai-message").textContent =
        "Copy the structured request from the box. No AI call was made.";
    }
  });
$("ai-import").onclick = () =>
  action(async () => {
    const rev = revision;
    rawResult = $("ai-result").value;
    const x = await post("import", { ...params(), result: rawResult });
    if (rev === revision) show(x);
  });
$("ai-review").onclick = () => {
  if (!validated || validated.mode !== "upgrader") return;
  window.dispatchEvent(
    new CustomEvent("architect-upgrade", {
      detail: { packages: validated.packages },
    }),
  );
  $("experimental-upgrader").querySelector("details").open = true;
  $("experimental-upgrader").scrollIntoView();
};
$("ai-download").onclick = () =>
  action(async () => {
    if (!validated || validated.mode !== "builder") return;
    const x = await post("import", {
      ...params(),
      result: JSON.stringify({ deck: validated.deck }),
    });
    show(x);
    if (!x.valid) return;
    const url = URL.createObjectURL(
        new Blob([x.deck + "\n"], { type: "text/plain" }),
      ),
      a = document.createElement("a");
    a.href = url;
    a.download = "CommanderOracle-AI-advisory.txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
document.addEventListener("input", (event) => {
  if (
    event.target.matches("input,textarea,select") &&
    !["ai-prompt", "ai-evidence"].includes(event.target.id)
  ) {
    revision++;
    validated = null;
    if (
      [
        "ai-authorize",
        "ai-settings",
        "ai-credits",
        "ai-weekly",
        "ai-model",
        "ai-daily",
      ].includes(event.target.id)
    )
      $("ai-run").disabled = true;
    $("ai-review").disabled = true;
    $("ai-download").disabled = true;
  }
  if (event.target.id === "ai-mode")
    $("ai-copy").textContent =
      $("ai-mode").value === "builder"
        ? "Copy AI deckbuilding request"
        : "Copy AI upgrade request";
});
status().catch((e) => {
  $("ai-status").textContent = e.message;
});
