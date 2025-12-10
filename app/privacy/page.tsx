import type { Metadata } from "next"
import PrivacyPolicyContent from "@/components/privacy-policy-content"
import TableOfContents from "@/components/table-of-contents"

export const metadata: Metadata = {
  title: "Privacy Policy | Moai",
  description:
    "Learn how Moai protects your data and privacy. Our complete privacy policy for the social fitness platform.",
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 z-40 bg-background/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <h1 className="text-3xl font-bold text-foreground">Privacy Policy</h1>
          <p className="text-muted-foreground mt-2">Last Updated: November 2024</p>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - Table of Contents */}
          <aside className="lg:col-span-1">
            <div className="sticky top-24">
              <TableOfContents />
            </div>
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-3">
            <PrivacyPolicyContent />
          </main>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border mt-20 py-12 bg-card">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-bold text-foreground mb-4">Moai LLC</h3>
              <p className="text-muted-foreground">
                A social fitness platform designed to help people stay consistent through AI coaching, human support,
                and shared progress.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Contact Us</h4>
              <p className="text-muted-foreground">
                Email:{" "}
                <a href="mailto:jay@withmoai.co" className="text-primary hover:underline">
                  jay@withmoai.co
                </a>
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
