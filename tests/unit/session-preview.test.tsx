import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Introduction, RoomPreview } from "@/components/session-preview";

describe("disconnected interface", () => {
  it("keeps admission and capture unavailable when a test name is entered", async () => {
    const user = userEvent.setup();
    render(<Introduction />);
    await user.type(screen.getByLabelText("Temporary display name"), "Test visitor");
    expect(screen.getByRole("note")).toHaveTextContent("Disconnected demonstration");
    expect(screen.getByRole("button", { name: "Join session" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Camera off" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Microphone off" })).toBeDisabled();
    expect(screen.getByLabelText("Camera", { exact: true })).toBeDisabled();
    expect(screen.getByLabelText("Microphone", { exact: true })).toBeDisabled();
    expect(screen.getByRole("link", { name: "Explore room preview" })).toHaveAttribute("href", "/room");
    expect(screen.getByLabelText("Temporary display name")).toHaveAccessibleDescription("Use a made-up name. This field is not submitted or saved.");
  });

  it("starts a new setup without retaining the previous name", async () => {
    const user = userEvent.setup();
    const view = render(<Introduction />);
    await user.type(screen.getByLabelText("Temporary display name"), "Test visitor");
    view.unmount();
    render(<Introduction />);
    expect(screen.getByLabelText("Temporary display name")).toHaveValue("");
  });

  it("keeps diagnostics collapsed and does not imply a live connection", async () => {
    const user = userEvent.setup();
    render(<RoomPreview />);
    const summary = screen.getByText("Connection details");
    expect(summary.closest("details")).not.toHaveAttribute("open");
    await user.click(summary);
    expect(summary.closest("details")).toHaveAttribute("open");
    expect(screen.getByText("Unavailable, no SDK connection")).toBeVisible();
    expect(screen.getByRole("link", { name: "Exit preview" })).toHaveAttribute("href", "/");
    expect(screen.getByText("A place for two. No one is connected.")).toBeVisible();
  });
});
