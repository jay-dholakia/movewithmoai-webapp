"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const NAV_LINKS = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/product", label: "Product" },
  { href: "/coaches", label: "Coaches" },
  { href: "/faq", label: "FAQ" },
] as const;

export function MarketingNav() {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      const heroHeight = window.innerHeight * 0.6;

      // Show/hide based on scroll direction after hero
      if (currentY > heroHeight) {
        if (
          currentY > lastScrollY.current &&
          currentY - lastScrollY.current > 5
        ) {
          setHidden(true);
        } else if (lastScrollY.current - currentY > 5) {
          setHidden(false);
        }
        setScrolled(true);
      } else {
        setScrolled(false);
        setHidden(false);
      }

      lastScrollY.current = currentY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Mirror reflection animation
  useEffect(() => {
    if (!mirrorRef.current) return;

    gsap.to(mirrorRef.current, {
      opacity: scrolled ? 0.08 : 0.15,
      scaleY: scrolled ? 0.6 : 1,
      duration: 0.4,
      ease: "power2.out",
    });
  }, [scrolled]);

  // Entrance animation
  useEffect(() => {
    if (!navRef.current) return;

    gsap.fromTo(
      navRef.current,
      { y: -100, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, ease: "power3.out", delay: 0.2 },
    );
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      {/* Main Navigation */}
      <nav
        ref={navRef}
        className={cn(
          "relative transition-all duration-500 ease-out",
          scrolled
            ? "bg-white/50  border-b border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.1)]"
            : "bg-white/10 backdrop-blur-xl border-b border-white/5",
          hidden ? "-translate-y-full" : "translate-y-0",
        )}
        style={{
          background: scrolled
            ? "linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%)"
            : "transparent",
        }}
        aria-label="Main navigation"
      >
        {/* Glass shine effect */}
        <div
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)",
          }}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 relative">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link
              href="/"
              aria-label="Moai home"
              className={cn(
                "marketing-site-logo lowercase text-2xl font-bold tracking-tight transition-all duration-300",
                scrolled
                  ? "text-slate-900 drop-shadow-sm"
                  : "text-white drop-shadow-md",
              )}
            >
              <span className="relative">
                moai
                <span
                  className={cn(
                    "absolute -bottom-0.5 left-0 h-0.5 bg-[#2563eb] transition-all duration-500",
                    pathname === "/" ? "w-full" : "w-0",
                  )}
                />
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-x-6 text-sm tracking-wide">
              {NAV_LINKS.map((link) => {
                const active = pathname === link.href;

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative px-2 py-1 group transition-all duration-300",
                      active
                        ? "text-[#2563eb] font-semibold"
                        : scrolled
                          ? "text-slate-900 hover:text-[#2563eb]"
                          : "text-slate-700 hover:text-slate-900",
                    )}
                  >
                    {link.label}

                    <span
                      className={cn(
                        "absolute -bottom-0.5 left-1/2 -translate-x-1/2 h-0.5 bg-[#2563eb] transition-all duration-300",
                        active ? "w-full" : "w-0 group-hover:w-full",
                      )}
                    />
                  </Link>
                );
              })}

              <Link
                href="/#download"
                className={cn(
                  "relative overflow-hidden px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300",
                  scrolled
                    ? "bg-[#2563eb] text-white hover:bg-[#1d4ed8]"
                    : "bg-white/20 text-slate-900 backdrop-blur-sm border border-white/30 hover:bg-white/30",
                )}
              >
                Download
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={cn(
                "md:hidden p-2 rounded-lg transition-colors",
                scrolled ? "text-slate-900" : "text-white",
              )}
              aria-label="Toggle menu"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {mobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>

          {/* Mobile Dropdown */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 rounded-2xl bg-white/90 backdrop-blur-xl border border-slate-200 shadow-lg p-4">
              <div className="flex flex-col gap-3">
                {NAV_LINKS.map((link) => {
                  const active = pathname === link.href;

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "py-2 text-base transition-colors",
                        active
                          ? "text-[#2563eb] font-semibold"
                          : "text-slate-800 hover:text-[#2563eb]",
                      )}
                    >
                      {link.label}
                    </Link>
                  );
                })}

                <Link
                  href="/#download"
                  onClick={() => setMobileMenuOpen(false)}
                  className="mt-2 rounded-lg bg-[#2563eb] px-4 py-3 text-center font-semibold text-white hover:bg-[#1d4ed8]"
                >
                  Download
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Mirror Reflection Effect */}
      <div
        ref={mirrorRef}
        className="absolute top-full left-0 right-0 h-16 pointer-events-none overflow-hidden"
        style={{
          transform: "scaleY(-1)",
          maskImage:
            "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 100%)",
        }}
      >
        <div
          className={cn(
            "h-full w-full transition-all duration-500",
            scrolled
              ? "bg-white/10 backdrop-blur-xl border-b border-white/10"
              : "bg-transparent",
          )}
        />
      </div>

      {/* Ambient glow beneath nav */}
      <div
        className={cn(
          "absolute top-full left-1/2 -translate-x-1/2 w-3/4 h-8 transition-opacity duration-500 pointer-events-none",
          scrolled ? "opacity-40" : "opacity-0",
        )}
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(37,99,235,0.15) 0%, transparent 70%)",
        }}
      />
    </header>
  );
}
