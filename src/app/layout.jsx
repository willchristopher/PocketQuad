import "./globals.css";
import { Providers } from "./providers";
import { getServerAuthSnapshot } from '@/lib/auth/snapshot';
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
export default async function RootLayout({ children, }) {
    const initialAuthSnapshot = await getServerAuthSnapshot();
    return (<html lang="en" suppressHydrationWarning>
      <body className="font-body antialiased bg-background text-foreground">
        <Providers initialAuthSnapshot={initialAuthSnapshot}>
           {children}
        </Providers>
      </body>
    </html>);
}
