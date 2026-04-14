import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const cmd = process.argv[2];
if (!cmd || (cmd !== "dev" && cmd !== "start")) {
  console.error("Usage: node scripts/next.mjs <dev|start>");
  process.exit(1);
}

function applyEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const raw = readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    if (!key) continue;
    // don't override existing env (e.g. from shell/CI)
    if (process.env[key] !== undefined) continue;
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

// Load .env like Next does (simple subset), so PORT works without extra libs.
applyEnvFile(path.resolve(".env"));
applyEnvFile(path.resolve(".env.local"));

const port = String(process.env.PORT || "3000").trim() || "3000";

// Run Next CLI via Node for cross-platform args.
const nextBin = path.resolve("node_modules", "next", "dist", "bin", "next");
if (!existsSync(nextBin)) {
  console.error("Missing Next.js binary. Run `npm i` first.");
  process.exit(1);
}

const child = spawn(process.execPath, [nextBin, cmd, "-p", port], {
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (typeof code === "number") process.exit(code);
  if (signal) process.kill(process.pid, signal);
  process.exit(1);
});

