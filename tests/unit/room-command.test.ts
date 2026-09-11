// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ create: vi.fn(), list: vi.fn(), remove: vi.fn() }));
vi.mock("livekit-server-sdk", async (original) => {
  const sdk = await original<typeof import("livekit-server-sdk")>();
  return {
    ...sdk,
    LiveKitAPI: class {
      room = { listParticipants: mocks.list, deleteRoom: mocks.remove };
      constructor(options: unknown) {
        mocks.create(options);
      }
    },
  };
});
import { ServerError } from "livekit-server-sdk";
import { runRoomCommand } from "../../scripts/operator/room.mjs";
const room = "lsl-12345678-1234-4234-8234-123456789abc";
const other = "lsl-abcdefab-1234-4234-8234-123456789abc";
const env = {
  LIVEKIT_URL: "wss://example.test",
  LIVEKIT_API_KEY: "synthetic-key",
  LIVEKIT_API_SECRET: "synthetic-secret",
  CALL_ROOM_NAME: room,
};
const notFound = () => new ServerError("TwirpError", "synthetic-private-detail", 404, "not_found");
beforeEach(() => {
  vi.clearAllMocks();
  mocks.list.mockReset().mockResolvedValue([]);
  mocks.remove.mockReset().mockResolvedValue(undefined);
});

it("reports only participant counts without mutating rooms or exposing participant details", async () => {
  mocks.list.mockResolvedValue([{ identity: "private-identity", name: "private-name" }]);
  const result = await runRoomCommand(["status"], env);
  expect(result).toEqual({ ok: true, action: "status", state: "active", participants: 1 });
  expect(mocks.list).toHaveBeenCalledWith(room);
  expect(mocks.remove).not.toHaveBeenCalled();
});
it("requires explicit confirmation before creating an administration client", async () => {
  expect(await runRoomCommand(["close"], env)).toEqual({
    ok: false,
    error: "confirmation_required",
  });
  expect(mocks.create).not.toHaveBeenCalled();
});
it("closes only the selected room and checks participants afterwards", async () => {
  expect(await runRoomCommand(["close", "--room", other, "--confirm"], env)).toEqual({
    ok: true,
    action: "close",
    state: "empty",
    participants: 0,
  });
  expect(mocks.remove).toHaveBeenCalledExactlyOnceWith(other);
  expect(mocks.list).toHaveBeenCalledExactlyOnceWith(other);
  expect(mocks.remove.mock.invocationCallOrder[0]).toBeLessThan(
    mocks.list.mock.invocationCallOrder[0],
  );
});
it("treats absent rooms as idempotent close results", async () => {
  mocks.remove.mockRejectedValue(notFound());
  mocks.list.mockRejectedValue(notFound());
  expect(await runRoomCommand(["close", "--confirm"], env)).toEqual({
    ok: true,
    action: "close",
    state: "absent",
    participants: 0,
  });
});
it("fails when participants remain after deletion", async () => {
  mocks.list.mockResolvedValue([{}]);
  expect(await runRoomCommand(["close", "--confirm"], env)).toMatchObject({
    ok: false,
    error: "participants_still_present",
  });
});
it.each([
  {},
  { ...env, CALL_ROOM_NAME: "another-room" },
  { ...env, LIVEKIT_URL: "https://example.test" },
  { ...env, LIVEKIT_URL: "wss://secret@example.test" },
  { ...env, LIVEKIT_API_SECRET: "replace-secret" },
])("rejects invalid configuration before provider access", async (input) => {
  expect(await runRoomCommand(["status"], input)).toEqual({
    ok: false,
    error: "room_operation_failed",
  });
  expect(mocks.create).not.toHaveBeenCalled();
});
it("does not expose provider errors or misreport authorization failures as absent", async () => {
  mocks.list.mockRejectedValue(
    new ServerError("TwirpError", "synthetic-secret", 401, "unauthenticated"),
  );
  expect(await runRoomCommand(["status"], env)).toEqual({
    ok: false,
    error: "room_operation_failed",
  });
});
it("does not query participants after a failed deletion", async () => {
  mocks.remove.mockRejectedValue(new Error("private-error"));
  expect(await runRoomCommand(["close", "--confirm"], env)).toEqual({
    ok: false,
    error: "room_operation_failed",
  });
  expect(mocks.list).not.toHaveBeenCalled();
});
it.each([["close", "--confirm", "extra"], ["status", "--all"], ["unknown"]])(
  "rejects unexpected arguments",
  async (...args) => {
    expect(await runRoomCommand(args, env)).toEqual({ ok: false, error: "room_operation_failed" });
    expect(mocks.create).not.toHaveBeenCalled();
  },
);
