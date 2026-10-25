/** Explicit optional installation; no OAuth or inference. Normal app stays dependency-free. */
import { mkdir, writeFile, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { DEVKIT_REVISION } from "../src/chatgptSdk.mjs";
const root = path.resolve("data/chatgpt-devkit"),
  cache = path.resolve("data/chatgpt-npm-cache");
console.log(
  "Optional official OpenAI DevKit installation for personal noncommercial use. License: https://github.com/openai/sign-in-with-chatgpt-devkit/blob/" +
    DEVKIT_REVISION +
    "/LICENSE",
);
console.log(
  "No account sign-in, AI inference, credits or API-key setup is performed. Existing install directories are never overwritten.",
);
const [major, minor] = process.versions.node.split(".").map(Number);
if (major < 22 || (major === 22 && minor < 12))
  throw Error("Optional SDK requires Node 22.12+.");
await mkdir(path.dirname(root), { recursive: true });
await mkdir(root);
await mkdir(cache, { recursive: true });
async function run(command, args, cwd) {
  await new Promise((resolve, reject) => {
    const executable = command === "npm.cmd" ? process.execPath : command;
    const argv =
      command === "npm.cmd"
        ? [
            path.join(
              path.dirname(process.execPath),
              "node_modules/npm/bin/npm-cli.js",
            ),
            ...args,
          ]
        : args;
    const child = spawn(executable, argv, {
      cwd,
      stdio: "inherit",
      shell: false,
    });
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0
        ? resolve()
        : reject(
            Error(
              "Optional SDK installation failed; manual/local features remain available.",
            ),
          ),
    );
  });
}
await run(
  "git",
  [
    "clone",
    "--no-checkout",
    "https://github.com/openai/sign-in-with-chatgpt-devkit.git",
    ".",
  ],
  root,
);
await run("git", ["checkout", "--detach", DEVKIT_REVISION], root);
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
await run(
  npm,
  [
    "--cache",
    cache,
    "ci",
    "--workspace",
    "@siwc/local",
    "--include-workspace-root",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
  ],
  root,
);
await run(
  npm,
  ["--cache", cache, "run", "build", "--workspace", "@siwc/local"],
  root,
);
const files = [
    "LICENSE",
    "package-lock.json",
    ...(await readdir(path.join(root, "packages/local/src"))).map(
      (f) => "packages/local/src/" + f,
    ),
    ...(await readdir(path.join(root, "packages/local/dist")))
      .filter((f) => f.endsWith(".js"))
      .map((f) => "packages/local/dist/" + f),
  ],
  hashes = {};
for (const file of files)
  hashes[file] = createHash("sha256")
    .update(await readFile(path.join(root, file)))
    .digest("hex");
await writeFile(
  path.join(root, "commanderoracle-install.json"),
  JSON.stringify({ revision: DEVKIT_REVISION, hashes }, null, 2) + "\n",
  { flag: "wx", mode: 0o600 },
);
console.log(
  "Installed verified revision. Restart the app; connected AI stays off until explicit sign-in, preflight confirmation and enablement.",
);
