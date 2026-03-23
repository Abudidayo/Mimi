import type { Metadata, Viewport } from "next";
import { Fredoka } from "next/font/google";
import { AppProviders } from "@/components/providers/AppProviders";
import "mapbox-gl/dist/mapbox-gl.css";
import "./globals.css";

const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-fredoka",
});

export const metadata: Metadata = {
  title: "mimi — AI Travel Planner",
  description: "Plan your perfect trip with mimi, your AI travel companion",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fredoka.variable} h-full antialiased`}>
      <body
        className={`min-h-dvh min-h-[100dvh] flex flex-col overscroll-none ${fredoka.className}`}
      >
        <AppProviders convexUrl={process.env.NEXT_PUBLIC_CONVEX_URL}>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
