import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";

const EXPECTED_OWNER = "gaofeng21cn";
const EXPECTED_REPO = "opl-studio";

function requireGitHubProvider(config) {
  const provider = config?.publish?.provider;
  const owner = config?.publish?.owner;
  const repo = config?.publish?.repo;
  if (provider !== "github" || owner !== EXPECTED_OWNER || repo !== EXPECTED_REPO) {
    throw new Error("Studio updater provider must remain the dedicated gaofeng21cn/opl-studio GitHub feed");
  }
  return { provider, owner, repo };
}

export function buildAppUpdateConfig(builderConfig) {
  return requireGitHubProvider(builderConfig);
}

function resolvePackagedAppDir(appOutDir) {
  const entries = fs.readdirSync(appOutDir, { withFileTypes: true });
  const appDirs = entries
    .filter((entry) => entry.isDirectory() && entry.name.endsWith(".app"))
    .map((entry) => path.join(appOutDir, entry.name));
  if (appDirs.length !== 1) {
    throw new Error(`electron-builder appOutDir must contain exactly one top-level .app (found ${appDirs.length})`);
  }
  return appDirs[0];
}

export function writeAppUpdateConfig({ appOutDir, builderConfig }) {
  if (!appOutDir || typeof appOutDir !== "string") {
    throw new Error("electron-builder appOutDir is required");
  }
  const config = buildAppUpdateConfig(builderConfig);
  const appDir = resolvePackagedAppDir(appOutDir);
  const resourcesDir = path.join(appDir, "Contents", "Resources");
  fs.mkdirSync(resourcesDir, { recursive: true });
  const outputPath = path.join(resourcesDir, "app-update.yml");
  fs.writeFileSync(outputPath, `${Object.entries(config).map(([key, value]) => `${key}: ${value}`).join("\n")}\n`);
  return outputPath;
}

export default async function afterPack(context) {
  const outputPath = writeAppUpdateConfig({
    appOutDir: context?.appOutDir,
    builderConfig: context?.packager?.config,
  });
  process.stdout.write(`Studio updater config written: ${outputPath}\n`);
  const appDir = resolvePackagedAppDir(context.appOutDir);
  const executable = path.join(appDir, "Contents", "MacOS", "One Person Lab Preview");
  const smoke = path.join(appDir, "Contents", "Resources", "app.asar", "scripts", "webui-host", "packaged-host-smoke.mjs");
  const output = execFileSync(executable, [smoke], {
    cwd: os.tmpdir(),
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "1", NODE_PATH: "", NODE_OPTIONS: "" },
    timeout: 30_000,
    encoding: "utf8"
  });
  if (!output.includes("OPL_PACKAGED_HOST_READY")) throw new Error("Packaged Host did not become ready");
  process.stdout.write("Studio packaged Host startup verified\n");
}
