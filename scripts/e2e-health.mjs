// Quick e2e smoke test: boots the worker locally via `wrangler dev` and verifies
// GET /api/health responds before anything else is trusted (deploy gate, local sanity check).
import { spawn } from "node:child_process";

const PORT = 8799;
const URL = `http://127.0.0.1:${PORT}/api/health`;
const BOOT_TIMEOUT_MS = 30_000;
const POLL_INTERVAL_MS = 500;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHealth(deadline) {
  while (Date.now() < deadline) {
    try {
      const res = await fetch(URL);
      if (res.ok) {
        const body = await res.json();
        if (body.ok === true) return true;
      }
    } catch {
      // server not ready yet
    }
    await sleep(POLL_INTERVAL_MS);
  }
  return false;
}

async function main() {
  const proc = spawn(
    "npx",
    ["wrangler", "dev", "--local", "--port", String(PORT), "--show-interactive-dev-session=false"],
    { stdio: ["ignore", "pipe", "pipe"] }
  );

  let stderr = "";
  proc.stderr.on("data", (chunk) => { stderr += chunk.toString(); });

  const cleanup = () => {
    proc.kill("SIGTERM");
  };

  try {
    const ok = await waitForHealth(Date.now() + BOOT_TIMEOUT_MS);
    if (!ok) {
      console.error("Backend did not become healthy in time.");
      if (stderr) console.error(stderr);
      process.exitCode = 1;
      return;
    }
    console.log("✓ Backend started and /api/health responded { ok: true }");
  } finally {
    cleanup();
  }
}

main();
