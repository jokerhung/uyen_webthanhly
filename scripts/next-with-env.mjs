import nextEnv from "@next/env";
const { loadEnvConfig } = nextEnv;
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const [mode, ...extraArgs] = process.argv.slice(2);
if (mode !== "dev" && mode !== "start") {
  console.error("Usage: node scripts/next-with-env.mjs <dev|start> [Next.js options]");
  process.exit(1);
}

// The Next CLI reads PORT before Next loads .env. Load the same env files first.
loadEnvConfig(process.cwd(), mode === "dev");
const rawPort = process.env.PORT ?? "3000";
const port = Number(rawPort);
if (!/^[0-9]+$/.test(rawPort) || !Number.isInteger(port) || port < 1 || port > 65535) {
  console.error("PORT must be an integer between 1 and 65535.");
  process.exit(1);
}

const cli = fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url));
const child = spawn(process.execPath, [cli, mode, "--port", String(port), ...extraArgs], { stdio: "inherit", env: process.env });
child.on("error", (error) => { console.error(error); process.exitCode = 1; });
child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exitCode = code ?? 1;
});
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
