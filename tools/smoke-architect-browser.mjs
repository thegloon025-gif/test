import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
const lib = await import(process.env.PLAYWRIGHT_MODULE || "playwright"),
  chromium = lib.chromium || lib.default.chromium;
const [base, examples, out] = process.argv.slice(2),
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  }),
  checks = [],
  errors = [];
try {
  const context = await browser.newContext({
      permissions: ["clipboard-read", "clipboard-write"],
    }),
    page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("https://**", (r) => r.abort());
  await page.goto(base);
  await page.locator("#chatgpt-architect summary").first().click();
  assert.equal(await page.locator("#ai-run").isDisabled(), true);
  assert.match(await page.locator("#ai-status").textContent(), /disabled/);
  checks.push("default off, no inference on page load");
  await page.locator("#ai-name").fill("Ulalek, Fused Atrocity");
  let wait = page.waitForResponse((r) =>
    r.url().endsWith("/api/architect/request"),
  );
  await page.locator("#ai-copy").click();
  await wait;
  await page.waitForFunction(
    () => document.getElementById("ai-prompt").value.length > 0,
  );
  assert.match(await page.locator("#ai-prompt").inputValue(), /responseSchema/);
  checks.push("manual verified request copied with no account");
  const deck = await readFile(
    examples + "/ulalek-validated-manual-fixture.txt",
    "utf8",
  );
  await page.locator("#ai-result").fill(JSON.stringify({ deck }));
  wait = page.waitForResponse((r) => r.url().endsWith("/api/architect/import"));
  await page.locator("#ai-import").click();
  await wait;
  await page.waitForFunction(
    () => !document.getElementById("ai-download").disabled,
  );
  const download = page.waitForEvent("download");
  await page.locator("#ai-download").click();
  assert.match((await download).suggestedFilename(), /AI-advisory/);
  checks.push("manual 100-card builder result revalidated on download");
  await page.locator("#experimental-upgrader summary").first().click();
  await page
    .locator("#up-text")
    .fill(
      await readFile(
        examples + "/wilhelt-validated-manual-fixture.txt",
        "utf8",
      ),
    );
  await page.locator("#ai-mode").selectOption("upgrader");
  wait = page.waitForResponse((r) =>
    r.url().endsWith("/api/architect/request"),
  );
  await page.locator("#ai-copy").click();
  const upgradeRequest = await wait;
  assert.equal(upgradeRequest.status(), 200);
  checks.push(
    "manual upgrade request copied with protected-card and cached prerequisite context",
  );
  await page.locator("#ai-result").fill(
    JSON.stringify({
      packages: [{ cuts: ["Village Rites"], adds: ["Vampiric Rites"] }],
    }),
  );
  wait = page.waitForResponse((r) => r.url().endsWith("/api/architect/import"));
  await page.locator("#ai-import").click();
  await wait;
  await page.waitForFunction(
    () => !document.getElementById("ai-review").disabled,
  );
  wait = page.waitForResponse((r) => r.url().endsWith("/api/upgrader/analyze"));
  await page.locator("#ai-review").click();
  await wait;
  await page.waitForFunction(
    () => !document.getElementById("up-analyze").disabled,
  );
  const box = page
    .locator("#up-results .discovery-box")
    .filter({ has: page.locator("h3", { hasText: "Vampiric Rites" }) });
  assert.equal(await box.count(), 1);
  wait = page.waitForResponse((r) => r.url().endsWith("/api/upgrader/analyze"));
  await box
    .getByRole("button", { name: "Accept package", exact: true })
    .click();
  await wait;
  await page.waitForFunction(
    () => !document.getElementById("up-analyze").disabled,
  );
  assert.match(await page.locator("#up-export").inputValue(), /Vampiric Rites/);
  assert.equal(
    (await page.locator("#up-export").inputValue()).split("\n").length,
    100,
  );
  checks.push(
    "manual upgrade JSON transferred for separate user approval and 100-card export",
  );
  wait = page.waitForResponse((r) => r.url().endsWith("/api/upgrader/analyze"));
  await page.locator("#up-reset").click();
  await wait;
  await page.waitForFunction(
    () => !document.getElementById("up-analyze").disabled,
  );
  assert.equal(
    await page.locator("#up-export").inputValue(),
    await page.locator("#up-original").inputValue(),
  );
  checks.push("original unchanged and undo works");
  assert.deepEqual(errors, []);
  await writeFile(
    out,
    JSON.stringify(
      {
        checks,
        pageErrors: errors,
        liveAuthorization:
          "not tested; manual bridge only; no mocked AI responses passed off as live",
      },
      null,
      2,
    ) + "\n",
  );
  console.log(checks);
} finally {
  await browser.close();
}
