"use client";

import type { ReactNode } from "react";
import {
  ChevronUp,
  Maximize,
  Minimize,
  Mic,
  MicOff,
  RefreshCw,
  Video,
  VideoOff,
} from "lucide-react";
import { useVideoFullscreen } from "@/lib/use-video-fullscreen";
import { VideoStagePortalContext } from "@/components/video-stage-context";
import { LeaveSessionButton } from "@/components/leave-session-button";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function VideoStage({
  children,
  inset,
  controls,
  details,
  className,
  allowFullscreen = false,
}: {
  children: ReactNode;
  inset?: ReactNode;
  controls: ReactNode;
  details?: ReactNode;
  className?: string;
  allowFullscreen?: boolean;
}) {
  const { element, setElement, expanded, toggle, toggleRef } = useVideoFullscreen();
  const FullscreenIcon = expanded ? Minimize : Maximize;
  return (
    <VideoStagePortalContext value={expanded ? (element ?? undefined) : undefined}>
      <div
        ref={setElement}
        className={cn("video-stage", className)}
        data-slot="video-stage"
        data-expanded={expanded || undefined}
        role={expanded ? "dialog" : undefined}
        aria-modal={expanded || undefined}
        aria-label={expanded ? "Fullscreen video" : undefined}
      >
        <div className="video-stage-surface">
          <div className="video-stage-main">{children}</div>
          {inset && (
            <div className="video-stage-inset" data-slot="video-inset">
              {inset}
            </div>
          )}
        </div>
        <div className="video-stage-controls">{controls}</div>
        {details && <div className="video-stage-details">{details}</div>}
        {allowFullscreen && (
          <div className="video-stage-fullscreen">
            <Button
              ref={toggleRef}
              variant="mediaInfo"
              size="icon"
              className="video-control size-[44px] rounded-full"
              aria-label={expanded ? "Exit fullscreen" : "Enter fullscreen"}
              title={expanded ? "Exit fullscreen" : "Enter fullscreen"}
              aria-pressed={expanded}
              onClick={() => void toggle()}
            >
              <FullscreenIcon aria-hidden="true" />
            </Button>
          </div>
        )}
      </div>
    </VideoStagePortalContext>
  );
}

function DeviceMenu({
  kind,
  children,
  onOpen,
  refreshDisabled,
}: {
  kind: "camera" | "microphone";
  children: ReactNode;
  onOpen: () => void;
  refreshDisabled?: boolean;
}) {
  const label = kind === "camera" ? "Camera" : "Microphone";
  return (
    <Popover
      onOpenChange={(open) => {
        if (open) onOpen();
      }}
    >
      <PopoverTrigger
        aria-label={`${label} settings`}
        title={`${label} settings`}
        render={
          <Button
            variant="mediaSettings"
            size="icon"
            className="video-control size-[44px] rounded-full"
          />
        }
      >
        <ChevronUp data-icon="inline-start" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent
        side="top"
        sideOffset={12}
        className="max-h-[var(--available-height)] max-w-[calc(100vw-32px)] overflow-y-auto p-4"
      >
        <PopoverHeader className="flex-row items-center justify-between gap-2">
          <PopoverTitle className="font-semibold">{label}</PopoverTitle>
          <Button
            variant="ghost"
            size="icon"
            className="-m-3.5 size-11 shrink-0"
            aria-label="Refresh device list"
            title="Refresh device list"
            disabled={refreshDisabled}
            onClick={onOpen}
          >
            <RefreshCw aria-hidden="true" />
          </Button>
        </PopoverHeader>
        {children}
      </PopoverContent>
    </Popover>
  );
}

export function VideoControls({
  camera,
  microphone,
  disabled = false,
  onCamera,
  onMicrophone,
  onLeave,
  cameraSettings,
  microphoneSettings,
  onDeviceMenuOpen,
  deviceRefreshDisabled = false,
}: {
  camera: boolean;
  microphone: boolean;
  disabled?: boolean;
  onCamera: () => void;
  onMicrophone: () => void;
  onLeave?: () => void;
  cameraSettings: ReactNode;
  microphoneSettings: ReactNode;
  onDeviceMenuOpen: (kind: "camera" | "microphone") => void;
  deviceRefreshDisabled?: boolean;
}) {
  const microphoneLabel = microphone ? "Turn microphone off" : "Enable microphone";
  const cameraLabel = camera ? "Turn camera off" : "Enable camera";
  return (
    <div role="group" aria-label="Media controls" className="video-controls">
      <div className="video-control-pair">
        <Button
          variant={camera ? "media" : "mediaOff"}
          size="icon"
          className="video-control size-[48px] rounded-full"
          disabled={disabled}
          aria-pressed={camera}
          aria-label={cameraLabel}
          title={cameraLabel}
          onClick={onCamera}
        >
          {camera ? (
            <Video data-icon="inline-start" aria-hidden="true" />
          ) : (
            <VideoOff data-icon="inline-start" aria-hidden="true" />
          )}
        </Button>
        <DeviceMenu
          kind="camera"
          onOpen={() => onDeviceMenuOpen("camera")}
          refreshDisabled={deviceRefreshDisabled}
        >
          {cameraSettings}
        </DeviceMenu>
      </div>
      <div className="video-control-pair">
        <Button
          variant={microphone ? "media" : "mediaOff"}
          size="icon"
          className="video-control size-[48px] rounded-full"
          disabled={disabled}
          aria-pressed={microphone}
          aria-label={microphoneLabel}
          title={microphoneLabel}
          onClick={onMicrophone}
        >
          {microphone ? (
            <Mic data-icon="inline-start" aria-hidden="true" />
          ) : (
            <MicOff data-icon="inline-start" aria-hidden="true" />
          )}
        </Button>
        <DeviceMenu
          kind="microphone"
          onOpen={() => onDeviceMenuOpen("microphone")}
          refreshDisabled={deviceRefreshDisabled}
        >
          {microphoneSettings}
        </DeviceMenu>
      </div>
      {onLeave && <LeaveSessionButton onConfirm={onLeave} />}
    </div>
  );
}
