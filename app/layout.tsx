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
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased ${comfortaa.variable}`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
