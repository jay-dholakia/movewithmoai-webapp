"use client";

import { useEffect, useRef } from "react";
import { DeepLinkLanding } from "@/components/deeplink-landing";

const JoinMoaiPage = () => {
  const openAppRef = useRef<HTMLAnchorElement>(null);
  const iosLinkRef = useRef<HTMLAnchorElement>(null);
  const androidLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const scheme =
      (params.get("app_scheme") || "movewithmoai").replace(/:$/, "") + ":";

    const defaultIos = "https://apps.apple.com/app/id0000000000";
    const defaultAndroid =
      "https://play.google.com/store/apps/details?id=com.jaydholakia.movewithmoai";

    const iosStoreUrl = params.get("iosStore") || defaultIos;
    const androidStoreUrl = params.get("androidStore") || defaultAndroid;

    const pathMatch = location.pathname.match(/\/join\/([^/]+)\/?$/);
    let slug = "";
    if (pathMatch && pathMatch[1] && pathMatch[1] !== "index.html") {
      slug = decodeURIComponent(pathMatch[1]);
    }
    if (!slug) {
      slug = (params.get("slug") || "").trim();
    }

    const deep = slug
      ? scheme + "//join/" + encodeURIComponent(slug)
      : scheme + "//";

    const androidIntent =
      "intent://join/" +
      (slug ? encodeURIComponent(slug) + "/" : "") +
      "#Intent;scheme=" +
      scheme.replace(":", "") +
      ";package=com.jaydholakia.movewithmoai;S.browser_fallback_url=" +
      encodeURIComponent(androidStoreUrl) +
      ";end";

    const ua = navigator.userAgent || "";
    const isAndroid = /Android/i.test(ua);

    if (openAppRef.current)
      openAppRef.current.href = isAndroid ? androidIntent : deep;
    if (iosLinkRef.current) iosLinkRef.current.href = iosStoreUrl;
    if (androidLinkRef.current) androidLinkRef.current.href = androidStoreUrl;

    const timer = setTimeout(() => {
      if (!isAndroid) {
        window.location.href = deep;
      } else {
        window.location.href = androidIntent;
      }
    }, 400);

    return () => clearTimeout(timer);
  }, []);

  return (
    <DeepLinkLanding
      title="Join your moai"
      description="We're opening the Moai app. If nothing happens, install the app or use the buttons below."
      openAppRef={openAppRef}
      iosLinkRef={iosLinkRef}
      androidLinkRef={androidLinkRef}
    />
  );
};

export default JoinMoaiPage;
