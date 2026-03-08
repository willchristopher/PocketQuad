import type { Metadata, Viewport } from "next";
import { Calistoga, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const calistoga = Calistoga({
  subsets: ["latin"],
  variable: "--font-display",
  weight: "400",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

const jetbrainsMono = JetBrains_Mono({
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
        className={`${calistoga.variable} ${inter.variable} ${jetbrainsMono.variable} font-body antialiased bg-background text-foreground`}
      >
        <Providers>
           {children}
        </Providers>
      </body>
    </html>
  );
}
