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

// wrangler dev spawns its own child processes (esbuild, workerd). Running it in a
// detached process group lets us kill the whole tree instead of leaving orphans
// that hold stdio open and hang the parent (and CI runners) forever.
function killProcessGroup(proc) {
  if (proc.pid == null || proc.exitCode !== null) return;
  try {
    process.kill(-proc.pid, "SIGTERM");
  } catch {
    // group may already be gone
  }
}

async function main() {
  const proc = spawn(
    "npx",
    ["wrangler", "dev", "--local", "--port", String(PORT), "--show-interactive-dev-session=false"],
    { stdio: ["ignore", "pipe", "pipe"], detached: true }
  );

  let stderr = "";
  proc.stderr.on("data", (chunk) => { stderr += chunk.toString(); });

  let exitCode = 0;
  try {
    const ok = await waitForHealth(Date.now() + BOOT_TIMEOUT_MS);
    if (!ok) {
      console.error("Backend did not become healthy in time.");
      if (stderr) console.error(stderr);
      exitCode = 1;
    } else {
      console.log("✓ Backend started and /api/health responded { ok: true }");
    }
  } finally {
    killProcessGroup(proc);
    // Give the group a moment to exit gracefully, then force it.
    await sleep(1000);
    if (proc.exitCode === null) {
      try {
        process.kill(-proc.pid, "SIGKILL");
      } catch {
        // already gone
      }
    }
  }

  process.exit(exitCode);
}

main();
