import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Live Session Lab",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
  appleWebApp: {
    capable: true,
    title: "Session Lab",
    statusBarStyle: "default",
  },
  description:
    "A little closer, right in your browser. Join a private video call with your invite code.",
};

export const viewport: Viewport = {
  themeColor: "#4559a6",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
