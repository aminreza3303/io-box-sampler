import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppNav } from "../components/navigation/app-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "مقر فرماندهی",
    template: "%s | مقر فرماندهی",
  },
  description: "مرکز فرماندهی پروژه‌ها، تیم‌ها و فرایندهای نیوکاش، شاطی و تراز",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="fa" dir="rtl">
      <body><AppNav />{children}</body>
    </html>
  );
}
