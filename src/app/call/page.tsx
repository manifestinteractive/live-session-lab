import type { Metadata } from "next";
import { PrivateCall } from "@/components/private-call";

export const metadata: Metadata = { title: "Private call | Live Session Lab", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default function CallPage() { return <PrivateCall />; }
