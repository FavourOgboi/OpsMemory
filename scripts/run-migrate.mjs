#!/usr/bin/env node
import { spawnSync } from "child_process";
import fs from "fs";
import { BACKEND, pythonBin } from "./lib/paths.mjs";

const py = fs.existsSync(pythonBin()) ? pythonBin() : "python3";
spawnSync(py, ["scripts/migrate_all.py"], { cwd: BACKEND, stdio: "inherit" });
