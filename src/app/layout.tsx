import { Suspense } from "react";
import "@/styles/globals.css";

import { SiteHeader } from "@/components/layouts/site-header";
import { ThemeProvider } from "@/components/providers";
import { TailwindIndicator } from "@/components/tailwind-indicator";
import { Toaster } from "@/components/ui/sonner";
import { DuckDBProvider } from "@/hooks/duckdb-context";

import { fontMono, fontSans } from "@/utils/fonts";
import type { Metadata, Viewport } from "next";
import { siteConfig } from "@/config/site";
import { cn } from "@/utils/utils";

// import Script from "next/script";

// export const metadata: Metadata = {
//   metadataBase: new URL(siteConfig.url),
//   title: {
//     default: siteConfig.name,
//     template: `%s - ${siteConfig.name}`,
//   },
//   description: siteConfig.description,
//   keywords: [
//     "nextjs",
//     "react",
//     "react server components",
//     "table",
//     "react-table",
//     "tanstack-table",
//     "shadcn-table",
//   ],
//   authors: [
//     {
//       name: "sadmann7",
//       url: "https://www.sadmn.com",
//     },
//   ],
//   creator: "sadmann7",
//   openGraph: {
//     type: "website",
//     locale: "en_US",
//     url: siteConfig.url,
//     title: siteConfig.name,
//     description: siteConfig.description,
//     siteName: siteConfig.name,
//   },
//   twitter: {
//     card: "summary_large_image",
//     title: siteConfig.name,
//     description: siteConfig.description,
//     images: [`${siteConfig.url}/og.jpg`],
//     creator: "@sadmann17",
//   },
//   icons: {
//     icon: "/icon.png",
//   },
//   manifest: `${siteConfig.url}/site.webmanifest`,
// };

export const viewport: Viewport = {
  colorScheme: "dark light",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

export default function RootLayout({ children }: React.PropsWithChildren) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preload critical WASM files to improve initial loading */}
        <link
          rel="preload"
          href="/duckdb-wasm/duckdb-mvp.wasm"
          as="fetch"
          crossOrigin="anonymous"
        />
      </head>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable,
          fontMono.variable
        )}
      >
        {/* <Script
          defer
          data-site-id={siteConfig.url}
          src="https://assets.onedollarstats.com/stonks.js"
        /> */}
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="relative flex min-h-screen flex-col">
            <SiteHeader />

            <main className="container flex-1 p-8">
              <Suspense fallback={<p>Loading app...</p>}>
                <DuckDBProvider>{children}</DuckDBProvider>
              </Suspense>
            </main>
          </div>
          <TailwindIndicator />
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
