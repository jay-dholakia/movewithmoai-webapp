"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ClipboardCheck,
  Dumbbell,
  MessageCircle,
  PartyPopper,
  Repeat,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollReveal } from "@/components/scroll-reveal";
import { MarketingNav } from "@/components/marketing-nav";
import { MarketingFooter } from "@/components/marketing-footer";
import { LandingActiveMoaisSection } from "@/components/landing-active-moais-section";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const NODE_COLORS = [
  "bg-[#2563eb]",
  "bg-emerald-500",
  "bg-orange-500",
  "bg-violet-500",
  "bg-cyan-500",
] as const;

const WEEKLY_RHYTHM_STEPS = [
  {
    icon: ClipboardCheck,
    title: "Set your commitment",
    body: "Decide how many days you're showing up this week. That number is your commitment.",
    color: "text-blue-700 bg-blue-50 ring-blue-200/80",
  },
  {
    icon: Target,
    title: "Get your plan",
    body: "You're assigned a workout plan built around your goals, equipment, and experience.",
    color: "text-cyan-700 bg-cyan-50 ring-cyan-200/80",
  },
  {
    icon: Dumbbell,
    title: "Show up",
    body: "Log your workouts as you go, on your own schedule, wherever you train.",
    color: "text-emerald-700 bg-emerald-50 ring-emerald-200/80",
  },
  {
    icon: MessageCircle,
    title: "Check in",
    body: "Your Moai sees your progress in real time. You see theirs.",
    color: "text-orange-800 bg-orange-50 ring-orange-200/80",
  },
  {
    icon: PartyPopper,
    title: "Celebrate & reset",
    body: "Wins get celebrated together, then next week's commitment starts.",
    color: "text-violet-700 bg-violet-50 ring-violet-200/80",
  },
] as const;

function WeeklyRhythm() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Staggered card reveal with parallax
      cardsRef.current.forEach((card, i) => {
        if (!card) return;

        gsap.fromTo(
          card,
          {
            y: 60,
            opacity: 0,
            scale: 0.95,
          },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            duration: 0.7,
            ease: "power3.out",
            scrollTrigger: {
              trigger: card,
              start: "top 85%",
              end: "top 50%",
              toggleActions: "play none none reverse",
            },
            delay: i * 0.1,
          },
        );

        // Subtle parallax float on each card
        gsap.to(card, {
          y: -15,
          ease: "none",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top bottom",
            end: "bottom top",
            scrub: 1,
          },
        });
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={sectionRef} className="relative">
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {WEEKLY_RHYTHM_STEPS.map((item, i) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              ref={(el) => {
                cardsRef.current[i] = el;
              }}
              className="h-full block"
            >
              <div className="relative h-full rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm hover:shadow-md transition-shadow duration-300">
                <span
                  className={cn(
                    "inline-flex h-10 w-10 items-center justify-center rounded-full ring-2 mb-3",
                    item.color,
                  )}
                >
                  <Icon className="w-5 h-5" aria-hidden />
                </span>
                <h3 className="text-base font-semibold text-slate-900 mb-1.5">
                  {item.title}
                </h3>
                <p className="text-[15px] leading-relaxed text-slate-600">
                  {item.body}
                </p>
                {i < WEEKLY_RHYTHM_STEPS.length - 1 ? (
                  <ArrowRight
                    className="hidden lg:block absolute top-4 -right-6 w-4 h-4 text-slate-300"
                    aria-hidden
                  />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-6 flex justify-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/90 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm">
          <Repeat className="w-4 h-4 text-[#2563eb]" aria-hidden />
          Repeats every week
        </div>
      </div>
    </div>
  );
}

function HomeContent() {
  const router = useRouter();
  const mainRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const heroContentRef = useRef<HTMLDivElement>(null);
  const whatIsRef = useRef<HTMLElement>(null);
  const downloadRef = useRef<HTMLElement>(null);
  const nodesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hash = window.location.hash;
    if (
      hash &&
      (hash.includes("access_token") || hash.includes("type=invite"))
    ) {
      router.replace(`/coach/setup-password${hash}`);
    }
  }, [router]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero entrance animation
      const heroTl = gsap.timeline({ defaults: { ease: "power3.out" } });

      heroTl
        .fromTo(
          nodesRef.current?.children || [],
          { scale: 0, opacity: 0 },
          { scale: 1, opacity: 1, stagger: 0.15, duration: 0.6 },
        )
        .fromTo(
          "#hero-heading",
          { y: 80, opacity: 0 },
          { y: 0, opacity: 1, duration: 1 },
          "-=0.3",
        )
        .fromTo(
          ".marketing-hero-lede",
          { y: 40, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8 },
          "-=0.5",
        )
        .fromTo(
          ".hero-cta",
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6 },
          "-=0.3",
        );

      // Video parallax effect - video moves slower than scroll
      gsap.to(videoRef.current, {
        yPercent: 30,
        ease: "none",
        scrollTrigger: {
          trigger: heroRef.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });

      // Hero content parallax - moves up faster than scroll
      gsap.to(heroContentRef.current, {
        yPercent: -20,
        opacity: 0,
        ease: "none",
        scrollTrigger: {
          trigger: heroRef.current,
          start: "top top",
          end: "50% top",
          scrub: true,
        },
      });

      // Hero blobs parallax
      gsap.to(".hero-blob-1", {
        yPercent: -40,
        xPercent: 10,
        rotation: 15,
        ease: "none",
        scrollTrigger: {
          trigger: heroRef.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });

      gsap.to(".hero-blob-2", {
        yPercent: -60,
        xPercent: -15,
        rotation: -20,
        ease: "none",
        scrollTrigger: {
          trigger: heroRef.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });

      // What's a Moai section animations
      gsap.fromTo(
        whatIsRef.current?.querySelectorAll(".moai-reveal") || [],
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.15,
          ease: "power3.out",
          scrollTrigger: {
            trigger: whatIsRef.current,
            start: "top 75%",
            toggleActions: "play none none reverse",
          },
        },
      );

      // Download section animation
      gsap.fromTo(
        downloadRef.current,
        { y: 60, opacity: 0, scale: 0.98 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: downloadRef.current,
            start: "top 80%",
            toggleActions: "play none none reverse",
          },
        },
      );

      // Floating animation for download buttons
      gsap.to(".download-btn", {
        y: -5,
        duration: 2,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        stagger: 0.2,
      });

      // Section title parallax for rhythm
      gsap.fromTo(
        "#rhythm-heading",
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: "#rhythm-heading",
            start: "top 85%",
            toggleActions: "play none none reverse",
          },
        },
      );
    }, mainRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={mainRef}
      className="marketing-landing min-h-screen overflow-x-hidden"
    >
      <a href="#main-content" className="sr-only">
        Skip to main content
      </a>

      <MarketingNav />

      <main id="main-content" className="scroll-smooth">
        {/* Hero */}
        <section
          ref={heroRef}
          className="min-h-screen flex items-center relative isolate overflow-hidden border-b border-slate-300/40"
          aria-labelledby="hero-heading"
        >
          <video
            ref={videoRef}
            className="hero-bg-video pointer-events-none absolute inset-0 h-[120%] w-full object-cover -z-20"
            src="/videos/hero-background.mp4"
            poster="/videos/hero-poster.webp"
            autoPlay
            loop
            muted
            playsInline
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 bg-[#e8edf5]/70 -z-10"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute hero-blob hero-blob-1 opacity-35 -z-10"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute hero-blob hero-blob-2 opacity-30 -z-10 mix-blend-multiply"
            aria-hidden
          />

          <div
            ref={heroContentRef}
            className="max-w-4xl mx-auto w-full px-6 relative"
          >
            <div ref={nodesRef} className="flex gap-2 mb-8" aria-hidden>
              {NODE_COLORS.map((c, i) => (
                <span
                  key={i}
                  className={cn("landing-node h-2.5 w-2.5 rounded-full", c)}
                  style={{ animationDelay: `${i * 0.35}s` }}
                />
              ))}
            </div>
            <div className="space-y-7">
              <h1
                id="hero-heading"
                className="text-5xl sm:text-5xl md:text-6xl lg:text-8xl text-slate-900 max-w-[20ch]"
              >
                Make consistency a{" "}
                <span className="whitespace-nowrap">shared ritual</span>
              </h1>
              <p className="marketing-hero-lede max-w-2xl mt-2">
                Small groups where showing up actually counts.
                <br />
                Support from your crew, guidance from a real coach.
                <br />A system you can actually stick with, and evolves with
                you.
              </p>
              <div className="hero-cta flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 pt-2">
                <a
                  href="#download"
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-white bg-[#2563eb] hover:bg-[#1d4ed8] transition-colors focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:ring-offset-2 focus:ring-offset-[#e8edf5]"
                >
                  Get started
                  <ArrowRight className="w-5 h-5" aria-hidden />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* What's a Moai */}
        <section
          ref={whatIsRef}
          id="what-is-moai"
          className="landing-section-alt border-b border-slate-300/40 py-14 md:py-20"
          aria-labelledby="what-is-moai-heading"
        >
          <div className="max-w-2xl mx-auto px-6">
            <div className="moai-reveal">
              <h2
                id="what-is-moai-heading"
                className="text-3xl md:text-5xl text-slate-900 mb-3"
              >
                Your goals. Your people.
              </h2>
            </div>
            <div className="moai-reveal">
              <h3 className="text-xl md:text-2xl font-semibold text-slate-700 mb-6">
                What&apos;s a Moai?
              </h3>
            </div>
            <div className="marketing-manifesto-body">
              <p className="moai-reveal">
                A Moai is a small group of up to 10 people working toward their
                own goals&mdash;and helping each other stay consistent along the
                way.
              </p>
              <p className="moai-reveal">
                Most plans rely on willpower. But willpower fades. It&apos;s
                easier to keep showing up when other people know your goals,
                notice your progress, and expect to see you there.
              </p>
              <p className="moai-reveal">
                That&apos;s what a Moai gives you: accountability,
                encouragement, and people to keep going with.
              </p>
              <p className="marketing-manifesto-pull moai-reveal">
                Start your own with friends or find one to join.
              </p>
            </div>
          </div>
        </section>

        {/* Weekly rhythm */}
        <section
          id="weekly-rhythm"
          className="py-14 md:py-20 border-b border-slate-300/40"
          aria-labelledby="rhythm-heading"
        >
          <div className="max-w-5xl mx-auto px-6">
            <div>
              <h2
                id="rhythm-heading"
                className="text-3xl md:text-5xl text-slate-900 mb-4"
              >
                Every week has a rhythm
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mb-8">
                Every week follows the same loop: set your commitment, show up,
                check in with your Moai, and celebrate when you hit it. Then it
                starts again.
              </p>
            </div>
            <WeeklyRhythm />
          </div>
        </section>

        <LandingActiveMoaisSection />

        {/* Download */}
        <section
          ref={downloadRef}
          id="download"
          className="max-w-4xl mx-auto px-6 py-14 md:py-20"
          aria-labelledby="download-heading"
        >
          <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-6 md:p-8 shadow-md space-y-5">
            <h2
              id="download-heading"
              className="text-4xl md:text-6xl text-slate-900"
            >
              Get started today
            </h2>
            <p className="text-lg text-slate-600 leading-relaxed">
              Live your best life, together - with Moai.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <a
                href="https://apps.apple.com/us/app/moai/id6749557946"
                target="_blank"
                rel="noopener noreferrer"
                className="download-btn flex items-center justify-center px-8 py-4 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 focus:ring-offset-white"
                aria-label="Download Moai on the App Store"
              >
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                </svg>
              </a>
              <a
                href="https://play.google.com/store/apps/details?id=com.jaydholakia.movewithmoai"
                target="_blank"
                rel="noopener noreferrer"
                className="download-btn flex items-center justify-center px-8 py-4 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-white"
                aria-label="Get Moai on Google Play"
              >
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z" />
                </svg>
              </a>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}

export default function Home() {
  return <HomeContent />;
}
