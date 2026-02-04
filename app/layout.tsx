import type React from "react"
import type { Metadata } from "next"
import { Inter, Playfair_Display, Space_Grotesk, Comfortaa } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
})

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
})

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
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
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
      <body className={`${inter.variable} ${playfair.variable} ${spaceGrotesk.variable} ${comfortaa.variable} font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
