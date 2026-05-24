"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navItems = [
  { href: "/", label: "ホーム", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { href: "/schedule", label: "スケジュール", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { href: "/calc", label: "計算する", icon: "M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" },
  { href: "/news", label: "新作速報", icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" },
  { href: "/blog", label: "コラム", icon: "M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" },
];

export default function BottomNav() {
  const pathname = usePathname() || "/";
  const [bouncedHref, setBouncedHref] = useState<string | null>(null);

  // Determine active tab by URL prefix
  const activeHref = (() => {
    if (pathname === "/") return "/";
    if (pathname.startsWith("/schedule") || pathname.startsWith("/kuji")) return "/schedule";
    if (pathname.startsWith("/calc")) return "/calc";
    if (pathname.startsWith("/news")) return "/news";
    if (pathname.startsWith("/blog")) return "/blog";
    return "";
  })();

  const activeIdx = navItems.findIndex(n => n.href === activeHref);

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden shadow-lg z-50" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      {/* Animated indicator */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: `${100 / navItems.length}%`,
          height: 3,
          transform: `translateX(${Math.max(0, activeIdx) * 100}%)`,
          transition: "transform 360ms cubic-bezier(0.22, 1, 0.36, 1)",
          pointerEvents: "none",
          opacity: activeHref ? 1 : 0,
        }}
      >
        <div style={{ margin: "0 24%", height: "100%", background: "#dc2626", borderRadius: "0 0 4px 4px" }} />
      </div>

      <div className="flex">
        {navItems.map(item => {
          const active = activeHref === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => { setBouncedHref(item.href); setTimeout(() => setBouncedHref(null), 360); }}
              className={`flex-1 py-2.5 flex flex-col items-center gap-0.5 press transition-colors ${active ? "text-red-600" : "text-gray-400 hover:text-red-600"}`}
            >
              <span className={bouncedHref === item.href ? "anim-tab-bounce" : ""} style={{ display: "inline-flex" }}>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2 : 1.5} d={item.icon} />
                </svg>
              </span>
              <span className="text-xs" style={{ fontWeight: active ? 700 : 500 }}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
