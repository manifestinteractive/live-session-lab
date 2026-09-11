import {
  ConnectionState,
  createLocalAudioTrack,
  createLocalVideoTrack,
  LocalAudioTrack,
  LocalVideoTrack,
  LogLevel,
  Room,
  RoomEvent,
  setLogLevel,
  Track,
  TrackEvent,
} from "livekit-client";

export type InputKind = "camera" | "microphone";
export type PreviewTrack = LocalAudioTrack | LocalVideoTrack;

export class DeviceAccessError extends Error {
  constructor(cause: unknown) {
    super("Device access failed", { cause });
  }
}

/** Owns local preview tracks, transfers them by publishing, and releases all capture on exit. */
export class CallSession {
  readonly room: Room;
  readonly tracks = new Map<InputKind, PreviewTrack>();
  endedDevice: InputKind | null = null;
  private generation = 0;
  private disposed = false;
  private busy = false;
  private discoveryStream?: MediaStream;

  constructor(private changed: () => void) {
    setLogLevel(LogLevel.silent);
    this.room = new Room({
      adaptiveStream: true,
      dynacast: true,
      videoCaptureDefaults: { resolution: { width: 640, height: 360, frameRate: 24 } },
    });
    this.room.on(RoomEvent.Disconnected, this.releasePreview);
  }

  private releasePreview = () => {
    this.discoveryStream?.getTracks().forEach((track) => track.stop());
    this.discoveryStream = undefined;
    for (const track of this.tracks.values()) track.stop();
    this.tracks.clear();
    this.endedDevice = null;
    this.changed();
  };

  enabled(kind: InputKind) {
    const track = this.tracks.get(kind);
    return !!track && !track.isMuted && track.mediaStreamTrack.readyState === "live";
  }

  /** Discover one input type without attaching or publishing the temporary stream. */
  async discoverDevices(kind: InputKind) {
    if (this.busy || this.disposed) throw new DOMException("Discovery cancelled", "AbortError");
    this.busy = true;
    const generation = this.generation;
    let stream: MediaStream | undefined;
    const checkCurrent = () => {
      if (this.disposed || generation !== this.generation)
        throw new DOMException("Discovery cancelled", "AbortError");
    };
    try {
      let devices = await navigator.mediaDevices.enumerateDevices();
      checkCurrent();
      const inputs = devices.filter(
        (device) => device.kind === (kind === "camera" ? "videoinput" : "audioinput"),
      );
      const local = this.room.localParticipant;
      const inUse =
        this.enabled(kind) ||
        (kind === "camera" ? local.isCameraEnabled : local.isMicrophoneEnabled);
      if (
        !inUse &&
        (!inputs.length || inputs.some((device) => !device.deviceId || !device.label))
      ) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: kind === "camera",
            audio: kind === "microphone",
          });
        } catch (error) {
          throw new DeviceAccessError(error);
        }
        checkCurrent();
        this.discoveryStream = stream;
        // Read labels while access is active, before Safari can redact them again.
        devices = await navigator.mediaDevices.enumerateDevices();
        checkCurrent();
      }
      return devices;
    } finally {
      stream?.getTracks().forEach((track) => track.stop());
      if (this.discoveryStream === stream) this.discoveryStream = undefined;
      this.busy = false;
    }
  }

  async toggle(kind: InputKind, deviceId?: string) {
    if (this.busy || this.disposed) return;
    this.busy = true;
    const generation = this.generation;
    this.endedDevice = null;
    try {
      if (this.room.state === ConnectionState.Connected) {
        const local = this.room.localParticipant;
        if (kind === "camera")
          await local.setCameraEnabled(
            !local.isCameraEnabled,
            deviceId ? { deviceId: { exact: deviceId } } : undefined,
          );
        else
          await local.setMicrophoneEnabled(
            !local.isMicrophoneEnabled,
            deviceId ? { deviceId: { exact: deviceId } } : undefined,
          );
        if (this.disposed || generation !== this.generation) await this.room.disconnect(true);
      } else if (this.enabled(kind)) {
        this.tracks.get(kind)?.stop();
        this.tracks.delete(kind);
      } else {
        this.tracks.get(kind)?.stop();
        const track =
          kind === "camera"
            ? await createLocalVideoTrack({
                resolution: { width: 640, height: 360, frameRate: 24 },
                ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
              })
            : await createLocalAudioTrack(deviceId ? { deviceId: { exact: deviceId } } : undefined);
        if (this.disposed || generation !== this.generation) {
          track.stop();
          return;
        }
        track.on(TrackEvent.Ended, () => {
          if (this.disposed || this.tracks.get(kind) !== track) return;
          this.endedDevice = kind;
          this.changed();
        });
        track.on(TrackEvent.Restarted, () => {
          if (this.disposed || this.tracks.get(kind) !== track) return;
          this.endedDevice = null;
          this.changed();
        });
        this.tracks.set(kind, track);
      }
    } finally {
      this.busy = false;
      this.changed();
    }
  }

  async select(kind: InputKind, deviceId: string) {
    if (this.busy || this.disposed || !deviceId) return;
    this.busy = true;
    const generation = this.generation;
    const track = this.tracks.get(kind);
    try {
      if (this.room.state === ConnectionState.Connected) {
        const changed = await this.room.switchActiveDevice(
          kind === "camera" ? "videoinput" : "audioinput",
          deviceId,
        );
        if (!changed) throw new Error("Device unavailable");
      } else if (track && this.enabled(kind)) await track.restartTrack({ deviceId });
    } finally {
      if (this.disposed || generation !== this.generation) {
        track?.stop();
        await this.room.disconnect(true);
      }
      this.busy = false;
      this.changed();
    }
  }

  async join(serverUrl: string, token: string) {
    if (this.busy || this.disposed) throw new Error("Session unavailable");
    this.busy = true;
    const generation = this.generation;
    try {
      await this.room.connect(serverUrl, token);
      if (this.disposed || generation !== this.generation) throw new Error("Join cancelled");
      for (const [kind, track] of this.tracks) {
        if (!this.enabled(kind)) continue;
        await this.room.localParticipant.publishTrack(track, {
          source: kind === "camera" ? Track.Source.Camera : Track.Source.Microphone,
        });
        if (this.disposed || generation !== this.generation) throw new Error("Join cancelled");
      }
    } catch {
      await this.leave();
      throw new Error("Connection failed");
    } finally {
      this.busy = false;
      this.changed();
    }
  }

  async leave() {
    this.generation += 1;
    this.releasePreview();
    // Also stops tracks enabled after joining, which are owned by the SDK.
    await this.room.disconnect(true);
  }

  dispose() {
    this.disposed = true;
    this.changed = () => {};
    this.room.off(RoomEvent.Disconnected, this.releasePreview);
    void this.leave().catch(() => {});
  }
}
