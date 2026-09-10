// @vitest-environment node
import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";
import { verifyInvitation } from "../../src/lib/server/invitations.mjs";

it("creates two separate invitations for the same room without provider access", async () => {
  const secret = "synthetic-command-secret-long-enough-for-tests";
  const result = spawnSync(process.execPath, ["scripts/operator/invite.mjs", "--minutes", "15"], {
    env: { NODE_ENV: "test", PATH: process.env.PATH, APP_ORIGIN: "https://example.test", INVITATION_SIGNING_SECRET: secret }, encoding: "utf8",
  });
  expect(result.status).toBe(0);
  const urls = result.stdout.split("\n").filter(line => line.startsWith("https://")).map(line => new URL(line));
  expect(urls).toHaveLength(2);
  const invitations = [];
  for (const url of urls) {
    expect(url.origin + url.pathname).toBe("https://example.test/call");
    expect(url.search).toBe("");
    const validated = await verifyInvitation(new URLSearchParams(url.hash.slice(1)).get("invite")!, secret);
    expect(validated.room).toMatch(/^lsl-/);
    expect(validated.expiresAt - Math.floor(Date.now() / 1000)).toBeGreaterThan(890);
    invitations.push(validated);
  }
  expect(invitations[0].room).toBe(invitations[1].room);
  expect(invitations.map(invitation => invitation.seat)).toEqual([1, 2]);
});

it("does not output credentials when operator configuration is invalid", () => {
  const result = spawnSync(process.execPath, ["scripts/operator/invite.mjs"], { env: { NODE_ENV: "test", PATH: process.env.PATH, APP_ORIGIN: "https://example.test", INVITATION_SIGNING_SECRET: "short" }, encoding: "utf8" });
  expect(result.status).toBe(1);
  expect(result.stdout).toBe("");
  expect(result.stderr).toContain("Cannot create invitation");
  expect(result.stderr).not.toContain("short");
});
