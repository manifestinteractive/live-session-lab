// @vitest-environment node
import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";

const sdk = vi.hoisted(() => ({ camera: vi.fn(), microphone: vi.fn(), connect: vi.fn(), publish: vi.fn(), cameraToggle: vi.fn(), microphoneToggle: vi.fn(), disconnect: vi.fn(), switchDevice: vi.fn() }));
vi.mock("livekit-client", async () => {
  const { EventEmitter } = await import("node:events");
  return {
    ConnectionState: { Connected: "connected", Disconnected: "disconnected" },
    RoomEvent: { Disconnected: "disconnected" }, TrackEvent: { Ended: "ended" },
    Track: { Source: { Camera: "camera", Microphone: "microphone" } },
    LogLevel: { silent: 5 }, setLogLevel: vi.fn(),
    createLocalAudioTrack: sdk.microphone, createLocalVideoTrack: sdk.camera,
    Room: class extends EventEmitter {
      state = "disconnected";
      localParticipant = { publishTrack: sdk.publish, setCameraEnabled: sdk.cameraToggle, setMicrophoneEnabled: sdk.microphoneToggle, isCameraEnabled: false, isMicrophoneEnabled: false };
      connect = async () => { await sdk.connect(); this.state = "connected"; };
      switchActiveDevice = sdk.switchDevice;
      disconnect = async (stop: boolean) => { sdk.disconnect(stop); this.state = "disconnected"; this.emit("disconnected"); };
    },
  };
});
import { CallSession } from "@/lib/call-session";

function track() {
  return Object.assign(new EventEmitter(), { isMuted: false, mediaStreamTrack: { readyState: "live" }, stop: vi.fn(), restartTrack: vi.fn().mockResolvedValue(undefined) });
}
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((done) => { resolve = done; }); return { promise, resolve }; }

beforeEach(() => {
  vi.clearAllMocks();
  sdk.connect.mockResolvedValue(undefined);
  sdk.publish.mockResolvedValue(undefined);
  sdk.switchDevice.mockResolvedValue(true);
  sdk.camera.mockResolvedValue(track());
  sdk.microphone.mockResolvedValue(track());
});

describe("LiveKit capture ownership", () => {
  it("starts with no capture and stops preview when disabled", async () => {
    const session = new CallSession(vi.fn());
    expect(sdk.camera).not.toHaveBeenCalled();
    expect(sdk.microphone).not.toHaveBeenCalled();
    await session.toggle("camera");
    const camera = session.tracks.get("camera")!;
    expect(session.enabled("camera")).toBe(true);
    await session.toggle("camera");
    expect(camera.stop).toHaveBeenCalled();
    expect(session.enabled("camera")).toBe(false);
    session.dispose();
  });

  it("publishes the existing preview tracks without acquiring duplicates", async () => {
    const session = new CallSession(vi.fn());
    await session.toggle("camera");
    await session.toggle("microphone");
    const tracks = [...session.tracks.values()];
    await session.join("wss://example.test", "synthetic-token");
    expect(sdk.camera).toHaveBeenCalledTimes(1);
    expect(sdk.microphone).toHaveBeenCalledTimes(1);
    expect(sdk.publish).toHaveBeenCalledWith(tracks[0], { source: "camera" });
    expect(sdk.publish).toHaveBeenCalledWith(tracks[1], { source: "microphone" });
    await session.leave();
    for (const media of tracks) expect(media.stop).toHaveBeenCalled();
    expect(sdk.disconnect).toHaveBeenCalledWith(true);
    expect(session.tracks.size).toBe(0);
  });

  it.each(["connect", "publish"])("stops preview when %s fails, then permits rejoin", async (failure) => {
    const session = new CallSession(vi.fn());
    await session.toggle("camera");
    const media = session.tracks.get("camera")!;
    if (failure === "connect") sdk.connect.mockRejectedValueOnce(new Error());
    else sdk.publish.mockRejectedValueOnce(new Error());
    await expect(session.join("wss://example.test", "synthetic-token")).rejects.toThrow("Connection failed");
    expect(media.stop).toHaveBeenCalled();
    expect(session.tracks.size).toBe(0);
    await session.join("wss://example.test", "synthetic-token");
    expect(session.room.state).toBe("connected");
    await session.leave();
  });

  it("stops a permission result received after unmount", async () => {
    const wait = deferred<ReturnType<typeof track>>();
    sdk.camera.mockReturnValueOnce(wait.promise);
    const session = new CallSession(vi.fn());
    const pending = session.toggle("camera");
    session.dispose();
    const media = track();
    wait.resolve(media);
    await pending;
    expect(media.stop).toHaveBeenCalled();
    expect(session.tracks.size).toBe(0);
  });

  it("does not duplicate capture on overlapping preview actions", async () => {
    const wait = deferred<ReturnType<typeof track>>();
    sdk.camera.mockReturnValueOnce(wait.promise);
    const session = new CallSession(vi.fn());
    const first = session.toggle("camera");
    await session.toggle("camera");
    expect(sdk.camera).toHaveBeenCalledTimes(1);
    wait.resolve(track());
    await first;
    session.dispose();
  });

  it("does not publish after cancelling a pending join", async () => {
    const wait = deferred<void>();
    sdk.connect.mockReturnValueOnce(wait.promise);
    const session = new CallSession(vi.fn());
    await session.toggle("camera");
    const pending = session.join("wss://example.test", "synthetic-token");
    await session.leave();
    wait.resolve();
    await expect(pending).rejects.toThrow("Connection failed");
    expect(sdk.publish).not.toHaveBeenCalled();
    expect(session.room.state).toBe("disconnected");
  });

  it("switches the existing preview track and releases a late device switch", async () => {
    const session = new CallSession(vi.fn());
    const media = track();
    sdk.camera.mockResolvedValueOnce(media);
    await session.toggle("camera");
    const wait = deferred<void>();
    media.restartTrack.mockReturnValueOnce(wait.promise);
    const pending = session.select("camera", "synthetic-device");
    session.dispose();
    wait.resolve();
    await pending;
    expect(media.restartTrack).toHaveBeenCalledWith({ deviceId: "synthetic-device" });
    expect(media.stop).toHaveBeenCalled();
  });

  it("uses observed SDK state for connected mute actions", async () => {
    const session = new CallSession(vi.fn());
    await session.join("wss://example.test", "synthetic-token");
    await session.toggle("camera");
    expect(sdk.cameraToggle).toHaveBeenCalledWith(true);
    expect(sdk.camera).not.toHaveBeenCalled();
    // No optimistic media state is stored in the session controller.
    expect(session.enabled("camera")).toBe(false);
    await session.leave();
  });
});
