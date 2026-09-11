// Opt-in provider check. Uses an isolated local server and temporary codes/room.
import { spawn } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";

const origin = "http://127.0.0.1:3200";
const room = `lsl-${randomUUID()}`;
const env = {
  ...process.env,
  APP_ORIGIN: origin,
  ADMISSION_ENABLED: "true",
  CALL_ROOM_NAME: room,
  TEST_CALL_ROOM_NAME: room,
  HOST_INVITE_CODE: randomBytes(16).toString("hex"),
  GUEST_INVITE_CODE: randomBytes(16).toString("hex"),
};
let server;
let test;
const stop = () => {
  test?.kill("SIGTERM");
  server?.kill("SIGTERM");
};
process.once("SIGINT", stop);
process.once("SIGTERM", stop);
try {
  // Fail before starting anything if another process owns the test port.
  const probe = createServer();
  await new Promise((resolve, reject) => {
    probe.once("error", reject);
    probe.listen(3200, "127.0.0.1", resolve);
  });
  await new Promise((resolve) => probe.close(resolve));
  server = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3200"],
    { env, stdio: "ignore" },
  );
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) break;
    try {
      ready = (await fetch(`${origin}/`, { signal: AbortSignal.timeout(500) })).ok;
    } catch {}
    if (ready) break;
    await delay(200);
  }
  if (!ready) throw new Error();
  test = spawn(process.execPath, ["scripts/test-live-call.mjs", "--codes"], {
    env,
    stdio: "inherit",
  });
  process.exitCode = await new Promise((resolve, reject) => {
    test.once("error", reject);
    test.once("exit", (code) => resolve(code ?? 1));
  });
} catch {
  console.error(
    "Code call test could not start. Check the production build, provider configuration, and port 3200.",
  );
  process.exitCode = 1;
} finally {
  stop();
}
