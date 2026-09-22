import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Travel Newsletter Review",
  description: "Review and export travel newsletter drafts."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}