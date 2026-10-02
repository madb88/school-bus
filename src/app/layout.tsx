import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Bricolage_Grotesque, Manrope } from "next/font/google";
import { AppSplash } from "@/components/app-splash";
import { PwaRegister } from "@/components/pwa-register";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { iosSplashStartupImages } from "@/lib/pwa/ios-splash";
import {
  getSiteUrl,
  rootDescription,
  rootTitle,
  siteName,
  siteShortName,
} from "@/lib/site-metadata";
import "./globals.css";

const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin", "latin-ext"],
});

const sans = Manrope({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: rootTitle,
    template: `%s · ${siteName}`,
  },
  description: rootDescription,
  applicationName: siteShortName,
  appleWebApp: {
    capable: true,
    title: siteShortName,
    statusBarStyle: "black-translucent",
    startupImage: iosSplashStartupImages(),
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    type: "website",
    locale: "pl_PL",
    siteName,
    title: rootTitle,
    description: rootDescription,
  },
  twitter: {
    card: "summary",
    title: rootTitle,
    description: rootDescription,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f6fb" },
    { media: "(prefers-color-scheme: dark)", color: "#111821" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pl"
      className={`${display.variable} ${sans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans">
        <AppSplash />
        <ThemeProvider>
          {children}
          <Toaster position="top-center" richColors closeButton />
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
        <PwaRegister />
      </body>
    </html>
  );
}
