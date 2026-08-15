"use client";

import { useEffect, useRef } from "react";
import { DeepLinkLanding } from "@/components/deeplink-landing";

const IOS_STORE_URL = "https://apps.apple.com/app/id0000000000";
const ANDROID_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.jaydholakia.movewithmoai";
const APP_SCHEME = "movewithmoai";

export default function FocusMoaiPage() {
  const openAppRef = useRef<HTMLAnchorElement>(null);
  const iosLinkRef = useRef<HTMLAnchorElement>(null);
  const androidLinkRef = useRef<HTMLAnchorElement>(null);

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
    <DeepLinkLanding
      title="View this Focus Moai"
      description="We're opening the Moai app. If nothing happens, install the app or use the buttons below."
      openAppRef={openAppRef}
      iosLinkRef={iosLinkRef}
      androidLinkRef={androidLinkRef}
    />
  );
}
