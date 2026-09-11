import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { VideoStage } from "@/components/video-stage";
import { LeaveSessionButton } from "@/components/leave-session-button";

afterEach(() => vi.restoreAllMocks());

it("keeps the same video node and restores the page when an expanded stage unmounts", async () => {
  const user = userEvent.setup();
  const leave = vi.fn();
  const view = render(
    <>
      <button>Outside</button>
      <VideoStage allowFullscreen controls={<LeaveSessionButton onConfirm={leave} />}>
        <video aria-label="Test video" />
      </VideoStage>
    </>,
  );
  const outside = screen.getByRole("button", { name: "Outside" });
  const video = screen.getByLabelText("Test video");
  await user.click(screen.getByRole("button", { name: "Enter fullscreen" }));
  expect(screen.getByLabelText("Test video")).toBe(video);
  expect(outside.inert).toBe(true);
  expect(document.body.style.overflow).toBe("hidden");
  await user.click(screen.getByRole("button", { name: "Leave session" }));
  const dialog = screen.getByRole("alertdialog", { name: "Leave this call?" });
  expect(dialog.closest("[data-expanded]")).not.toBeNull();
  await user.click(screen.getByRole("button", { name: "Stay in call" }));
  expect(leave).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Leave session" }));
  await user.click(screen.getByRole("button", { name: "Leave call" }));
  expect(leave).toHaveBeenCalledOnce();
  view.unmount();
  expect(outside.inert).not.toBe(true);
  expect(document.body.style.overflow).toBe("");
});

it("exits a native request that completes after the stage unmounts", async () => {
  const user = userEvent.setup();
  let resolve!: () => void;
  let nativeElement: Element | null = null;
  const properties = [
    [document, "fullscreenEnabled"],
    [document, "fullscreenElement"],
    [document, "exitFullscreen"],
    [HTMLElement.prototype, "requestFullscreen"],
  ] as const;
  const originals = properties.map(([object, key]) => Object.getOwnPropertyDescriptor(object, key));
  try {
    Object.defineProperty(document, "fullscreenEnabled", { configurable: true, get: () => true });
    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      get: () => nativeElement,
    });
    const request = vi.fn(() => {
      return new Promise<void>((done) => {
        resolve = () => {
          nativeElement = stage;
          done();
        };
      });
    });
    const exit = vi.fn(async () => {
      nativeElement = null;
    });
    Object.defineProperty(HTMLElement.prototype, "requestFullscreen", {
      configurable: true,
      value: request,
    });
    Object.defineProperty(document, "exitFullscreen", { configurable: true, value: exit });
    const view = render(
      <VideoStage allowFullscreen controls={<button>Media control</button>}>
        <span>Media</span>
      </VideoStage>,
    );
    const stage = view.container.querySelector('[data-slot="video-stage"]')!;
    await user.click(screen.getByRole("button", { name: "Enter fullscreen" }));
    view.unmount();
    await act(async () => resolve());
    await waitFor(() => expect(nativeElement).toBeNull());
    expect(exit).toHaveBeenCalled();
  } finally {
    properties.forEach(([object, key], index) => {
      const original = originals[index];
      if (original) Object.defineProperty(object, key, original);
      else Reflect.deleteProperty(object, key);
    });
  }
});
