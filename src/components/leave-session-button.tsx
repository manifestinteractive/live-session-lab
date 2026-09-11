"use client";

import { useRef, useState } from "react";
import { PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function LeaveSessionButton({ onConfirm }: { onConfirm: () => void }) {
  const [open, setOpen] = useState(false);
  const stay = useRef<HTMLButtonElement>(null);
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        aria-label="Leave session"
        title="Leave session"
        render={
          <Button
            variant="mediaEnd"
            size="icon"
            className="video-control size-[48px] rounded-full"
          />
        }
      >
        <PhoneOff data-icon="inline-start" aria-hidden="true" />
      </AlertDialogTrigger>
      <AlertDialogContent
        initialFocus={stay}
        className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] overflow-y-auto"
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Leave this call?</AlertDialogTitle>
          <AlertDialogDescription>
            Your camera and microphone will stop. You will return to the join page.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel ref={stay} className="min-h-11">
            Stay in call
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            className="min-h-11"
            onClick={() => {
              setOpen(false);
              onConfirm();
            }}
          >
            Leave call
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
