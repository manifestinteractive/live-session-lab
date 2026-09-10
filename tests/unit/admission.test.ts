// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { jwtVerify, SignJWT } from "jose";
import { createInvitation, invitationAudience, invitationIssuer } from "../../src/lib/server/invitations.mjs";

const { createRoom } = vi.hoisted(() => ({ createRoom: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("livekit-server-sdk", async (original) => ({
  ...await original<typeof import("livekit-server-sdk")>(),
  LiveKitAPI: class { room = { createRoom }; },
}));
import { POST, GET, OPTIONS } from "@/app/api/token/route";

const signingSecret = "synthetic-invitation-secret-for-unit-tests-only";
const apiSecret = "synthetic-livekit-secret-for-unit-tests-only";
const room = "lsl-12345678-1234-4234-8234-123456789abc";
const origin = "https://example.test";
const key = new TextEncoder().encode(signingSecret);
const send = (body: unknown, headers: Record<string, string> = {}) => POST(new Request(`${origin}/api/token`, { method: "POST", headers: { origin, "content-type": "application/json", ...headers }, body: JSON.stringify(body) }));
const valid = async () => (await createInvitation(signingSecret, { room })).invitation;

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("APP_ORIGIN", origin);
  vi.stubEnv("ADMISSION_ENABLED", "true");
  vi.stubEnv("INVITATION_SIGNING_SECRET", signingSecret);
  vi.stubEnv("LIVEKIT_URL", "wss://synthetic.livekit.cloud");
  vi.stubEnv("LIVEKIT_API_KEY", "synthetic-key");
  vi.stubEnv("LIVEKIT_API_SECRET", apiSecret);
  createRoom.mockReset().mockResolvedValue({ name: room, maxParticipants: 2 });
});

async function denied(response: Response, status: number) {
  expect(response.status).toBe(status);
  expect(response.headers.get("cache-control")).toContain("no-store");
  expect(response.headers.get("access-control-allow-origin")).toBeNull();
  expect(await response.json()).not.toHaveProperty("token");
  expect(createRoom).not.toHaveBeenCalled();
}

describe("invitation and token admission", () => {
  it("signs a one-hour, room-bound invitation by default", async () => {
    const result = await createInvitation(signingSecret);
    const { payload } = await jwtVerify(result.invitation, key);
    expect(payload.exp! - payload.iat!).toBe(3600);
    expect(payload.room).toMatch(/^lsl-/);
    expect(payload.aud).toBe(invitationAudience);
    expect(payload.iss).toBe(invitationIssuer);
  });

  it("issues distinct five-minute identities and restricts permissions and recreation", async () => {
    const invitation = await valid();
    const identities: string[] = [];
    for (let i = 0; i < 2; i++) {
      const response = await send({ invitation, displayName: "Test visitor" });
      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toContain("no-store");
      const result = await response.json();
      const { payload } = await jwtVerify(result.token, new TextEncoder().encode(apiSecret), { issuer: "synthetic-key" });
      identities.push(payload.sub!);
      expect(payload.exp! - payload.nbf!).toBe(300);
      expect(payload.video).toEqual({ room, roomJoin: true, canSubscribe: true, canPublish: true, canPublishSources: ["camera", "microphone"], canPublishData: false, canUpdateOwnMetadata: false, roomAdmin: false, roomCreate: false, roomList: false, roomRecord: false });
      expect(payload.roomConfig).toMatchObject({ maxParticipants: 2, emptyTimeout: 300, departureTimeout: 20 });
      expect(result.serverUrl).toBe("wss://synthetic.livekit.cloud");
    }
    expect(identities[0]).not.toBe(identities[1]);
    expect(createRoom).toHaveBeenCalledTimes(2);
    expect(createRoom).toHaveBeenCalledWith({ name: room, maxParticipants: 2, emptyTimeout: 300, departureTimeout: 20 });
  });

  it.each(["", "https://attacker.test", "null", `${origin}/`])("rejects an untrusted or missing origin (%s)", async (untrusted) => {
    await denied(await send({ invitation: await valid(), displayName: "Test" }, { origin: untrusted }), 403);
  });

  it("rejects cross-site fetch metadata", async () => {
    await denied(await send({ invitation: await valid(), displayName: "Test" }, { "sec-fetch-site": "cross-site" }), 403);
  });

  it("defaults to disabled admission", async () => {
    vi.stubEnv("ADMISSION_ENABLED", "");
    await denied(await send({ invitation: await valid(), displayName: "Test" }), 503);
  });

  it.each([{}, { invitation: "bad" }, { invitation: "bad", displayName: "" }, { invitation: "bad", displayName: "a".repeat(41) }, { invitation: "bad", displayName: "Test\nname" }, { invitation: "bad", displayName: "Test", room: "other" }, { invitation: "bad", displayName: "Test", identity: "chosen" }, []])("rejects invalid input and client authority fields", async (body) => {
    await denied(await send(body), 400);
  });

  it.each(["", "not-a-jwt", "a".repeat(2049)])("rejects malformed invitations", async (invitation) => {
    await denied(await send({ invitation, displayName: "Test" }), 401);
  });

  it("rejects expired and tampered invitations", async () => {
    const expired = await createInvitation(signingSecret, { room, now: Math.floor(Date.now() / 1000) - 7200 });
    await denied(await send({ invitation: expired.invitation, displayName: "Test" }), 401);
    const parts = (await valid()).split(".");
    parts[1] = Buffer.from(JSON.stringify({ room: "substituted" })).toString("base64url");
    await denied(await send({ invitation: parts.join("."), displayName: "Test" }), 401);
  });

  it.each(["issuer", "audience", "algorithm", "room", "expiry"])('rejects a signed invitation with the wrong %s', async (fault) => {
    const now = Math.floor(Date.now() / 1000);
    const invitation = await new SignJWT({ room: fault === "room" ? "personal-name" : room })
      .setProtectedHeader({ alg: fault === "algorithm" ? "HS384" : "HS256", typ: "JWT" })
      .setIssuer(fault === "issuer" ? "other" : invitationIssuer).setAudience(fault === "audience" ? "other" : invitationAudience)
      .setIssuedAt(now).setExpirationTime(now + (fault === "expiry" ? 90000 : 3600)).setJti("synthetic").sign(key);
    await denied(await send({ invitation, displayName: "Test" }), 401);
  });

  it("rejects an oversized streaming body and malformed JSON", async () => {
    const response = await POST(new Request(`${origin}/api/token`, { method: "POST", headers: { origin, "content-type": "application/json" }, body: new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode("x".repeat(4097))); controller.close(); } }), duplex: "half" } as RequestInit));
    await denied(response, 400);
    await denied(await POST(new Request(`${origin}/api/token`, { method: "POST", headers: { origin, "content-type": "application/json" }, body: "{" })), 400);
  });

  it("rejects unsupported methods and content types without caching", async () => {
    await denied(await GET(new Request(`${origin}/api/token`)), 405);
    await denied(await OPTIONS(new Request(`${origin}/api/token`, { method: "OPTIONS" })), 405);
    await denied(await send({}, { "content-type": "text/plain" }), 415);
  });

  it.each(["incompatible", "unavailable"])("fails closed for %s provider rooms", async (failure) => {
    if (failure === "incompatible") createRoom.mockResolvedValue({ name: room, maxParticipants: 0 });
    else createRoom.mockRejectedValue(new Error("Synthetic provider error; do not expose"));
    const response = await send({ invitation: await valid(), displayName: "Test" });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "service_unavailable" });
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
});
