import type { Metadata, Viewport } from "next";
import { Geist, Marcellus } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Display face for titles and signs: flared, carved-letter feel that suits painted wood.
const marcellus = Marcellus({
  variable: "--font-marcellus",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Enhe Bai · Steppe Portfolio",
  description:
    "Ride a horse across the Mongolian steppe. Each ger holds a kind of work: computer vision & 3D, AI research, robotics, and full-stack products.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0e1b33",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${marcellus.variable} antialiased`}>
      <body>{children}</body>
    </html>
  );
}
