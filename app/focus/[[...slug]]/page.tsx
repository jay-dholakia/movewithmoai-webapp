"use client";

import { useEffect, useRef } from "react";

const IOS_STORE_URL = "https://apps.apple.com/app/id0000000000";
const ANDROID_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.jaydholakia.movewithmoai";
const APP_SCHEME = "movewithmoai";

export default function FocusMoaiPage() {
  const openAppRef = useRef<HTMLAnchorElement>(null);
  const iosLinkRef = useRef<HTMLAnchorElement>(null);
  const androidLinkRef = useRef<HTMLAnchorElement>(null);
  const copyHintRef = useRef<HTMLElement>(null);

  useEffect(() => {
    // Extract slug from path /focus/<slug>
    const pathMatch = location.pathname.match(/\/focus\/([^/]+)\/?$/);
    const slug = pathMatch?.[1]
      ? decodeURIComponent(pathMatch[1])
      : new URLSearchParams(location.search).get("slug")?.trim() ?? "";

    const ua = navigator.userAgent || "";
    const isAndroid = /Android/i.test(ua);
    const isIOS = /iPhone|iPad|iPod/i.test(ua);

    // iOS universal link fires automatically if the app is installed.
    // Custom scheme fallback for when it doesn't (e.g. in-app browsers).
    const deepLink = slug
      ? `${APP_SCHEME}://focus/${encodeURIComponent(slug)}`
      : `${APP_SCHEME}://`;

    const androidIntent =
      `intent://focus/${slug ? encodeURIComponent(slug) + "/" : ""}` +
      `#Intent;scheme=${APP_SCHEME}` +
      `;package=com.jaydholakia.movewithmoai` +
      `;S.browser_fallback_url=${encodeURIComponent(ANDROID_STORE_URL)};end`;

    if (openAppRef.current) {
      openAppRef.current.href = isAndroid ? androidIntent : deepLink;
    }
    if (iosLinkRef.current) iosLinkRef.current.href = IOS_STORE_URL;
    if (androidLinkRef.current) androidLinkRef.current.href = ANDROID_STORE_URL;
    if (copyHintRef.current) copyHintRef.current.textContent = location.href;

    // Auto-attempt open after a short delay so the page renders first.
    // iOS: universal link takes over before this fires if the app is installed.
    // Android: intent handles the fallback to Play Store automatically.
    // Desktop: nothing happens (user sees the manual buttons).
    if (!isIOS && !isAndroid) return;

    const timer = setTimeout(() => {
      window.location.href = isAndroid ? androidIntent : deepLink;
    }, 400);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="font-sans m-0 px-6 py-6 max-w-[480px] mx-auto leading-relaxed text-[#1c1c1e]">
      <h1 className="text-2xl font-bold mb-3">View this Focus Moai on Moai</h1>
      <p className="mb-4 text-[#3c3c43]">
        We&apos;re opening the Moai app. If nothing happens, install the app or
        use the buttons below.
      </p>

      <div className="flex flex-col gap-3">
        <a
          ref={openAppRef}
          href="#"
          className="block px-4 py-3 rounded-[10px] text-center font-semibold no-underline bg-[#007aff] text-white border border-[#007aff]"
        >
          Open in app
        </a>
        <a
          ref={iosLinkRef}
          href="#"
          className="block px-4 py-3 rounded-[10px] text-center font-semibold no-underline bg-[#f2f2f7] text-[#1c1c1e] border border-[#c7c7cc]"
        >
          Download on the App Store
        </a>
        <a
          ref={androidLinkRef}
          href="#"
          className="block px-4 py-3 rounded-[10px] text-center font-semibold no-underline bg-[#f2f2f7] text-[#1c1c1e] border border-[#c7c7cc]"
        >
          Get it on Google Play
        </a>
      </div>

      <p className="text-[13px] text-[#636366] mt-5">
        Copy link:{" "}
        <code ref={copyHintRef} className="text-[12px] break-all" />
      </p>
    </div>
  );
}
