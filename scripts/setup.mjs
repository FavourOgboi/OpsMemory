#!/usr/bin/env node
/**
 * First-time project setup: env files, Python venv, npm deps, PostgreSQL migrations.
 */
import { spawnSync, execSync } from "child_process";
import fs from "fs";
import path from "path";
import {
  ROOT,
  BACKEND,
  VENV_DIR,
  pythonBin,
  ensureDir,
  copyEnvIfMissing,
} from "./lib/paths.mjs";

const args = process.argv.slice(2);
const useDocker = !args.includes("--no-docker");

function log(msg) {
  console.log(`\n[setup] ${msg}`);
}

function run(cmd, opts = {}) {
  const result = spawnSync(cmd, {
    shell: true,
    stdio: "inherit",
    cwd: opts.cwd || ROOT,
    env: { ...process.env, ...opts.env },
  });
  if (result.status !== 0 && !opts.allowFail) {
    process.exit(result.status ?? 1);
  }
  return result.status === 0;
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

function sleep(ms) {
  spawnSync(process.platform === "win32" ? `ping -n ${Math.max(1, Math.ceil(ms / 1000))} 127.0.0.1 > nul` : `sleep ${(ms / 1000).toFixed(1)}`, {
    shell: true,
    stdio: "ignore",
  });
}

function waitForPostgres(host, port, attempts = 40) {
  const py = fs.existsSync(pythonBin()) ? pythonBin() : "python3";
  for (let i = 0; i < attempts; i++) {
    const check = spawnSync(
      py,
      [
        "-c",
        `import psycopg2; psycopg2.connect(host='${host}', port=${port}, dbname='opsmemory', user='postgres', password='postgres').close()`,
      ],
      { cwd: BACKEND, stdio: "ignore" },
    );
    if (check.status === 0) return true;
    sleep(1500);
  }
  return false;
}

log("Creating environment files");
copyEnvIfMissing(path.join(BACKEND, ".env.example"), path.join(BACKEND, ".env"));
copyEnvIfMissing(path.join(ROOT, ".env.example"), path.join(ROOT, ".env.local"));

const backendEnvPath = path.join(BACKEND, ".env");
if (fs.existsSync(backendEnvPath)) {
  let envText = fs.readFileSync(backendEnvPath, "utf8");
  if (!envText.includes("OPSMEMORY_DB_PORT=5433") && useDocker) {
    envText = envText.replace(
      /OPSMEMORY_DB_PORT=\d+/,
      "OPSMEMORY_DB_PORT=5433",
    );
    if (!envText.includes("OPSMEMORY_DB_PORT")) {
      envText += "\nOPSMEMORY_DB_PORT=5433\n";
    }
    fs.writeFileSync(backendEnvPath, envText);
  }
}

log("Installing frontend dependencies");
run("npm install");

log("Creating Python virtual environment");
if (!fs.existsSync(pythonBin())) {
  const pyLauncher = process.platform === "win32" ? "python" : "python3";
  run(`${pyLauncher} -m venv "${VENV_DIR}"`);
}

log("Installing backend dependencies");
run(`"${pythonBin()}" -m pip install -q -r requirements.txt`, { cwd: BACKEND });

if (useDocker && commandExists("docker")) {
  log("Starting PostgreSQL (Docker, port 5433)");
  run("docker compose -f docker-compose.dev.yml up -d postgres");
  const ready = waitForPostgres("localhost", 5433);
  if (!ready) {
    console.error("[setup] PostgreSQL did not become ready on port 5433.");
    process.exit(1);
  }
} else {
  log("Skipping Docker. Ensure PostgreSQL is running and OPSMEMORY_DB_* in opsmemory-backend/.env is correct.");
}

log("Running database migrations");
run(`"${pythonBin()}" scripts/migrate_all.py`, { cwd: BACKEND });

const migration007 = path.join(BACKEND, "migrations/007_onboarding_business_fields.sql");
if (fs.existsSync(migration007) && commandExists("psql")) {
  log("Applying onboarding schema patch (007)");
  run(
    `psql -h localhost -p 5433 -U postgres -d opsmemory -f migrations/007_onboarding_business_fields.sql`,
    { cwd: BACKEND, allowFail: true, env: { PGPASSWORD: "postgres" } },
  );
}

log("Setup complete.");
console.log("\nNext: add OPENROUTER_API_KEY to opsmemory-backend/.env");
console.log("Then run: npm start\n");
