"use client";

import { useEffect } from "react";

export default function AOSInit() {
  useEffect(() => {
    // Check if script already added
    if (document.getElementById("aos-js")) {
      if (typeof window !== "undefined" && (window as any).AOS) {
        (window as any).AOS.refresh();
      }
      return;
    }

    const script = document.createElement("script");
    script.id = "aos-js";
    script.src = "https://unpkg.com/aos@next/dist/aos.js";
    script.async = true;
    script.onload = () => {
      if (typeof window !== "undefined" && (window as any).AOS) {
        (window as any).AOS.init({
          duration: 700,
          once: true,
          easing: "ease-out-cubic",
          offset: 80,
        });
      }
    };
    document.body.appendChild(script);
  }, []);

  return null;
}
