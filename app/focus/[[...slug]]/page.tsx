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

    // No automatic redirect: a non-gesture navigation to intent:// is unreliable in
    // Chrome and can fall through to the Play Store even when the app is installed.
    // The "Open in app" button (a real tap) launches the app instead.
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
  }, []);

  return (
    <DeepLinkLanding
      title="View this Focus Moai"
      description="Tap Open in app to view it in Moai. Don't have the app yet? Download it below."
      openAppRef={openAppRef}
      iosLinkRef={iosLinkRef}
      androidLinkRef={androidLinkRef}
    />
  );
}
