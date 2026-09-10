import { ConnectionQuality, ConnectionState, MediaDeviceFailure } from "livekit-client";
import type { InputKind } from "./call-session";

/** Return fixed messages. Provider/browser error text can contain private device details. */
export function mediaFailureMessage(error: unknown, kind: InputKind) {
  if (error && typeof error === "object" && "name" in error && error.name === "SecurityError") return "Capture is unavailable. Open the app over HTTPS or localhost in a browser that supports camera and microphone access.";
  const label = kind === "camera" ? "Camera" : "Microphone";
  const alternative = kind === "camera" ? "You can keep the camera off and use audio only." : "You can join to listen with the microphone off.";
  switch (MediaDeviceFailure.getFailure(error && typeof error === "object" ? error : {})) {
    case MediaDeviceFailure.PermissionDenied:
      return `${label} access was blocked. Allow access in this site's browser settings, then enable it again. ${alternative}`;
    case MediaDeviceFailure.NotFound:
      return `No ${kind} is available. Connect a device, then enable it again. ${alternative}`;
    case MediaDeviceFailure.DeviceInUse:
      return `${label} could not start. Close other applications using it, then enable it again. ${alternative}`;
    default:
      return `${label} is unavailable. Check the device and browser permissions, then enable it again. ${alternative}`;
  }
}

export function connectionMessage(state: ConnectionState, quality: ConnectionQuality) {
  if (state === ConnectionState.Reconnecting || state === ConnectionState.SignalReconnecting) {
    return "Connection interrupted. LiveKit is reconnecting. Media may pause; you can leave at any time.";
  }
  if (state === ConnectionState.Connecting) return "Connecting to the private session...";
  if (state === ConnectionState.Disconnected) return "Disconnected. Preview stays on this device until you join.";
  if (quality === ConnectionQuality.Lost) return "Media connection interrupted. LiveKit is checking the connection.";
  if (quality === ConnectionQuality.Poor) return "Connected with poor connection quality. Turn off the camera to reduce traffic.";
  return "Connected to the private session.";
}

export function qualityLabel(quality: ConnectionQuality, connected: boolean) {
  if (!connected) return "Unavailable";
  return ({ excellent: "Excellent", good: "Good", poor: "Poor", lost: "Lost", unknown: "Unavailable" })[quality] ?? "Unavailable";
}
