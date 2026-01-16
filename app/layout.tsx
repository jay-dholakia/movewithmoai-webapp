import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono, Comfortaa } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })
const comfortaa = Comfortaa({ 
  subsets: ["latin"],
  variable: "--font-comfortaa",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Moai - Social Fitness Platform",
  description: "Stay consistent with AI coaching, human support, and shared progress.",
  generator: "v0.app",
  icons: {
    icon: "/favicon.ico",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        {/* Unregister any old service workers and clear cache immediately */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.getRegistrations().then(function(registrations) {
                    for(let registration of registrations) {
                      registration.unregister().then(function(success) {
                        if (success) {
                          console.log('Service worker unregistered successfully');
                          // Clear cache after unregister
                          if ('caches' in window) {
                            caches.keys().then(function(names) {
                              for (let name of names) {
                                caches.delete(name);
                              }
                            });
                          }
                        }
                      });
                    }
                  });
                }
              })();
            `,
          }}
        />
      </head>
      <body className={`font-sans antialiased ${comfortaa.variable}`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
