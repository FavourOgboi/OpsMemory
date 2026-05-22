#!/usr/bin/env node
/**
 * Start the full OpsMemory stack with one command:
 * PostgreSQL (Docker) + migrations + FastAPI + Vite frontend.
 * Optional: --tunnel for Cloudflare quick tunnel (WhatsApp webhooks).
 */
import { spawn, spawnSync, execSync } from "child_process";
import fs from "fs";
import path from "path";
import { ROOT, BACKEND, pythonBin, copyEnvIfMissing } from "./lib/paths.mjs";

const args = process.argv.slice(2);
const withTunnel = args.includes("--tunnel");
const skipDocker = args.includes("--no-docker");
const skipSetup = args.includes("--skip-setup");

function log(msg) {
  console.log(`[opsmemory] ${msg}`);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function commandExists(name) {
  try {
    execSync(process.platform === "win32" ? `where ${name}` : `command -v ${name}`, {
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

function runSync(cmd, opts = {}) {
  const r = spawnSync(cmd, {
    shell: true,
    stdio: "inherit",
    cwd: opts.cwd || ROOT,
    env: { ...process.env, ...opts.env },
  });
  if (r.status !== 0 && !opts.allowFail) process.exit(r.status ?? 1);
}

async function postgresReady(host, port) {
  if (!fs.existsSync(pythonBin())) return false;
  for (let i = 0; i < 40; i++) {
    const r = spawnSync(
      pythonBin(),
      [
        "-c",
        `import psycopg2; psycopg2.connect(host='${host}',port=${port},dbname='opsmemory',user='postgres',password='postgres').close()`,
      ],
      { cwd: BACKEND, stdio: "ignore" },
    );
    if (r.status === 0) return true;
    await sleep(1500);
  }
  return false;
}

function spawnProc(label, cmd, cmdArgs, opts = {}) {
  const child = spawn(cmd, cmdArgs, {
    cwd: opts.cwd || ROOT,
    env: { ...process.env, ...opts.env },
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  child.on("exit", (code) => {
    if (code && code !== 0) {
      console.error(`[opsmemory] ${label} exited with code ${code}`);
    }
  });
  return child;
}

async function main() {
  console.log("\n OpsMemory — starting development stack\n");

  copyEnvIfMissing(path.join(BACKEND, ".env.example"), path.join(BACKEND, ".env"));
  copyEnvIfMissing(path.join(ROOT, ".env.example"), path.join(ROOT, ".env.local"));

  if (!skipSetup && (!fs.existsSync(path.join(ROOT, "node_modules")) || !fs.existsSync(pythonBin()))) {
    log("Running first-time setup (npm install, venv, migrations)...");
    runSync("node scripts/setup.mjs" + (skipDocker ? " --no-docker" : ""), { cwd: ROOT });
  }

  const dbPort = process.env.OPSMEMORY_DB_PORT || "5433";

  if (!skipDocker && commandExists("docker")) {
    log("Ensuring PostgreSQL container is running (localhost:" + dbPort + ")");
    runSync("docker compose -f docker-compose.dev.yml up -d postgres", { allowFail: false });
    const ok = await postgresReady("localhost", dbPort);
    if (!ok) {
      console.error("[opsmemory] Cannot reach PostgreSQL. Run: npm run setup");
      process.exit(1);
    }
    log("PostgreSQL is ready");
  } else {
    log("Using existing PostgreSQL (" + (process.env.OPSMEMORY_DB_HOST || "localhost") + ":" + dbPort + ")");
    const ok = await postgresReady(process.env.OPSMEMORY_DB_HOST || "localhost", dbPort);
    if (!ok) {
      console.error("[opsmemory] Database not reachable. Start Postgres or run: docker compose -f docker-compose.dev.yml up -d");
      process.exit(1);
    }
  }

  if (fs.existsSync(pythonBin())) {
    log("Applying migrations");
    runSync(`"${pythonBin()}" scripts/migrate_all.py`, { cwd: BACKEND, allowFail: true });
  }

  const children = [];

  log("Backend API → http://localhost:8000 (docs at /docs)");
  children.push(
    spawnProc(
      "backend",
      pythonBin(),
      ["-m", "uvicorn", "main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"],
      { cwd: BACKEND },
    ),
  );

  await sleep(1200);

  log("Frontend → http://localhost:5173");
  children.push(
    spawnProc("frontend", process.platform === "win32" ? "npm.cmd" : "npm", ["run", "dev:frontend"], {
      cwd: ROOT,
      env: { FORCE_COLOR: "1" },
    }),
  );

  if (withTunnel) {
    if (commandExists("cloudflared")) {
      log("Cloudflare tunnel → public HTTPS for WhatsApp webhooks");
      const tunnelScript = path.join(BACKEND, "scripts/cloudflared-tunnel.sh");
      if (fs.existsSync(tunnelScript) && process.platform !== "win32") {
        children.push(
          spawn("bash", [tunnelScript], {
            cwd: BACKEND,
            stdio: "inherit",
            env: { ...process.env, BACKEND_URL: "http://127.0.0.1:8000" },
          }),
        );
      } else {
        children.push(
          spawnProc("tunnel", "cloudflared", ["tunnel", "--url", "http://127.0.0.1:8000"], {
            cwd: ROOT,
          }),
        );
      }
    } else {
      log("cloudflared not installed; skipping tunnel. Install from https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/");
    }
  }

  console.log("\n────────────────────────────────────────────────────────");
  console.log("  Dashboard:  http://localhost:5173/dashboard");
  console.log("  Sign up:    http://localhost:5173/sign-up");
  console.log("  API health: http://localhost:8000/health");
  console.log("  Press Ctrl+C to stop all services");
  console.log("────────────────────────────────────────────────────────\n");

  const shutdown = () => {
    log("Shutting down...");
    for (const c of children) {
      try {
        c.kill("SIGTERM");
      } catch {
        /* ignore */
      }
    }
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
