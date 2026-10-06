"use client";

import { useEffect } from "react";

export default function HashRedirect() {
  useEffect(() => {
    const redirectIfNeeded = () => {
      const hash = window.location.hash.replace("#", "").replace("/", "");
      if (!hash) return;
      const allowed = ["trade", "dashboard", "login", "checkout", "forgot-password"];
      if (allowed.includes(hash)) {
        window.location.replace("/" + hash);
      }
    };
    redirectIfNeeded();
    window.addEventListener("hashchange", redirectIfNeeded);
    return () => window.removeEventListener("hashchange", redirectIfNeeded);
  }, []);
  return null;
}