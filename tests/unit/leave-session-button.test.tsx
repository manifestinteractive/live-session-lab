import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LeaveSessionButton } from "@/components/leave-session-button";

describe("leave confirmation", () => {
  it("keeps the call active on Stay or Escape and returns focus to the leave control", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(<LeaveSessionButton onConfirm={onConfirm} />);
    const trigger = screen.getByRole("button", { name: "Leave session" });
    await user.click(trigger);
    expect(screen.getByRole("alertdialog", { name: "Leave this call?" })).toBeVisible();
    await waitFor(() => expect(screen.getByRole("button", { name: "Stay in call" })).toHaveFocus());
    await user.click(screen.getByRole("button", { name: "Stay in call" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
    await user.click(trigger);
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("calls the leave handler only after explicit confirmation", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(<LeaveSessionButton onConfirm={onConfirm} />);
    await user.click(screen.getByRole("button", { name: "Leave session" }));
    expect(onConfirm).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Leave call" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });
});
