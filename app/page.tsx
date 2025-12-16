import Link from "next/link"
import { ArrowRight, Users, Target, TrendingUp, Smartphone, Download, Calendar, Heart } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Skip to main content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only"
      >
        Skip to main content
      </a>

      {/* Navigation */}
      <header>
        <nav
          className="sticky top-0 bg-background/95 backdrop-blur-md border-b border-border z-40 shadow-sm"
          aria-label="Main navigation"
        >
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="text-2xl font-bold">
              <Link 
                href="/" 
                aria-label="Moai home" 
                className="hover:opacity-80 transition-opacity font-comfortaa lowercase"
                style={{ color: '#2563eb' }}
              >
                moai
              </Link>
            </div>
            <div className="flex gap-6 items-center" role="list">
              <Link
                href="#features"
                className="text-foreground hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-md px-2 py-1"
              >
                Features
              </Link>
              <Link
                href="#how-it-works"
                className="text-foreground hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-md px-2 py-1"
              >
                How It Works
              </Link>
              <Link
                href="#download"
                className="text-foreground hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-md px-2 py-1"
              >
                Download
              </Link>
              <Link
                href="/terms"
                className="text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-md px-2 py-1 text-sm"
              >
                Terms
              </Link>
              <Link
                href="/privacy"
                className="text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-md px-2 py-1 text-sm"
              >
                Privacy
              </Link>
            </div>
          </div>
        </nav>
      </header>

      {/* Main content */}
      <main id="main-content" className="scroll-smooth">
        {/* Hero Section */}
        <section
          className="relative max-w-7xl mx-auto px-6 py-20 md:py-32 overflow-hidden"
          aria-labelledby="hero-heading"
        >
          {/* Background gradient */}
          <div className="absolute inset-0 gradient-card opacity-50 -z-10" />
          
          <div className="text-center space-y-8 relative z-10">
            <h1
              id="hero-heading"
              className="text-5xl md:text-7xl font-bold text-foreground leading-tight"
            >
              Build lasting fitness habits
              <br />
              together, with{" "}
              <span className="font-comfortaa lowercase text-primary">moai</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Join a community where structure, support, and shared progress help you stay
              consistent and achieve your fitness goals.
            </p>
            <div className="pt-6">
              <a
                href="#download"
                className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-xl font-semibold hover:opacity-90 transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Get Started
                <ArrowRight className="w-5 h-5" aria-hidden="true" />
              </a>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section
          id="features"
          className="max-w-7xl mx-auto px-6 py-20 md:py-32"
          aria-labelledby="features-heading"
        >
          <div className="text-center mb-20">
            <h2
              id="features-heading"
              className="text-4xl md:text-5xl font-bold text-foreground mb-6"
            >
              Why Choose Moai
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need to build lasting fitness habits, all in one place.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            <article className="bg-card p-8 lg:p-10 rounded-2xl border border-border shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <div className="mb-6">
                <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-lg">
                  <Target
                    className="w-8 h-8 text-white"
                    aria-hidden="true"
                  />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-4">
                Structured Plans
              </h3>
              <p className="text-muted-foreground leading-relaxed text-lg">
                Follow personalized workout plans designed to build consistency. Clear structure
                helps you know exactly what to do, when to do it, and how to progress.
              </p>
            </article>

            <article className="bg-card p-8 lg:p-10 rounded-2xl border border-border shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <div className="mb-6">
                <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-lg">
                  <Users
                    className="w-8 h-8 text-white"
                    aria-hidden="true"
                  />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-4">
                Real Support
              </h3>
              <p className="text-muted-foreground leading-relaxed text-lg">
                Connect with certified fitness coaches and join Moai groups for accountability.
                Get guidance, motivation, and encouragement from real people who understand your
                journey.
              </p>
            </article>

            <article className="bg-card p-8 lg:p-10 rounded-2xl border border-border shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <div className="mb-6">
                <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-lg">
                  <TrendingUp
                    className="w-8 h-8 text-white"
                    aria-hidden="true"
                  />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-4">
                Shared Progress
              </h3>
              <p className="text-muted-foreground leading-relaxed text-lg">
                Celebrate milestones together and see your fitness journey unfold. Track your
                progress alongside your Moai group and stay motivated by shared achievements.
              </p>
            </article>
          </div>
        </section>

        {/* How It Works Section */}
        <section
          id="how-it-works"
          className="max-w-7xl mx-auto px-6 py-20 md:py-32 bg-[#F2F2F7]"
          aria-labelledby="how-it-works-heading"
        >
          <div className="text-center mb-20">
            <h2
              id="how-it-works-heading"
              className="text-4xl md:text-5xl font-bold text-foreground mb-6"
            >
              How It Works
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Getting started with Moai is simple. Follow these steps to begin your fitness
              journey.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 max-w-5xl mx-auto">
            <div className="text-center relative">
              <div className="w-20 h-20 rounded-full gradient-primary text-white flex items-center justify-center text-3xl font-bold mx-auto mb-6 shadow-lg">
                1
              </div>
              <div className="bg-card p-6 rounded-2xl shadow-sm">
                <Calendar className="w-10 h-10 text-primary mx-auto mb-4" aria-hidden="true" />
                <h3 className="text-xl font-bold text-foreground mb-3">
                  Download the App
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Get the Moai app on your iOS or Android device to start your fitness journey.
                </p>
              </div>
            </div>

            <div className="text-center relative">
              <div className="hidden md:block absolute top-10 -left-6 w-12 h-0.5 bg-primary" />
              <div className="w-20 h-20 rounded-full gradient-primary text-white flex items-center justify-center text-3xl font-bold mx-auto mb-6 shadow-lg">
                2
              </div>
              <div className="bg-card p-6 rounded-2xl shadow-sm">
                <Target className="w-10 h-10 text-primary mx-auto mb-4" aria-hidden="true" />
                <h3 className="text-xl font-bold text-foreground mb-3">
                  Set Your Goals
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Tell us about your fitness goals, preferences, and current level to get a
                  personalized plan.
                </p>
              </div>
            </div>

            <div className="text-center relative">
              <div className="hidden md:block absolute top-10 -left-6 w-12 h-0.5 bg-primary" />
              <div className="w-20 h-20 rounded-full gradient-primary text-white flex items-center justify-center text-3xl font-bold mx-auto mb-6 shadow-lg">
                3
              </div>
              <div className="bg-card p-6 rounded-2xl shadow-sm">
                <Heart className="w-10 h-10 text-primary mx-auto mb-4" aria-hidden="true" />
                <h3 className="text-xl font-bold text-foreground mb-3">
                  Start Your Journey
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Begin working out with structured plans, connect with coaches, and join Moai
                  groups for support and accountability.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA / Download Section */}
        <section
          id="download"
          className="max-w-7xl mx-auto px-6 py-20 md:py-32"
          aria-labelledby="download-heading"
        >
          <div className="text-center mb-16">
            <h2
              id="download-heading"
              className="text-4xl md:text-5xl font-bold text-foreground mb-6"
            >
              Get Started Today
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Download the Moai app and join thousands of people building better fitness
              habits together.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center max-w-2xl mx-auto">
            <a
              href="https://apps.apple.com/us/app/moai/id6749557946"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 w-full sm:w-auto px-8 py-4 bg-black text-white rounded-xl font-semibold hover:opacity-90 transition-all focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              aria-label="Download Moai on the App Store"
            >
              <Smartphone className="w-6 h-6" aria-hidden="true" />
              <span>Download on the App Store</span>
            </a>

            <a
              href="https://play.google.com/store/apps/details?id=com.jaydholakia.movewithmoai"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 w-full sm:w-auto px-8 py-4 bg-[#3ddc84] text-black rounded-xl font-semibold hover:opacity-90 transition-all focus:outline-none focus:ring-2 focus:ring-[#3ddc84] focus:ring-offset-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              aria-label="Get Moai on Google Play"
            >
              <Download className="w-6 h-6" aria-hidden="true" />
              <span>Get it on Google Play</span>
            </a>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-[#F2F2F7]">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-xl font-bold">
              <span className="font-comfortaa lowercase" style={{ color: '#2563eb' }}>
                moai
              </span>
            </div>
            <nav aria-label="Footer navigation">
              <div className="flex flex-wrap gap-6 justify-center" role="list">
                <Link
                  href="/terms"
                  className="text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-md px-2 py-1"
                >
                  Terms of Use
                </Link>
                <Link
                  href="/privacy"
                  className="text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-md px-2 py-1"
                >
                  Privacy Policy
                </Link>
                <Link
                  href="/delete"
                  className="text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-md px-2 py-1"
                >
                  Delete Account
                </Link>
              </div>
            </nav>
          </div>
          <div className="mt-8 text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} Moai. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
