/** Official DevKit only; no API-key or alternative-provider adapter exists. */
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { spawn } from "node:child_process";
export const DEVKIT_REVISION = "0a36fefeb913055c8c7a1a29b63d82b96b2e841a";
export const USAGE_URL = "https://chatgpt.com/settings/usage";
const fail = (code, message) => Object.assign(new Error(message), { code });
/** DPAPI CurrentUser. Secrets go over stdin/stdout pipes, never arguments or logs. */
export function windowsCredentialEncryption({
  platform = process.platform,
  runner = runPowerShell,
} = {}) {
  const transform = async (value, decrypt) => {
    if (platform !== "win32")
      throw fail(
        "secure_storage_unavailable",
        "Windows DPAPI is unavailable; use the manual bridge.",
      );
    return runner(value, decrypt);
  };
  return {
    id: "commanderoracle-windows-dpapi-current-user-v1",
    async isAvailable() {
      if (platform !== "win32") return false;
      try {
        const c = await transform(
          Buffer.from("credential-provider-self-test"),
          false,
        );
        return (
          (await transform(c, true)).toString("utf8") ===
          "credential-provider-self-test"
        );
      } catch {
        return false;
      }
    },
    async encrypt(text) {
      return transform(Buffer.from(text, "utf8"), false);
    },
    async decrypt(bytes) {
      return (await transform(bytes, true)).toString("utf8");
    },
  };
}
function runPowerShell(bytes, decrypt) {
  return new Promise((resolve, reject) => {
    const operation = decrypt ? "Unprotect" : "Protect",
      script = `Add-Type -AssemblyName System.Security; $v=[Convert]::FromBase64String([Console]::In.ReadToEnd()); $r=[Security.Cryptography.ProtectedData]::${operation}($v,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser); [Console]::Out.Write([Convert]::ToBase64String($r))`;
    const child = spawn(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-EncodedCommand",
        Buffer.from(script, "utf16le").toString("base64"),
      ],
      { windowsHide: true, stdio: ["pipe", "pipe", "ignore"] },
    );
    let output = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(
        fail(
          "secure_storage_unavailable",
          "OS credential operation timed out.",
        ),
      );
    }, 10000);
    child.stdout.on("data", (b) => {
      output += b;
      if (output.length > 2 * 1024 * 1024) {
        child.kill();
        reject(
          fail(
            "secure_storage_unavailable",
            "OS credential result exceeded its bound.",
          ),
        );
      }
    });
    child.on("error", () => {
      clearTimeout(timer);
      reject(
        fail(
          "secure_storage_unavailable",
          "OS credential encryption unavailable.",
        ),
      );
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0 || !output || !/^[A-Za-z0-9+/=]+$/.test(output))
        reject(
          fail("secure_storage_unavailable", "OS credential operation failed."),
        );
      else resolve(Buffer.from(output, "base64"));
    });
    child.stdin.on("error", () => {});
    child.stdin.end(Buffer.from(bytes).toString("base64"));
  });
}
export async function loadOfficialChatGPT({ dataDir }) {
  const [major, minor] = process.versions.node.split(".").map(Number);
  if (major < 22 || (major === 22 && minor < 12))
    throw fail(
      "sdk_unavailable",
      "Connected SDK requires Node 22.12+; local/manual features remain available.",
    );
  const provider = windowsCredentialEncryption();
  if (!(await provider.isAvailable()))
    throw fail(
      "secure_storage_unavailable",
      "Secure Windows credential storage is unavailable. Connected AI is disabled; manual copy/import works.",
    );
  const root = path.join(dataDir, "chatgpt-devkit");
  let manifest;
  try {
    manifest = JSON.parse(
      await readFile(path.join(root, "commanderoracle-install.json"), "utf8"),
    );
  } catch {
    throw fail(
      "sdk_unavailable",
      "Install the pinned official ChatGPT DevKit explicitly; see docs/CHATGPT_ARCHITECT.md.",
    );
  }
  if (
    manifest.revision !== DEVKIT_REVISION ||
    !manifest.hashes ||
    Object.keys(manifest.hashes).length < 8
  )
    throw fail(
      "sdk_unavailable",
      "Official SDK installation could not be verified.",
    );
  for (const [file, expected] of Object.entries(manifest.hashes)) {
    if (file.includes("..") || path.isAbsolute(file))
      throw fail("sdk_unavailable", "Invalid SDK manifest.");
    const actual = createHash("sha256")
      .update(await readFile(path.join(root, file)))
      .digest("hex");
    if (actual !== expected)
      throw fail(
        "sdk_unavailable",
        "SDK files changed; connected AI is disabled.",
      );
  }
  const sdk = await import(
    pathToFileURL(path.join(root, "packages/local/dist/index.js")).href
  );
  return sdk.createChatGPT({
    appName: "CommanderOracle Independent",
    appId: "commanderoracle-independent",
    redirectPort: 0,
    storageDir: path.resolve(dataDir, "chatgpt-credentials"),
    credentialEncryption: provider,
    sendHostId: false,
  });
}
