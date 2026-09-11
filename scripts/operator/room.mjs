import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";
import { LiveKitAPI, ServerError } from "livekit-server-sdk";

const roomPattern = /^lsl-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const absent = (error) => error instanceof ServerError && error.code === "not_found";

async function status(api, room) {
  try {
    const participants = await api.room.listParticipants(room);
    return { state: participants.length ? "active" : "empty", participants: participants.length };
  } catch (error) {
    if (absent(error)) return { state: "absent", participants: 0 };
    throw error;
  }
}

/** @param {string[]} args @param {Record<string, string | undefined>} env */
export async function runRoomCommand(args, env = process.env) {
  try {
    const { values, positionals } = parseArgs({
      args,
      allowPositionals: true,
      options: {
        room: { type: "string" },
        confirm: { type: "boolean" },
        help: { type: "boolean" },
      },
    });
    if (values.help)
      return { ok: true, usage: "npm run room -- status|close [--room lsl-UUID] [--confirm]" };
    const [action] = positionals;
    if (positionals.length !== 1 || !["status", "close"].includes(action)) throw new Error();
    if (action === "close" && !values.confirm) return { ok: false, error: "confirmation_required" };
    const room = values.room ?? env.CALL_ROOM_NAME;
    if (!roomPattern.test(room ?? "")) throw new Error();
    const host = new URL(env.LIVEKIT_URL ?? "");
    if (
      host.protocol !== "wss:" ||
      host.username ||
      host.password ||
      host.search ||
      host.hash ||
      host.pathname !== "/" ||
      !env.LIVEKIT_API_KEY ||
      !env.LIVEKIT_API_SECRET ||
      env.LIVEKIT_API_KEY.startsWith("replace-") ||
      env.LIVEKIT_API_SECRET.startsWith("replace-")
    )
      throw new Error();
    host.protocol = "https:";
    const api = new LiveKitAPI({
      host: host.origin,
      apiKey: env.LIVEKIT_API_KEY,
      secret: env.LIVEKIT_API_SECRET,
      requestTimeout: 10,
    });
    if (action === "close") {
      try {
        await api.room.deleteRoom(room);
      } catch (error) {
        if (!absent(error)) throw error;
      }
    }
    const result = await status(api, room);
    if (action === "close" && result.participants > 0)
      return { ok: false, error: "participants_still_present", ...result };
    return { ok: true, action, ...result };
  } catch {
    // Provider errors can contain identifiers or credentials. Print fixed categories only.
    return { ok: false, error: "room_operation_failed" };
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await runRoomCommand(process.argv.slice(2));
  console.log(JSON.stringify(result));
  process.exitCode = result.ok ? 0 : 1;
}
