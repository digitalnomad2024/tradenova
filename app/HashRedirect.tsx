"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HashRedirect() {
  const router = useRouter();

  useEffect(() => {
    const redirectIfNeeded = () => {
      const hash = window.location.hash.replace("#", "");
      if (!hash) return;

      const allowed = ["trade", "dashboard", "login", "checkout", "forgot-password"];
      if (allowed.includes(hash)) {
        // Use replace so the bad URL doesn't stay in browser history
        window.location.replace(`/${hash}`);
      }
    };

    // 1. Check immediately when the component mounts
    redirectIfNeeded();

    // 2. Also check if the hash changes while the user is on the page
    //    (this is the part the previous script missed)
    window.addEventListener("hashchange", redirectIfNeeded);

    return () => {
      window.removeEventListener("hashchange", redirectIfNeeded);
    };
  }, [router]);

  return null;
}