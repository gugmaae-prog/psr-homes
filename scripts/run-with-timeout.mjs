import { spawn } from "node:child_process";

const [timeoutInput, killAfterInput, separator, command, ...args] = process.argv.slice(2);

if (separator !== "--" || !command) {
  console.error("usage: run-with-timeout.mjs timeout kill-after -- command [args...]");
  process.exit(64);
}

function durationMs(value) {
  const match = /^(\d+)(ms|s|m)$/.exec(value || "");
  if (!match) throw new Error(`Unsupported duration: ${value}`);
  const quantity = Number(match[1]);
  return quantity * (match[2] === "m" ? 60_000 : match[2] === "s" ? 1_000 : 1);
}

const timeoutMs = durationMs(timeoutInput);
const killAfterMs = durationMs(killAfterInput);
const child = spawn(command, args, { stdio: "inherit", env: process.env });
let timedOut = false;
let killTimer;

const timeoutTimer = setTimeout(() => {
  timedOut = true;
  console.error(`Build exceeded ${timeoutInput}; sending SIGTERM.`);
  child.kill("SIGTERM");
  killTimer = setTimeout(() => child.kill("SIGKILL"), killAfterMs);
}, timeoutMs);

child.once("error", (error) => {
  clearTimeout(timeoutTimer);
  if (killTimer) clearTimeout(killTimer);
  console.error(error.message);
  process.exit(1);
});

child.once("exit", (code) => {
  clearTimeout(timeoutTimer);
  if (killTimer) clearTimeout(killTimer);
  process.exit(timedOut ? 124 : (code ?? 1));
});
