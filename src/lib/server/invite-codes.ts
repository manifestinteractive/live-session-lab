import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { participantIdentity } from "./invitations.mjs";

const codePattern = /^[A-Za-z0-9_-]{20,128}$/;
const digest = (value: string) => createHash("sha256").update(value).digest();

/** Codes select fixed participant places. They never grant room administration. */
export function verifyInviteCode(code: string) {
  const host = process.env.HOST_INVITE_CODE ?? "";
  const guest = process.env.GUEST_INVITE_CODE ?? "";
  const room = process.env.CALL_ROOM_NAME ?? "";
  if (
    ![host, guest].every((value) => codePattern.test(value) && !value.startsWith("replace-")) ||
    host === guest
  ) {
    throw new Error("Invalid invite code configuration");
  }
  // Use the same room validation and identity scheme as signed invitations.
  participantIdentity(room, 1);
  const candidate = digest(code);
  const isHost = timingSafeEqual(candidate, digest(host));
  const isGuest = timingSafeEqual(candidate, digest(guest));
  if (!codePattern.test(code) || (!isHost && !isGuest)) return null;
  return { room, seat: isHost ? (1 as const) : (2 as const) };
}
