import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const nunitoDisplay = Nunito({
  subsets: ["latin"],
  variable: "--font-display",
});

const nunitoBody = Nunito({
  subsets: ["latin"],
  variable: "--font-body",
});

const nunitoMono = Nunito({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "PocketQuad | Campus Hub",
  description: "Intelligent university campus hub application.",
  icons: {
    icon: "/transparentlogo.png",
    apple: "/transparentlogo.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAFAFA" },
    { media: "(prefers-color-scheme: dark)", color: "#0F172A" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${nunitoDisplay.variable} ${nunitoBody.variable} ${nunitoMono.variable} font-body antialiased bg-background text-foreground`}
      >
        <Providers>
           {children}
        </Providers>
      </body>
    </html>
  );
}
