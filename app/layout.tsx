"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import "./globals.css";

function HashRedirect() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/") return;

    const hash = window.location.hash.replace("#", "");
    if (!hash) return;

    const allowed = ["trade", "dashboard", "login", "checkout", "forgot-password"];
    if (allowed.includes(hash)) {
      router.replace(`/${hash}`);
    }
  }, [router, pathname]);

  return null;
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <HashRedirect />
        {children}
      </body>
    </html>
  );
}