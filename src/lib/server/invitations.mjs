// @ts-check
import { randomUUID } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';

export const invitationIssuer = 'live-session-lab';
export const invitationAudience = 'live-session-lab:admission';
const roomPattern = /^lsl-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** @param {string} secret */
function key(secret) {
  if (new TextEncoder().encode(secret).length < 32 || secret.startsWith('replace-')) throw new Error('Invalid signing configuration');
  return new TextEncoder().encode(secret);
}

/** @param {string} secret @param {{room?: string, validFor?: number, now?: number}} options */
export async function createInvitation(secret, { room = `lsl-${randomUUID()}`, validFor = 3600, now = Math.floor(Date.now() / 1000) } = {}) {
  if (!roomPattern.test(room) || !Number.isInteger(validFor) || validFor < 60 || validFor > 86400) throw new Error('Invalid invitation options');
  const invitation = await new SignJWT({ room })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer(invitationIssuer).setAudience(invitationAudience).setJti(randomUUID())
    .setIssuedAt(now).setExpirationTime(now + validFor).sign(key(secret));
  return { invitation, room, expiresAt: now + validFor };
}

/** @param {string} invitation @param {string} secret */
export async function verifyInvitation(invitation, secret) {
  if (typeof invitation !== 'string' || invitation.length > 2048) throw new Error('Invalid invitation');
  const { payload } = await jwtVerify(invitation, key(secret), {
    algorithms: ['HS256'], typ: 'JWT', issuer: invitationIssuer, audience: invitationAudience,
    requiredClaims: ['exp', 'iat', 'jti', 'room'], maxTokenAge: '24h',
  });
  if (typeof payload.room !== 'string' || !roomPattern.test(payload.room)
    || typeof payload.exp !== 'number' || typeof payload.iat !== 'number'
    || payload.exp - payload.iat > 86400 || payload.exp <= payload.iat) throw new Error('Invalid invitation');
  return { room: payload.room, expiresAt: payload.exp };
}
