import type { Metadata } from "next";
import { RoomPreview } from "@/components/session-preview";

export const metadata: Metadata = { title: "Room preview | Live Session Lab" };

export default function RoomPage() {
  return <RoomPreview />;
}
