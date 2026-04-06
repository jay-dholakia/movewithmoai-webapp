"use client";

import { useEffect, useRef } from "react";

const JoinMoaiPage = () => {
  const openAppRef = useRef<HTMLAnchorElement>(null);
  const iosLinkRef = useRef<HTMLAnchorElement>(null);
  const androidLinkRef = useRef<HTMLAnchorElement>(null);
  const copyHintRef = useRef<HTMLElement>(null);

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
    if (copyHintRef.current) copyHintRef.current.textContent = location.href;

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
    <div className="font-sans m-0 px-6 py-6 max-w-120 mx-auto leading-relaxed text-[#1c1c1e]">
      <h1 className="text-2xl font-bold mb-3">Join your moai on Moai</h1>
      <p id="msg">
        We&apos;re opening the Moai app. If nothing happens, install the app or
        use the buttons below.
      </p>

      <div className="flex flex-col gap-3 mt-4">
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
        Copy link: <code ref={copyHintRef} className="text-[12px] break-all" />
        <br />
        Query params: <code className="text-[12px] break-all">
          ?slug=…
        </code>{" "}
        (needed for a plain static server),{" "}
        <code className="text-[12px] break-all">?app_scheme=movewithmoai</code>,{" "}
        <code className="text-[12px] break-all">?iosStore=…</code>,{" "}
        <code className="text-[12px] break-all">?androidStore=…</code>
      </p>
    </div>
  );
};

export default JoinMoaiPage;
