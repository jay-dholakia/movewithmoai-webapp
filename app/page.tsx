import Link from "next/link"
import { ArrowRight, Users, Target, TrendingUp, Smartphone, Download, Calendar, Heart, GraduationCap, Repeat } from "lucide-react"
import FAQSection from "@/components/faq-section"

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
          className="sticky top-0 bg-background/98 backdrop-blur-md border-b border-border z-40 shadow-crisp"
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
            </div>
          </div>
        </nav>
      </header>

      {/* Main content */}
      <main id="main-content" className="scroll-smooth">
        {/* Hero Section */}
        <section
          className="relative py-20 md:py-32 isolate"
          aria-labelledby="hero-heading"
        >
          {/* Animated background - full width */}
          <div className="absolute inset-0 hero-animated-bg" style={{ zIndex: -1 }} />
          
          {/* Animated blobs - full width */}
          <div className="hero-blob hero-blob-1" style={{ zIndex: -1 }} aria-hidden="true" />
          <div className="hero-blob hero-blob-2" style={{ zIndex: -1 }} aria-hidden="true" />
          <div className="hero-blob hero-blob-3" style={{ zIndex: -1 }} aria-hidden="true" />
          
          {/* Content container */}
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center space-y-8 relative">
              <h1
                id="hero-heading"
                className="text-5xl md:text-7xl font-bold text-foreground leading-tight"
              >
                Build lasting fitness habits
                <br />
                together, with{" "}
                <span className="font-comfortaa lowercase text-primary">moai</span>
              </h1>
              <p className="text-xl md:text-2xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
                Transform your fitness with personalized plans, expert guidance, and a community that keeps you accountable.
              </p>
              <div className="pt-6">
                <a
                  href="#download"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-xl font-semibold hover:opacity-95 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 shadow-crisp-lg hover:shadow-crisp-xl transform hover:-translate-y-0.5"
                >
                  Get Started
                  <ArrowRight className="w-5 h-5" aria-hidden="true" />
                </a>
              </div>
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
            <p className="text-lg md:text-xl text-gray-700 max-w-2xl mx-auto">
              Everything you need for consistent workouts, personalized guidance, and community support.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            <article className="bg-card p-8 lg:p-10 rounded-2xl border border-border shadow-crisp hover:shadow-crisp-lg transition-all duration-200 hover:-translate-y-0.5">
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
              <p className="text-gray-700 leading-relaxed text-lg">
                Follow personalized workout plans designed to build consistency. Clear structure
                helps you know exactly what to do, when to do it, and how to progress.
              </p>
            </article>

            <article className="bg-card p-8 lg:p-10 rounded-2xl border border-border shadow-crisp hover:shadow-crisp-lg transition-all duration-200 hover:-translate-y-0.5">
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
              <p className="text-gray-700 leading-relaxed text-lg">
                Connect with certified fitness coaches and join Moai groups for accountability.
                Get guidance, motivation, and encouragement from real people who understand your
                journey.
              </p>
            </article>

            <article className="bg-card p-8 lg:p-10 rounded-2xl border border-border shadow-crisp hover:shadow-crisp-lg transition-all duration-200 hover:-translate-y-0.5">
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
              <p className="text-gray-700 leading-relaxed text-lg">
                Celebrate milestones together and see your fitness journey unfold. Track your
                progress alongside your Moai group and stay motivated by shared achievements.
              </p>
            </article>
          </div>
        </section>

        {/* How It Works Section */}
        <section
          id="how-it-works"
          className="max-w-7xl mx-auto px-6 py-20 md:py-32 bg-gray-50"
          aria-labelledby="how-it-works-heading"
        >
          <div className="text-center mb-20">
            <h2
              id="how-it-works-heading"
              className="text-4xl md:text-5xl font-bold text-foreground mb-6"
            >
              How It Works
            </h2>
            <p className="text-lg md:text-xl text-gray-700 max-w-2xl mx-auto">
              Getting started is simple. Follow these steps to transform your workout routine.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8 max-w-6xl mx-auto">
            <div className="text-center relative">
              <div className="w-20 h-20 rounded-full gradient-primary text-white flex items-center justify-center text-3xl font-bold mx-auto mb-6 shadow-lg">
                1
              </div>
              <div className="bg-card p-6 rounded-2xl shadow-crisp border border-border/50">
                <Calendar className="w-10 h-10 text-primary mx-auto mb-4" aria-hidden="true" />
                <h3 className="text-xl font-bold text-foreground mb-3">
                  Download the App
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  Get the Moai app on your iOS or Android device and create your account.
                </p>
              </div>
            </div>

            <div className="text-center relative">
              <div className="hidden md:block absolute top-10 -left-3 w-6 h-0.5 bg-primary" />
              <div className="w-20 h-20 rounded-full gradient-primary text-white flex items-center justify-center text-3xl font-bold mx-auto mb-6 shadow-lg">
                2
              </div>
              <div className="bg-card p-6 rounded-2xl shadow-crisp border border-border/50">
                <Target className="w-10 h-10 text-primary mx-auto mb-4" aria-hidden="true" />
                <h3 className="text-xl font-bold text-foreground mb-3">
                  Set Your Goals
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  Share your preferences, experience level, and what you want to achieve to receive
                  a customized program.
                </p>
              </div>
            </div>

            <div className="text-center relative">
              <div className="hidden md:block absolute top-10 -left-3 w-6 h-0.5 bg-primary" />
              <div className="w-20 h-20 rounded-full gradient-primary text-white flex items-center justify-center text-3xl font-bold mx-auto mb-6 shadow-lg">
                3
              </div>
              <div className="bg-card p-6 rounded-2xl shadow-crisp border border-border/50">
                <Users className="w-10 h-10 text-primary mx-auto mb-4" aria-hidden="true" />
                <h3 className="text-xl font-bold text-foreground mb-3">
                  Bring Your People
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  Add friends and family to your Village and create smaller pods called Moais for added accountability and support.
                </p>
              </div>
            </div>

            <div className="text-center relative">
              <div className="hidden md:block absolute top-10 -left-3 w-6 h-0.5 bg-primary" />
              <div className="w-20 h-20 rounded-full gradient-primary text-white flex items-center justify-center text-3xl font-bold mx-auto mb-6 shadow-lg">
                4
              </div>
              <div className="bg-card p-6 rounded-2xl shadow-crisp border border-border/50">
                <GraduationCap className="w-10 h-10 text-primary mx-auto mb-4" aria-hidden="true" />
                <h3 className="text-xl font-bold text-foreground mb-3">
                  Connect with Coaches
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  Tap into expert guidance from real certified fitness coaches for personalized support and program adjustments.
                </p>
              </div>
            </div>

            <div className="text-center relative">
              <div className="hidden md:block absolute top-10 -left-3 w-6 h-0.5 bg-primary" />
              <div className="w-20 h-20 rounded-full gradient-primary text-white flex items-center justify-center text-3xl font-bold mx-auto mb-6 shadow-lg">
                5
              </div>
              <div className="bg-card p-6 rounded-2xl shadow-crisp border border-border/50">
                <Repeat className="w-10 h-10 text-primary mx-auto mb-4" aria-hidden="true" />
                <h3 className="text-xl font-bold text-foreground mb-3">
                  Build Lasting Habits
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  Stay consistent with structured workouts, track your progress, and make fitness a natural part of your routine.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="bg-white">
          <FAQSection />
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
            <p className="text-lg md:text-xl text-gray-700 max-w-2xl mx-auto">
              Join a community of people staying consistent, hitting their goals, and
              supporting each other.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center max-w-2xl mx-auto">
            <a
              href="https://apps.apple.com/us/app/moai/id6749557946"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 w-full sm:w-auto px-8 py-4 bg-black text-white rounded-xl font-semibold hover:opacity-95 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 shadow-crisp-lg hover:shadow-crisp-xl transform hover:-translate-y-0.5"
              aria-label="Download Moai on the App Store"
            >
              <Smartphone className="w-6 h-6" aria-hidden="true" />
              <span>Download on the App Store</span>
            </a>

            <a
              href="https://play.google.com/store/apps/details?id=com.jaydholakia.movewithmoai"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 w-full sm:w-auto px-8 py-4 bg-[#3ddc84] text-black rounded-xl font-semibold hover:opacity-95 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#3ddc84] focus:ring-offset-2 shadow-crisp-lg hover:shadow-crisp-xl transform hover:-translate-y-0.5"
              aria-label="Get Moai on Google Play"
            >
              <Download className="w-6 h-6" aria-hidden="true" />
              <span>Get it on Google Play</span>
            </a>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Logo and Copyright */}
            <div className="md:col-span-1">
              <div className="text-2xl font-bold mb-4">
                <span className="font-comfortaa lowercase" style={{ color: '#ffffff' }}>
                  moai
                </span>
              </div>
              <p className="text-sm text-slate-400">
                &copy; {new Date().getFullYear()} Moai. All rights reserved.
              </p>
            </div>

            {/* Navigation Links - Left Column */}
            <div>
              <nav aria-label="Footer navigation">
                <ul className="space-y-3">
                  <li>
                    <Link
                      href="#features"
                      className="text-slate-300 hover:text-white transition-colors text-sm"
                    >
                      Features
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="#how-it-works"
                      className="text-slate-300 hover:text-white transition-colors text-sm"
                    >
                      How It Works
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="#faq"
                      className="text-slate-300 hover:text-white transition-colors text-sm"
                    >
                      FAQ
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="#download"
                      className="text-slate-300 hover:text-white transition-colors text-sm"
                    >
                      Download
                    </Link>
                  </li>
                </ul>
              </nav>
            </div>

            {/* Navigation Links - Right Column */}
            <div>
              <nav aria-label="Footer legal navigation">
                <ul className="space-y-3">
                  <li>
                    <Link
                      href="/terms"
                      className="text-slate-300 hover:text-white transition-colors text-sm"
                    >
                      Terms of Service
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/privacy"
                      className="text-slate-300 hover:text-white transition-colors text-sm"
                    >
                      Privacy Policy
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/delete"
                      className="text-slate-300 hover:text-white transition-colors text-sm"
                    >
                      Delete Account
                    </Link>
                  </li>
                  <li>
                    <a
                      href="https://www.instagram.com/_withmoai/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-300 hover:text-white transition-colors text-sm inline-flex items-center gap-2"
                      aria-label="Follow us on Instagram"
                    >
                      <svg
                        className="w-4 h-4"
                        viewBox="0 0 512 512"
                        fill="currentColor"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M349.33 69.33a93.62 93.62 0 0193.34 93.34v186.66a93.62 93.62 0 01-93.34 93.34H162.67a93.62 93.62 0 01-93.34-93.34V162.67a93.62 93.62 0 0193.34-93.34h186.66m0-37.33H162.67C90.8 32 32 90.8 32 162.67v186.66C32 421.2 90.8 480 162.67 480h186.66C421.2 480 480 421.2 480 349.33V162.67C480 90.8 421.2 32 349.33 32z" />
                        <path d="M377.33 162.67a28 28 0 1128-28 27.94 27.94 0 01-28 28zM256 181.33A74.67 74.67 0 11181.33 256 74.75 74.75 0 01256 181.33m0-37.33a112 112 0 10112 112 112 112 0 00-112-112z" />
                      </svg>
                      Instagram
                    </a>
                  </li>
                </ul>
              </nav>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="pt-8 border-t border-slate-800">
            <p className="text-xs text-slate-400 max-w-4xl">
              Moai provides fitness guidance and workout programs. Always consult with a healthcare provider before starting any new fitness program, especially if you have pre-existing health conditions or injuries.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
