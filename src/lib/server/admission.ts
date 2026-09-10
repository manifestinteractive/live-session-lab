import "server-only";
import { AccessToken, LiveKitAPI, RoomConfiguration, TrackSource } from "livekit-server-sdk";
import { participantIdentity, verifyInvitation } from "./invitations.mjs";

const responseHeaders = { "Cache-Control": "no-store, private", "Pragma": "no-cache", "Vary": "Origin" };
const reply = (status: number, body: object) => Response.json(body, { status, headers: responseHeaders });
const reject = (status: number, error: string) => reply(status, { error });

async function readBody(request: Request) {
  if (!request.body) throw new Error();
  const reader = request.body.getReader();
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 4096) { await reader.cancel(); throw new Error(); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
}

export async function admit(request: Request) {
  if (request.method !== "POST") return reject(405, "method_not_allowed");
  const origin = process.env.APP_ORIGIN;
  if (!origin || request.headers.get("origin") !== origin || request.headers.get("sec-fetch-site") === "cross-site") return reject(403, "origin_rejected");
  if (process.env.ADMISSION_ENABLED !== "true") return reject(503, "admission_disabled");
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return reject(415, "invalid_request");
  let input: { invitation: string; displayName: string };
  try {
    const body = await readBody(request);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error();
    const fields = body as Record<string, unknown>;
    if (Object.keys(fields).sort().join(",") !== "displayName,invitation" || typeof fields.invitation !== "string" || typeof fields.displayName !== "string") throw new Error();
    const displayName = fields.displayName.trim();
    if (!displayName || displayName.length > 40 || /[\p{Cc}\p{Cf}]/u.test(displayName)) throw new Error();
    input = { invitation: fields.invitation, displayName };
  } catch { return reject(400, "invalid_request"); }

  let validated: Awaited<ReturnType<typeof verifyInvitation>>;
  try { validated = await verifyInvitation(input.invitation, process.env.INVITATION_SIGNING_SECRET ?? ""); }
  catch { return reject(401, "invalid_invitation"); }

  try {
    const serverUrl = new URL(process.env.LIVEKIT_URL ?? "");
    const apiKey = process.env.LIVEKIT_API_KEY;
    const secret = process.env.LIVEKIT_API_SECRET;
    if (serverUrl.protocol !== "wss:" || serverUrl.username || serverUrl.password || serverUrl.search || serverUrl.hash
      || !apiKey || !secret || apiKey.startsWith("replace-") || secret.startsWith("replace-")) throw new Error();
    const host = new URL(serverUrl);
    host.protocol = "https:";
    const api = new LiveKitAPI({ host: host.origin, apiKey, secret });
    const room = await api.room.createRoom({ name: validated.room, maxParticipants: 2, emptyTimeout: 300, departureTimeout: 20 });
    // Existing rooms ignore token configuration. Refuse an incompatible room.
    if (room.name !== validated.room || room.maxParticipants !== 2) throw new Error();
    // Only two identities can be issued. Reusing a place replaces its active connection.
    const token = new AccessToken(apiKey, secret, { identity: participantIdentity(validated.room, validated.seat), name: input.displayName, ttl: 300 });
    token.addGrant({ room: validated.room, roomJoin: true, canSubscribe: true, canPublish: true,
      canPublishSources: [TrackSource.CAMERA, TrackSource.MICROPHONE], canPublishData: false,
      canUpdateOwnMetadata: false, roomAdmin: false, roomCreate: false, roomList: false, roomRecord: false });
    token.roomConfig = new RoomConfiguration({ maxParticipants: 2, emptyTimeout: 300, departureTimeout: 20 });
    // Recheck expiry after the provider request. A slow request must not extend admission.
    if (validated.expiresAt <= Math.floor(Date.now() / 1000)) return reject(401, "invalid_invitation");
    return reply(200, { serverUrl: serverUrl.origin, token: await token.toJwt() });
  } catch { return reject(503, "service_unavailable"); }
}
