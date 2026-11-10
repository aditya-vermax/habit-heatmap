import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { AppShell } from "@/components/layout/app-shell";
import { APP_NAME, APP_TAGLINE } from "@/lib/config";
import "./globals.css";

// Fonts are self-hosted and bundled at build time. No requests to third parties.
const bricolage = localFont({
  src: "./fonts/Bricolage.woff2",
  variable: "--font-bricolage",
  weight: "200 800",
  display: "swap",
});
const plexMono = localFont({
  src: [
    { path: "./fonts/PlexMono-400.woff2", weight: "400" },
    { path: "./fonts/PlexMono-500.woff2", weight: "500" },
  ],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: APP_TAGLINE,
  applicationName: APP_NAME,
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: "default" },
  icons: { apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fcf5ee" },
    { media: "(prefers-color-scheme: dark)", color: "#1b0710" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Applies the saved theme before first paint so there is no flash. Static string, no user input.
const THEME_SCRIPT = `try{var t=localStorage.getItem("hh-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${plexMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
