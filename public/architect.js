import {renderArchitectLab} from "./architect-lab.js";
import {postWithProgress} from './progress.js';
import {budgetSettings} from './app.js';

const $ = (id) => document.getElementById(id);
let csrf = null,
  validated = null,
  rawResult = null,
  revision = 0, running = false, canRequest = false, labResult = null;
const bracketResults = new Map();
const panel = document.createElement("section");
panel.className = "panel";
panel.id = "chatgpt-architect";
panel.innerHTML = `<h2>Generative AI Architect</h2>
<label>Playstyle<select id="ai-playstyle"><option value="">Use the commander’s natural plan</option><option>Balanced midrange</option><option>Synergy and value</option><option>Focused combo</option><option>Combat pressure</option><option>Interaction and control</option></select></label>
<label>Preferences<textarea id="ai-preferences" rows="2" maxlength="1500"></textarea></label>
<label>Exclude strategies<textarea id="ai-exclusions" rows="2" maxlength="2000"></textarea></label>
<label id="ai-builder-bracket-field" hidden>Bracket to inspect or import<select id="ai-builder-bracket"><option value="3">Bracket 3</option><option value="4">Bracket 4</option></select></label>
<label><input id="ai-auto-pass" type="checkbox"> Automatically request one AI revision after simulating the first deck</label>
<button id="ai-run" type="button" class="primary" disabled>Generate with AI Architect</button>
<button id="ai-cancel" type="button">Cancel AI job</button>
<p id="ai-message" role="status"></p><div id="ai-bracket-results" class="architect-actions"></div>
<section id="ai-card-review" class="discovery-box" aria-label="Card quality review" hidden></section>
<section id="ai-budget-optimization" class="discovery-box" aria-label="Budget optimization" hidden></section>
<details id="ai-connection"><summary>Connect ChatGPT and review usage settings</summary>
<p>Connected generation uses eligible included ChatGPT plan allowance. Each bracket is a separate request.</p>
<label><input id="ai-authorize" type="checkbox"> I authorize eligible included ChatGPT-plan use.</label>
<button id="ai-connect" type="button">Sign in with ChatGPT</button>
<button id="ai-cancel-sign-in" type="button" hidden>Cancel sign-in</button>
<p id="ai-sign-in-status" role="status"></p><p id="ai-sign-in-link-row" hidden><a id="ai-sign-in-link" target="_blank" rel="noopener noreferrer">Open ChatGPT sign-in</a></p>
<details id="ai-setup"><summary>Sign-in setup on Windows</summary><p>Install the official DevKit from this app’s folder with <code>node tools/install-chatgpt-devkit.mjs</code>. Use Node.js 22.12 or newer, Git and npm. Restart CommanderOracle after installation.</p></details>
<button id="ai-models" type="button">Discover eligible models</button> <button id="ai-disconnect" type="button">Disconnect</button>
<label>Model<select id="ai-model"><option value="">Discover models after sign-in</option></select></label>
<p>Save a weekly CommanderOracle app limit below 100% and review whether app credit use is allowed. <a href="https://chatgpt.com/settings/usage" target="_blank" rel="noopener noreferrer">ChatGPT usage settings</a></p>
<label><input id="ai-settings" type="checkbox"> I saved and verified the weekly app limit.</label>
<label><input id="ai-credits" type="checkbox"> I reviewed credit settings and disabled app credit use where available.</label>
<div class="field-row"><label>Weekly app limit (%)<input id="ai-weekly" type="number" min="1" max="99" value="25"></label><label>Daily local request maximum<input id="ai-daily" type="number" min="1" max="10" value="3"></label></div>
<button id="ai-enable" type="button">Confirm and enable connected AI</button> <button id="ai-disable" type="button">Disable connected AI</button>
<p id="ai-status" role="status"></p></details>
<details id="ai-manual"><summary>Use a manual prompt or import a list</summary>
<button id="ai-copy" type="button">Copy AI deckbuilding request</button>
<label>Manual prompt<textarea id="ai-prompt" rows="5" readonly></textarea></label>
<label>Decklist or Architect result<textarea id="ai-result" rows="8"></textarea></label>
<label><input id="ai-optimize-import" type="checkbox"> Look for upgrades within the budget after validating this list</label>
<button id="ai-import" type="button">Validate imported deck or result</button>
</details>
<details id="ai-advanced"><summary>Advanced Architect options</summary>
<label>Task<select id="ai-mode"><option value="builder">Deck Builder</option><option value="upgrader">Experimental Deck Upgrader</option></select></label>
<label>Exact commander name (optional override)<input id="ai-name" type="text"></label>
<label>Strategic revision request<textarea id="ai-revision" rows="2" maxlength="2000"></textarea></label>
<button id="ai-review" type="button" disabled>Review packages in Experimental Upgrader</button>
<div id="ai-functional-review" style="white-space:pre-wrap"></div><div id="ai-budget-review"></div><div id="ai-mana-polish"></div>
<details><summary>Local validation evidence</summary><pre id="ai-evidence"></pre></details>
<details><summary>Local usage history</summary><pre id="ai-history"></pre></details></details>
<section class="architect-lab">
<h3>Deck analysis and comparison</h3>
<div class="field-row"><label>Simulation trials<select id="ai-trials"><option>100</option><option>500</option><option selected>1000</option></select></label>
<label>Random seed<input id="ai-seed" value="architect-v1" maxlength="100"></label></div>
<label>Second decklist for comparison<textarea id="ai-comparison" rows="4" placeholder="Optional. Mark its commander with *CMDR*."></textarea></label>
<div class="architect-actions"><button id="ai-simulate" type="button" disabled>Run simulation</button>
<button id="ai-upgrade-pass" type="button" disabled>Request AI upgrade pass</button>
<button id="ai-download" type="button" disabled>Export validated deck TXT</button></div>
<p id="ai-lab-status" role="status"></p><div id="ai-lab-results"></div>
</section>`;
$("architect-main").append(panel);
function architectBracket() {
  return Number($("bracket").value === "3+4" ? $("ai-builder-bracket").value : $("bracket").value);
}
function updateArchitectBracket() {
  $("ai-builder-bracket-field").hidden = $("bracket").value !== "3+4" || $("ai-mode").value !== "builder";
}
$("bracket").addEventListener("change", updateArchitectBracket);
$("ai-mode").addEventListener("change", updateArchitectBracket);
updateArchitectBracket();
async function status() {
  const r = await fetch("/api/architect/status"),
    x = await r.json();
  csrf = x.csrf;
  $("ai-status").textContent =
    `Authentication: ${x.auth?.status || "unavailable"}; direct plan permission: ${x.auth?.sharing ? "granted" : "not available"}. Model: ${x.selectedModel || "none"}. AI ${x.enabled ? "enabled" : "disabled"}. ${x.requestsToday ?? 0}/${x.dailyLimit ?? 3} local requests today (UTC). Account usage availability: unknown. ${x.stopped ? "Stopped: " + x.stopped.code + ". " : ""}${x.error?.message || ""}`;
  $("ai-run").disabled =
    running || !x.enabled ||
    x.active ||
    x.connecting ||
    !$("ai-authorize").checked ||
    !$("ai-settings").checked ||
    !$("ai-credits").checked ||
    Number($("ai-weekly").value) >= 100;
  canRequest = !$("ai-run").disabled;
  $("ai-upgrade-pass").disabled = !canRequest || !labResult || labResult.original.bracketIssue || !validated?.valid;
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
    preferences: [$("ai-playstyle").value, $("ai-preferences").value].filter(Boolean).join(". "),
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
        ...budgetSettings(architectBracket()),
        bracket: architectBracket(),
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
      $("up-bracket").value = String(architectBracket());
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

function renderCardReview(report) {
  const root = $("ai-card-review");
  root.replaceChildren();
  root.hidden = !report;
  if (!report) return;

  const labels = {
    illegal: "Illegal",
    uncastable: "Casting requirement unsupported",
    "weak-synergy": "Weak fit",
    situational: "Situational or unverified",
    strong: "Supported role",
  };
  const heading = document.createElement("h3");
  heading.textContent = "Card quality review";
  const summary = document.createElement("p");
  const findings = report.counts.illegal + report.counts.uncastable + report.counts["weak-synergy"];
  summary.textContent = `Reviewed ${report.checked} cards. ${report.counts.strong} with supported roles, ` +
    `${report.counts.situational} situational or unverified, ${findings} unresolved findings.` +
    (report.corrected ? ` Resolved ${report.corrected} draft findings.` : "");
  root.append(heading, summary);

  function addEntries(parent, title, entries) {
    const details = document.createElement("details");
    const caption = document.createElement("summary");
    caption.textContent = title;
    const list = document.createElement("ul");
    for (const row of entries) {
      const item = document.createElement("li");
      const name = document.createElement("strong");
      name.textContent = (row.quantity > 1 ? `${row.quantity} × ` : "") + row.card;
      const evidence = [...new Set([...row.reasons, ...row.casting, ...row.activation])];
      const jobs = row.jobs.length ? ` (${row.jobs.join(", ")})` : "";
      item.append(name, ` · ${labels[row.status]}${jobs}. ${evidence.join(" ")}`);
      list.append(item);
    }
    details.append(caption, list);
    parent.append(details);
  }
  if (report.initialFindings?.length)
    addEntries(root, "Draft findings", report.initialFindings);
  const order = Object.keys(labels);
  const entries = report.entries.slice().sort((a,b) =>
    order.indexOf(a.status)-order.indexOf(b.status) || a.card.localeCompare(b.card));
  addEntries(root, "Final card-by-card review", entries);
}

function renderBudgetOptimization(report) {
  const root = $("ai-budget-optimization");
  root.replaceChildren();
  root.hidden = !report;
  if (!report) return;

  const currency = new Intl.NumberFormat("en", { style: "currency", currency: "EUR" });
  const euros = value => currency.format(value);
  const heading = document.createElement("h3");
  heading.textContent = "Budget optimization";
  const totals = document.createElement("dl");
  totals.className = "architect-budget-totals";
  const open=report.ceilingEUR===null;
  for (const [label, amount] of open?[
    ["Budget", "Open budget"], ["Final estimated price", euros(report.finalEUR)],
  ]:[
    ["Budget ceiling", euros(report.ceilingEUR)], ["Final estimated price", euros(report.finalEUR)],
    ["Remaining budget", euros(report.remainingEUR)],
  ]) {
    const group = document.createElement("div");
    const term = document.createElement("dt"), value = document.createElement("dd");
    term.textContent = label;
    value.textContent = amount;
    group.append(term, value);
    totals.append(group);
  }
  const summary = document.createElement("p");
  const cardCount=report.initialCards===99?" (99 cards)":"";
  summary.textContent = `Initial deck ${euros(report.initialEUR)}${cardCount}. ` +
    (open?"":`${report.utilizationPercent}% of the ceiling used. The ${report.targetPercent.join("–")}% range applies when upgrades improve the deck. `) +
    report.stopReason;
  root.append(heading, totals, summary);

  const accepted = document.createElement("h4");
  accepted.textContent = `Accepted changes (${report.accepted.length})`;
  root.append(accepted);
  const describe = row => (row.cuts.length?`${row.cuts.join(" + ")} → ${row.adds.join(" + ")}`:`Added ${row.adds.join(" + ")}`)+`. ${row.reason}`;
  if (report.accepted.length) {
    const list = document.createElement("ol");
    for (const row of report.accepted) {
      const entry = document.createElement("li");
      entry.textContent = `${describe(row)} Updated deck ${euros(row.priceEUR)}.`;
      if(row.steps?.length){
        const steps=document.createElement("ul");
        for(const step of row.steps){
          const item=document.createElement("li");
          item.textContent=describe(step);
          steps.append(item);
        }
        entry.append(steps);
      }
      list.append(entry);
    }
    root.append(list);
  }

  const details = document.createElement("details");
  const caption = document.createElement("summary");
  caption.textContent = `Changes considered (${report.considered.length})`;
  details.append(caption);
  const list = document.createElement("ul");
  for (const row of [...report.considered].sort((a, b) => a.round - b.round || a.status.localeCompare(b.status))) {
    const entry = document.createElement("li");
    const delta = `${row.changeEUR > 0 ? "+" : ""}${euros(row.changeEUR)}`;
    entry.textContent = `Pass ${row.round} · ${row.status} · ${delta} · ${describe(row)}`;
    list.append(entry);
  }
  details.append(list);
  root.append(details);
}

function show(x) {
  validated = x.valid ? x : null;
  $("ai-review").disabled = !x.valid || x.mode !== "upgrader";
  $("ai-download").disabled = !x.valid || x.mode !== "builder";
  $("ai-simulate").disabled = $("ai-download").disabled;
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
  renderCardReview(x.cardQuality);
  renderBudgetOptimization(x.budgetOptimization);
  renderManaPolish(x, x.ceiling===null?null:review?.manaPolish);
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
$("ai-connect").onclick = async () => {
  const message = $("ai-sign-in-status"), link = $("ai-sign-in-link");
  if (!$("ai-authorize").checked) {
    message.textContent = "Check the included-plan authorization box to start sign-in.";
    return;
  }
  const button = $("ai-connect"), cancel = $("ai-cancel-sign-in");
  button.disabled = true;
  cancel.hidden = false;
  $("ai-sign-in-link-row").hidden = true;
  message.textContent = "Preparing ChatGPT sign-in…";
  let popup;
  try {
    popup = window.open("about:blank", "_blank");
    if (popup) {
      popup.opener = null;
      popup.document.title = "ChatGPT sign-in";
      popup.document.body.textContent = "Preparing ChatGPT sign-in…";
    }
  } catch {/* A blocked popup can use the visible link. */}
  try {
    if (!csrf) await status();
    const result = await postWithProgress("/api/architect/connect", {directUseAuthorized:true}, event => {
      if (event.phase !== "authorize") return;
      link.href = event.url;
      $("ai-sign-in-link-row").hidden = false;
      message.textContent = "Complete sign-in in the ChatGPT tab. Use the link below if it did not open.";
      if (popup && !popup.closed) {
        try {popup.location.replace(event.url);} catch {/* The visible link remains available. */}
      }
    }, {"x-commander-ai-session":csrf});
    message.textContent = result.auth.sharing
      ? "Signed in. Discover eligible models, then confirm your account settings."
      : "ChatGPT sign-in finished. Direct plan access is unavailable for this connection.";
  } catch (err) {
    message.textContent = err.message;
    if (/SDK|credential storage/i.test(err.message)) $("ai-setup").open = true;
  } finally {
    if (popup && !popup.closed) popup.close();
    $("ai-sign-in-link-row").hidden = true;
    link.removeAttribute("href");
    cancel.hidden = true;
    button.disabled = false;
    await status().catch(() => {});
  }
};
$("ai-cancel-sign-in").onclick = async () => {
  try {await post("cancel", {});}
  catch (err) {$("ai-sign-in-status").textContent = err.message;}
};
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
function simulationInput(deck, settings) {
  const second=$("ai-comparison").value.trim();
  const partner=second?null:[...bracketResults.values()].find(row=>row.settings.bracket!==settings.bracket);
  return {...settings, text:deck.deck, trials:Number($("ai-trials").value), seed:$("ai-seed").value,
    comparison:second||partner?.deck.deck||"",comparisonBracket:partner?.settings.bracket};
}
let analysisSequence=0, buildSettings;
async function runLab(deck, settings, {suggest=false, proposed}={}) {
  const seq=++analysisSequence, rev=revision;
  const current=()=>validated===deck&&seq===analysisSequence&&rev===revision;
  $("ai-lab-status").textContent = "Matching Spellbook lines and simulating the deck…";
  $("ai-simulate").disabled = true;
  $("ai-download").disabled = true;
  $("ai-upgrade-pass").disabled = true;
  try {
    const outcome = await post("simulate", {...simulationInput(deck,settings),suggest,proposed});
    if (!current()) return;
    labResult=outcome;
    renderArchitectLab($("ai-lab-results"),outcome,candidate => action(async()=>{
      if(!current()||!outcome.upgrade?.eligible||candidate!==outcome.upgrade.deck)return;
      const verified=await post("import",{...settings,result:candidate});
      if(!current())return;
      if(!verified.valid)throw Error((verified.issues||["Candidate could not be validated."]).join(" | "));
      await showBuilt(verified,settings,{suggest:false});
    }));
    $("ai-lab-status").textContent = outcome.original.bracketIssue?"This Bracket 3 deck exceeds the Game Changer allowance.":"Analysis ready.";
  } catch (error) {
    if (current()) $("ai-lab-status").textContent = error.message;
  } finally {
    if (current()) {
      $("ai-simulate").disabled = false;
      $("ai-download").disabled = !!labResult?.original.bracketIssue;
      $("ai-upgrade-pass").disabled = !canRequest || !labResult;
    }
  }
}
async function showBuilt(deck,settings,{suggest=true}={}){
  buildSettings=settings;
  labResult=null;
  $("ai-result").value=JSON.stringify({deck:deck.deck,strategy:deck.strategy});
  $("ai-lab-results").replaceChildren();
  show(deck);
  $("ai-message").textContent="Bracket "+settings.bracket+" · validated 100-card deck · €"+deck.price.toFixed(2);
  if($("bracket").value==="3+4")$("ai-builder-bracket").value=String(settings.bracket);
  await runLab(deck,settings,{suggest});
}
$("ai-simulate").onclick = () => {
  if(validated?.valid && validated.mode==="builder")return runLab(validated,buildSettings,{suggest:true});
};
async function requestRevision(){
  if(!labResult || labResult.original.bracketIssue || !validated?.valid)return;
  const original=validated, settings=buildSettings, rev=revision;
  const evidence=labResult.original.result;
  const findings=labResult.observations.join(" ") || "Review opportunities for consistency while retaining the existing plan.";
  $("ai-upgrade-pass").disabled=true;
  $("ai-lab-status").textContent="ChatGPT is preparing an optional revision…";
  try {
    const postCast=Number.isFinite(evidence.averageManaAfterCommander)?" Mana after casting the commander averaged "+evidence.averageManaAfterCommander+".":"";
    const revisionRequest="Suggest up to three swaps with a material improvement in the deck's actual strategy. Preserve the theme, core engines, early ramp, interaction, commander payoff and budget settings. Return the complete deck and keep the original cards if a worthwhile change is uncertain. In "
      +evidence.trials+" goldfish trials the commander was cast by turn "+evidence.turnLimit+" in "+evidence.commanderCastPct
      +"% of games, early ramp was played by turn three in "+evidence.rampPlayedByTurnThreePct+"%, and turn-four mana averaged "+evidence.turns[3].mana+". "+postCast+" "+findings;
    const x=await post("run",{...settings,revisionRequest,revisionDeck:original.deck});
    if(validated!==original||rev!==revision)return;
    if(!x.valid){$("ai-lab-status").textContent=(x.issues||["AI revision failed validation."]).join(" | ");return;}
    await runLab(original,settings,{proposed:x.deck});
  } catch(err) {
    if(validated===original&&rev===revision)$("ai-lab-status").textContent=err.message;
  }
}
$("ai-upgrade-pass").onclick = () => action(async () => {
  if(running)return;
  running=true;
  $("ai-run").disabled=true;
  try{await requestRevision();}
  finally{running=false;}
});
$("ai-run").onclick = () => action(async () => {
  if(running)return;
  const p=params(), rev=revision, autoPass=$("ai-auto-pass").checked;
  const brackets=p.mode==="builder"&&$("bracket").value==="3+4"&&!p.revisionDeck?[3,4]:[p.bracket];
  running=true;
  $("ai-run").disabled=true;
  $("ai-upgrade-pass").disabled=true;
  bracketResults.clear();
  $("ai-bracket-results").replaceChildren();
  const errors=[];
  try {
    for(const bracket of brackets){
      $("ai-message").textContent=p.mode==="builder"&&!p.revisionRequest
        ? "Generating Bracket "+bracket+" with ChatGPT and checking for upgrades…"
        : "Preparing the Architect result with ChatGPT…";
      const settings={...p,bracket};
      let x;
      try {x=await post("run",settings);}
      catch(err){errors.push("B"+bracket+" · "+err.message);break;}
      if(rev!==revision){$("ai-message").textContent="Inputs changed during generation.";return;}
      if(!x.valid){
        if(x.unvalidatedDraft){$("ai-result").value=x.unvalidatedDraft;$("ai-manual").open=true;}
        errors.push("B"+bracket+" · "+(x.issues||["Validation failed."]).join(" | "));
        continue;
      }
      if(x.mode==="upgrader"){show(x);return;}
      bracketResults.set(bracket,{deck:x,settings});
    }
    if(brackets.length>1){
      for(const [bracket,{deck}] of bracketResults){
        const button=document.createElement("button");
        button.type="button";
        button.textContent="Bracket "+bracket+" · €"+deck.price.toFixed(2);
        button.onclick=()=>{const row=bracketResults.get(bracket);return showBuilt(row.deck,row.settings);};
        $("ai-bracket-results").append(button);
      }
    }
    const first=bracketResults.values().next().value;
    const pending=first?showBuilt(first.deck,first.settings):null;
    if(errors.length)$("ai-message").textContent=[first?$("ai-message").textContent:"",...errors].filter(Boolean).join(" · ");
    await pending;
    if(autoPass&&first&&rev===revision&&validated===first.deck)await requestRevision();
  } finally {running=false;}
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
    const settings=params();
    const x = await post("import", { ...settings, result: rawResult, optimizeBudget: $("ai-optimize-import").checked });
    if (rev === revision) {
      if(x.valid&&x.mode==="builder")await showBuilt(x,settings);
      else show(x);
    }
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
    if (!validated || validated.mode !== "builder" || labResult?.original.bracketIssue) return;
    const x = await post("import", {
      ...buildSettings,
      result: JSON.stringify({ deck: validated.deck }),
    });
    if (!x.valid){show(x);return;}
    const url = URL.createObjectURL(
        new Blob([x.deck + "\n"], { type: "text/plain" }),
      ),
      a = document.createElement("a");
    a.href = url;
    a.download = "CommanderOracle-Architect-B"+buildSettings.bracket+".txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
document.addEventListener("input", (event) => {
  if (
    event.target.matches("input,textarea,select") &&
    !["ai-prompt", "ai-evidence", "ai-trials", "ai-seed", "ai-comparison", "ai-builder-bracket", "ai-optimize-import"].includes(event.target.id)
  ) {
    revision++;
    validated = null;
    labResult = null;
    bracketResults.clear();
    $("ai-bracket-results").replaceChildren();
    renderCardReview(null);
    renderBudgetOptimization(null);
    $("ai-lab-results").replaceChildren();
    $("ai-lab-status").textContent="";
    $("ai-simulate").disabled=true;
    $("ai-upgrade-pass").disabled=true;
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
