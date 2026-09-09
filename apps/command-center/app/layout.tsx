import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppNav } from "../components/navigation/app-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "مقرفرماندهی",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="fa" dir="rtl">
      <body><AppNav />{children}</body>
    </html>
  );
}
