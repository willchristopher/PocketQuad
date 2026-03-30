import "./globals.css";
import { Providers } from "./providers";
export const metadata = {
    title: "PocketQuad | Campus Hub",
    description: "Intelligent university campus hub application.",
    icons: {
        icon: "/transparentlogo.png",
        apple: "/transparentlogo.png",
    },
};
export const viewport = {
    themeColor: [
        { media: "(prefers-color-scheme: light)", color: "#ffffff" },
        { media: "(prefers-color-scheme: dark)", color: "#002144" },
    ],
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
};
export default function RootLayout({ children, }) {
    return (<html lang="en" suppressHydrationWarning>
      <body className="font-body antialiased bg-background text-foreground">
        <Providers>
           {children}
        </Providers>
      </body>
    </html>);
}
