import Link from "next/link"

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold text-foreground">Moai</div>
          <div className="flex gap-6">
            <Link href="/terms" className="text-foreground hover:text-primary transition-colors">
              Terms of Use
            </Link>
            <Link href="/privacy" className="text-foreground hover:text-primary transition-colors">
              Privacy Policy
            </Link>
            <Link href="/delete" className="text-foreground hover:text-primary transition-colors">
              Delete Account
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center space-y-6">
          <h1 className="text-5xl font-bold text-foreground">Welcome to Moai</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A social fitness platform designed to help people stay consistent through AI coaching, human support, and
            shared progress.
          </p>
          {/* View Privacy Policy button removed */}
        </div>
      </main>
    </div>
  )
}
