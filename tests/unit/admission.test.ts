// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { jwtVerify, SignJWT } from "jose";
import {
  createInvitation,
  createInvitationPair,
  invitationAudience,
  invitationIssuer,
} from "../../src/lib/server/invitations.mjs";

const { createRoom } = vi.hoisted(() => ({ createRoom: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("livekit-server-sdk", async (original) => ({
  ...(await original<typeof import("livekit-server-sdk")>()),
  LiveKitAPI: class {
    room = { createRoom };
  },
}));
import { POST, GET, OPTIONS } from "@/app/api/token/route";

const signingSecret = "synthetic-invitation-secret-for-unit-tests-only";
const apiSecret = "synthetic-livekit-secret-for-unit-tests-only";
const room = "lsl-12345678-1234-4234-8234-123456789abc";
const origin = "https://example.test";
const hostCode = "synthetic-host-code-for-unit-tests";
const guestCode = "synthetic-guest-code-for-unit-tests";
const key = new TextEncoder().encode(signingSecret);
const send = (body: unknown, headers: Record<string, string> = {}) =>
  POST(
    new Request(`${origin}/api/token`, {
      method: "POST",
      headers: { origin, "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    }),
  );
const valid = async () => (await createInvitation(signingSecret, { room })).invitation;

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("APP_ORIGIN", origin);
  vi.stubEnv("ADMISSION_ENABLED", "true");
  vi.stubEnv("INVITATION_SIGNING_SECRET", signingSecret);
  vi.stubEnv("HOST_INVITE_CODE", hostCode);
  vi.stubEnv("GUEST_INVITE_CODE", guestCode);
  vi.stubEnv("CALL_ROOM_NAME", room);
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

  it("issues two fixed five-minute identities and restricts permissions and recreation", async () => {
    const { invitations } = await createInvitationPair(signingSecret, { room });
    const identities: string[] = [];
    for (let i = 0; i < 2; i++) {
      const response = await send({ invitation: invitations[i], displayName: "Test visitor" });
      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toContain("no-store");
      const result = await response.json();
      const { payload } = await jwtVerify(result.token, new TextEncoder().encode(apiSecret), {
        issuer: "synthetic-key",
      });
      identities.push(payload.sub!);
      expect(payload.exp! - payload.nbf!).toBe(300);
      expect(payload.video).toEqual({
        room,
        roomJoin: true,
        canSubscribe: true,
        canPublish: true,
        canPublishSources: ["camera", "microphone"],
        canPublishData: false,
        canUpdateOwnMetadata: false,
        roomAdmin: false,
        roomCreate: false,
        roomList: false,
        roomRecord: false,
      });
      expect(payload.roomConfig).toMatchObject({
        maxParticipants: 2,
        emptyTimeout: 300,
        departureTimeout: 20,
      });
      expect(result.serverUrl).toBe("wss://synthetic.livekit.cloud");
    }
    expect(identities[0]).not.toBe(identities[1]);
    expect(createRoom).toHaveBeenCalledTimes(2);
    expect(createRoom).toHaveBeenCalledWith({
      name: room,
      maxParticipants: 2,
      emptyTimeout: 300,
      departureTimeout: 20,
    });
  });

  it("concurrent exchanges and renewed invitations cannot allocate a third identity", async () => {
    const { invitations } = await createInvitationPair(signingSecret, { room });
    const responses = await Promise.all(
      [invitations[0], invitations[1], invitations[0], invitations[1]].map((invitation) =>
        send({ invitation, displayName: "Test" }),
      ),
    );
    const identities = await Promise.all(
      responses.map(async (response) => {
        expect(response.status).toBe(200);
        return (await jwtVerify((await response.json()).token, new TextEncoder().encode(apiSecret)))
          .payload.sub;
      }),
    );
    expect(new Set(identities).size).toBe(2);
    expect(identities[0]).toBe(identities[2]);
    const rotatedSecret = "a-different-synthetic-signing-secret-for-tests";
    vi.stubEnv("INVITATION_SIGNING_SECRET", rotatedSecret);
    const renewed = await createInvitation(rotatedSecret, { room, seat: 1 });
    const response = await send({ invitation: renewed.invitation, displayName: "Another test" });
    expect(
      (await jwtVerify((await response.json()).token, new TextEncoder().encode(apiSecret))).payload
        .sub,
    ).toBe(identities[0]);
  });

  it.each([undefined, 0, 3, "1", null])(
    "rejects a missing or invalid signed place (%s)",
    async (seat) => {
      const now = Math.floor(Date.now() / 1000);
      const invitation = await new SignJWT({ room, ...(seat === undefined ? {} : { seat }) })
        .setProtectedHeader({ alg: "HS256", typ: "JWT" })
        .setIssuer(invitationIssuer)
        .setAudience(invitationAudience)
        .setIssuedAt(now)
        .setExpirationTime(now + 3600)
        .setJti("synthetic")
        .sign(key);
      await denied(await send({ invitation, displayName: "Test" }), 401);
    },
  );

  it("rejects place tampering and client-selected places", async () => {
    const original = await valid();
    const parts = original.split(".");
    const claims = JSON.parse(Buffer.from(parts[1], "base64url").toString());
    parts[1] = Buffer.from(JSON.stringify({ ...claims, seat: 2 })).toString("base64url");
    await denied(await send({ invitation: parts.join("."), displayName: "Test" }), 401);
    await denied(await send({ invitation: original, displayName: "Test", seat: 2 }), 400);
  });

  it.each(["", "https://attacker.test", "null", `${origin}/`])(
    "rejects an untrusted or missing origin (%s)",
    async (untrusted) => {
      await denied(
        await send({ invitation: await valid(), displayName: "Test" }, { origin: untrusted }),
        403,
      );
    },
  );

  it("rejects cross-site fetch metadata", async () => {
    await denied(
      await send(
        { invitation: await valid(), displayName: "Test" },
        { "sec-fetch-site": "cross-site" },
      ),
      403,
    );
  });

  it("defaults to disabled admission", async () => {
    vi.stubEnv("ADMISSION_ENABLED", "");
    await denied(await send({ invitation: await valid(), displayName: "Test" }), 503);
  });

  it.each([
    {},
    { invitation: "bad" },
    { invitation: "bad", displayName: "" },
    { invitation: "bad", displayName: "a".repeat(41) },
    { invitation: "bad", displayName: "Test\nname" },
    { invitation: "bad", displayName: "Test", room: "other" },
    { invitation: "bad", displayName: "Test", identity: "chosen" },
    [],
  ])("rejects invalid input and client authority fields", async (body) => {
    await denied(await send(body), 400);
  });

  it.each(["", "not-a-jwt", "a".repeat(2049)])(
    "rejects malformed invitations",
    async (invitation) => {
      await denied(await send({ invitation, displayName: "Test" }), 401);
    },
  );

  it("rejects expired and tampered invitations", async () => {
    const expired = await createInvitation(signingSecret, {
      room,
      now: Math.floor(Date.now() / 1000) - 7200,
    });
    await denied(await send({ invitation: expired.invitation, displayName: "Test" }), 401);
    const parts = (await valid()).split(".");
    parts[1] = Buffer.from(JSON.stringify({ room: "substituted" })).toString("base64url");
    await denied(await send({ invitation: parts.join("."), displayName: "Test" }), 401);
  });

  it.each(["issuer", "audience", "algorithm", "room", "expiry"])(
    "rejects a signed invitation with the wrong %s",
    async (fault) => {
      const now = Math.floor(Date.now() / 1000);
      const invitation = await new SignJWT({
        room: fault === "room" ? "personal-name" : room,
        seat: 1,
      })
        .setProtectedHeader({ alg: fault === "algorithm" ? "HS384" : "HS256", typ: "JWT" })
        .setIssuer(fault === "issuer" ? "other" : invitationIssuer)
        .setAudience(fault === "audience" ? "other" : invitationAudience)
        .setIssuedAt(now)
        .setExpirationTime(now + (fault === "expiry" ? 90000 : 3600))
        .setJti("synthetic")
        .sign(key);
      await denied(await send({ invitation, displayName: "Test" }), 401);
    },
  );

  it("rejects an oversized streaming body and malformed JSON", async () => {
    const response = await POST(
      new Request(`${origin}/api/token`, {
        method: "POST",
        headers: { origin, "content-type": "application/json" },
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode("x".repeat(4097)));
            controller.close();
          },
        }),
        duplex: "half",
      } as RequestInit),
    );
    await denied(response, 400);
    await denied(
      await POST(
        new Request(`${origin}/api/token`, {
          method: "POST",
          headers: { origin, "content-type": "application/json" },
          body: "{",
        }),
      ),
      400,
    );
  });

  it("rejects unsupported methods and content types without caching", async () => {
    await denied(await GET(new Request(`${origin}/api/token`)), 405);
    await denied(await OPTIONS(new Request(`${origin}/api/token`, { method: "OPTIONS" })), 405);
    await denied(await send({}, { "content-type": "text/plain" }), 415);
  });

  it.each(["incompatible", "unavailable"])(
    "fails closed for %s provider rooms",
    async (failure) => {
      if (failure === "incompatible")
        createRoom.mockResolvedValue({ name: room, maxParticipants: 0 });
      else createRoom.mockRejectedValue(new Error("Synthetic provider error; do not expose"));
      const response = await send({ invitation: await valid(), displayName: "Test" });
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ error: "service_unavailable" });
      expect(response.headers.get("cache-control")).toContain("no-store");
    },
  );
});

describe("reusable invite codes", () => {
  const claims = async (response: Response) => {
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store, private");
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
    const result = await response.json();
    expect(Object.keys(result).sort()).toEqual(["serverUrl", "token"]);
    return (await jwtVerify(result.token, new TextEncoder().encode(apiSecret))).payload;
  };

  it("maps concurrent host and guest exchanges to two places with ordinary participant permissions", async () => {
    const responses = await Promise.all(
      [hostCode, guestCode, hostCode, guestCode].map((code) => send({ code, displayName: "Test" })),
    );
    const payloads = await Promise.all(responses.map(claims));
    expect(new Set(payloads.map((payload) => payload.sub)).size).toBe(2);
    expect(payloads[0].sub).toBe(payloads[2].sub);
    expect(payloads[1].sub).toBe(payloads[3].sub);
    for (const payload of payloads) {
      expect(payload.exp! - payload.nbf!).toBe(300);
      expect(payload.video).toEqual({
        room,
        roomJoin: true,
        canSubscribe: true,
        canPublish: true,
        canPublishSources: ["camera", "microphone"],
        canPublishData: false,
        canUpdateOwnMetadata: false,
        roomAdmin: false,
        roomCreate: false,
        roomList: false,
        roomRecord: false,
      });
      expect(payload.roomConfig).toMatchObject({ maxParticipants: 2 });
      expect(JSON.stringify(payload)).not.toContain(hostCode);
      expect(JSON.stringify(payload)).not.toContain(guestCode);
    }
  });

  it("survives module reload and time changes, and rotating a code preserves its place", async () => {
    const first = await claims(await send({ code: hostCode, displayName: "Test" }));
    vi.resetModules();
    const { POST: restarted } = await import("@/app/api/token/route");
    vi.useFakeTimers();
    try {
      vi.setSystemTime(Date.now() + 7 * 86400 * 1000);
      const response = await restarted(
        new Request(`${origin}/api/token`, {
          method: "POST",
          headers: { origin, "content-type": "application/json" },
          body: JSON.stringify({ code: hostCode, displayName: "Test" }),
        }),
      );
      expect((await claims(response)).sub).toBe(first.sub);
    } finally {
      vi.useRealTimers();
    }
    const replacement = "synthetic-replacement-host-code";
    vi.stubEnv("HOST_INVITE_CODE", replacement);
    createRoom.mockClear();
    await denied(await send({ code: hostCode, displayName: "Test" }), 401);
    expect((await claims(await send({ code: replacement, displayName: "Test" }))).sub).toBe(
      first.sub,
    );
    expect((await claims(await send({ code: guestCode, displayName: "Test" }))).sub).not.toBe(
      first.sub,
    );
  });

  it.each(["", "host", "guest", "synthetic-wrong-code-for-tests", hostCode.toUpperCase()])(
    "rejects unknown codes without calling LiveKit (%s)",
    async (code) => {
      const response = await send({ code, displayName: "Test" });
      expect((await response.clone().json()).error).toBe("invalid_code");
      await denied(response, 401);
    },
  );

  it.each([
    ["HOST_INVITE_CODE", ""],
    ["GUEST_INVITE_CODE", "short"],
    ["HOST_INVITE_CODE", guestCode],
    ["HOST_INVITE_CODE", "replace-with-a-random-host-code"],
    ["CALL_ROOM_NAME", "chosen-room"],
  ])("fails closed for invalid configuration in %s", async (variable, value) => {
    vi.stubEnv(variable, value);
    await denied(await send({ code: guestCode, displayName: "Test" }), 503);
  });

  it.each([
    { code: hostCode, invitation: "unused", displayName: "Test" },
    { code: hostCode, role: "host", displayName: "Test" },
    { code: guestCode, seat: 1, displayName: "Test" },
    { code: hostCode, room: "substituted", displayName: "Test" },
    { code: hostCode, identity: "substituted", displayName: "Test" },
    { code: "a".repeat(129), displayName: "Test" },
    { code: 12345, displayName: "Test" },
  ])("rejects ambiguous credentials and client authority fields", async (body) => {
    await denied(await send(body), 400);
  });

  it("keeps origin checks and the admission switch in front of code exchange", async () => {
    const body = { code: hostCode, displayName: "Test" };
    await denied(await send(body, { origin: "https://attacker.test" }), 403);
    await denied(await send(body, { "sec-fetch-site": "cross-site" }), 403);
    vi.stubEnv("ADMISSION_ENABLED", "false");
    await denied(await send(body), 503);
  });
});
