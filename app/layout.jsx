import { Inter } from "next/font/google";
import localFont from "next/font/local";

import "./globals.css";
import "./styles/styles.scss";
import ClientProviders from "./components/ClientProviders";

const aeonik = localFont({
  variable: "--font-aeonik",
  display: "swap",
  src: [
    { path: "/fonts/AEONIK-LIGHT.otf", weight: "300", style: "normal" },
    { path: "/fonts/AEONIK-REGULAR.otf", weight: "400", style: "normal" },
    { path: "/fonts/AEONIK-MEDIUM.otf", weight: "500", style: "normal" },
    { path: "/fonts/AEONIK-MEDIUM.otf", weight: "600", style: "normal" },
  ],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

export const metadata = {
  title: {
    template: "%s | FinTrack",
    default: "FinTrack - Personal Finance & Expense Tracker",
  },
  description: "Personal finance and intelligent expense tracking with quiet clarity.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${aeonik.variable} ${inter.variable} ${aeonik.className} antialiased bg-app-bg text-ink-primary`}
      >
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
