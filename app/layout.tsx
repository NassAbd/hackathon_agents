import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "GHOST — The context between your apps",
  description: "The prompt isn’t what you type. The prompt is what you do.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
