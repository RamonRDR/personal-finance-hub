import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaRegistration } from "@/components/PwaRegistration";

export const metadata: Metadata = {
  title: "Personal Finance Hub | Demo",
  description: "Open-source personal finance dashboard with synthetic data.",
  applicationName: "Personal Finance Hub",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Finance Hub" },
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#eff7f4" };

export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return <html lang="pt-BR"><body><PwaRegistration />{children}</body></html>;
}
