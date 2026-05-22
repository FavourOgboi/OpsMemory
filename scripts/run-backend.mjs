#!/usr/bin/env node
import { spawn } from "child_process";
import fs from "fs";
import { BACKEND, pythonBin } from "./lib/paths.mjs";

const py = fs.existsSync(pythonBin()) ? pythonBin() : "python3";
const child = spawn(py, ["-m", "uvicorn", "main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"], {
  cwd: BACKEND,
  stdio: "inherit",
  shell: false,
});
child.on("exit", (c) => process.exit(c ?? 0));
