"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HashRedirect() {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;

    const allowed = ["trade", "dashboard", "login", "checkout"];
    if (allowed.includes(hash)) {
      router.replace(`/${hash}`);
    }
  }, [router]);

  return null;
}