import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const { scripts = {} } = JSON.parse(readFileSync(`${root}/package.json`, "utf8"));
const checks = ["format:check", "lint", "typecheck", "test", "test:e2e", "build"];
const missing = checks.filter((name) => !scripts[name]);
if (missing.length) {
  console.error(`Application verification is unavailable. Missing scripts: ${missing.join(", ")}.`);
  console.error("Restore the required application check scripts before verification.");
  process.exit(1);
}
for (const check of ["ai:check", ...checks]) {
  const result = spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", ["run", check], {
    cwd: root,
    stdio: "inherit",
  });
  if (result.error) console.error(result.error.message);
  if (result.status !== 0) process.exit(result.status ?? 1);
}
