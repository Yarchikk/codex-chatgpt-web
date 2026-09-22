const fs = require("node:fs");
const path = require("node:path");

function replaceExact(file, oldText, newText) {
  const text = fs.readFileSync(file, "utf8");
  if (!text.includes(oldText)) {
    throw new Error(`Expected code not found in ${file}: ${oldText}`);
  }
  fs.writeFileSync(file, text.replaceAll(oldText, newText), "utf8");
}

replaceExact(
  "src/browser-login.ts",
  'if (process.platform !== "darwin") {',
  'if (process.platform !== "darwin" && process.platform !== "win32") {',
);

replaceExact(
  "src/cli.ts",
  'if (process.platform !== "darwin") throw new Error("Passkey sign-in is currently supported only on macOS");',
  'if (process.platform !== "darwin" && process.platform !== "win32") throw new Error("System-browser sign-in is currently supported only on macOS and Windows");',
);

{
  const file = "launcher/electron/runtime.cjs";
  let text = fs.readFileSync(file, "utf8");
  const pattern = /  passkeyChromeExecutable\(\) \{[\s\S]*?\n  \}\n\n  continuePasskeyLogin\(\) \{/;
  const matches = text.match(pattern);
  if (!matches) throw new Error("passkeyChromeExecutable block was not found");

  const replacement = `  passkeyChromeExecutable() {
    if (this.platform !== "darwin" && this.platform !== "win32") {
      throw new Error("System-browser sign-in is currently supported only on macOS and Windows");
    }
    const setupConfig = this.supervisor.readSetupConfig
      ? this.supervisor.readSetupConfig()
      : this.supervisor.readConfig();
    const configured = setupConfig?.chromeExecutablePath;
    const yandex = this.platform === "win32" && process.env.LOCALAPPDATA
      ? path.join(process.env.LOCALAPPDATA, "Yandex", "YandexBrowser", "Application", "browser.exe")
      : null;
    const chrome = this.platform === "win32" && process.env.PROGRAMFILES
      ? path.join(process.env.PROGRAMFILES, "Google", "Chrome", "Application", "chrome.exe")
      : null;
    const edgeX86 = this.platform === "win32" && process.env["PROGRAMFILES(X86)"]
      ? path.join(process.env["PROGRAMFILES(X86)"], "Microsoft", "Edge", "Application", "msedge.exe")
      : null;
    const edge64 = this.platform === "win32" && process.env.PROGRAMFILES
      ? path.join(process.env.PROGRAMFILES, "Microsoft", "Edge", "Application", "msedge.exe")
      : null;
    const candidates = this.platform === "win32"
      ? [yandex, configured, chrome, edgeX86, edge64]
      : [configured, "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"];
    const candidate = candidates.find(value => usableExecutable(value, this.platform));
    if (!candidate) throw new Error("No supported system browser was found");
    return candidate;
  }

  continuePasskeyLogin() {`;

  text = text.replace(pattern, replacement);
  fs.writeFileSync(file, text, "utf8");
}

replaceExact(
  "launcher/src/App.tsx",
  '    && platform === "darwin"',
  '    && (platform === "darwin" || platform === "win32")',
);

console.log("Windows browser login patch applied: Yandex -> configured -> Chrome -> Edge");
