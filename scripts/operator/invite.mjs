import { parseArgs } from "node:util";
import { createInvitationPair } from "../../src/lib/server/invitations.mjs";

try {
  const { values } = parseArgs({
    options: {
      minutes: { type: "string", default: "60" },
      room: { type: "string" },
      help: { type: "boolean" },
    },
  });
  if (values.help) {
    console.log("Usage: npm run invite -- [--minutes 60] [--room lsl-UUID]");
    console.log(
      "Outputs two private invitations. Give each test participant a different invitation. Reuse replaces that connection.",
    );
  } else {
    const origin = new URL(process.env.APP_ORIGIN ?? "");
    if (
      origin.origin !== process.env.APP_ORIGIN ||
      (origin.protocol !== "https:" &&
        !(origin.protocol === "http:" && ["localhost", "127.0.0.1"].includes(origin.hostname)))
    )
      throw new Error();
    const { invitations } = await createInvitationPair(
      process.env.INVITATION_SIGNING_SECRET ?? "",
      { room: values.room, validFor: Number(values.minutes) * 60 },
    );
    const output = invitations
      .map((invitation, index) => {
        const url = new URL("/", origin);
        url.hash = new URLSearchParams({ invite: invitation }).toString();
        return `Participant ${index + 1}:\n${url.href}\n`;
      })
      .join("\n");
    // Intentional credential output for local sharing. Never log it elsewhere.
    process.stdout.write(output);
  }
} catch {
  console.error(
    "Cannot create invitation. Check APP_ORIGIN, the signing secret, and command options locally.",
  );
  process.exitCode = 1;
}
