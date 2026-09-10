import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Live Session Lab",
  description: "An independent experiment with browser video. This version is a disconnected interface demonstration.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
