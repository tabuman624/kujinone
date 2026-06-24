'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  {
    href: '/',
    label: 'ホーム',
    sub: 'HOME',
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  },
  {
    href: '/schedule',
    label: '発売スケジュール',
    sub: 'SCHEDULE',
    icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  },
  {
    href: '/calc',
    label: '期待値を計算する',
    sub: 'CALCULATOR',
    icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z',
  },
  {
    href: '/news',
    label: '新作速報',
    sub: 'NEWS',
    icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
  },
  {
    href: '/blog',
    label: 'コラム',
    sub: 'COLUMN',
    icon: 'M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z',
  },
]

const footerLinks = [
  { href: '/about', label: 'このサイトについて' },
  { href: '/howto', label: '使い方' },
  { href: '/terms', label: '利用規約' },
  { href: '/privacy', label: 'プライバシー' },
  { href: '/contact', label: 'お問い合わせ' },
]

function getActiveHref(pathname: string): string {
  if (pathname === '/') return '/'
  if (pathname.startsWith('/schedule') || pathname.startsWith('/kuji')) return '/schedule'
  if (pathname.startsWith('/calc')) return '/calc'
  if (pathname.startsWith('/news')) return '/news'
  if (pathname.startsWith('/blog')) return '/blog'
  return ''
}

export default function SideNav() {
  const pathname = usePathname() ?? '/'
  const activeHref = getActiveHref(pathname)

  return (
    <div className="hidden md:flex md:fixed md:inset-y-0 md:left-0 md:w-60 md:flex-col md:bg-white md:border-r md:border-gray-200 md:shadow-sm">
      {/* ロゴ */}
      <div className="px-5 py-5 border-b border-gray-100">
        <Link href="/" className="flex items-center gap-2">
          <img src="/icon.png" alt="くじのね" className="w-8 h-8 rounded-lg object-cover" />
          <div>
            <div className="text-sm font-black text-gray-900 leading-tight">くじのね</div>
            <div className="text-xs text-gray-400 leading-tight">期待値計算ツール</div>
          </div>
        </Link>
      </div>

      {/* メインナビ */}
      <nav className="flex flex-col gap-0.5 px-3 py-4 flex-1">
        {navItems.map(item => {
          const active = activeHref === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group ${
                active
                  ? 'bg-red-50 text-red-600'
                  : 'text-gray-600 hover:bg-red-50 hover:text-red-600'
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`w-4 h-4 flex-shrink-0 transition-colors ${
                  active ? 'text-red-500' : 'group-hover:text-red-500'
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2 : 1.5} d={item.icon} />
              </svg>
              <div>
                <div className={`text-xs leading-tight ${active ? 'font-black' : 'font-semibold'}`}>
                  {item.label}
                </div>
                <div className={`text-xs leading-tight font-medium tracking-wider ${active ? 'text-red-400' : 'text-gray-400'}`}>
                  {item.sub}
                </div>
              </div>
              {active && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* フッターリンク */}
      <div className="px-5 py-4 border-t border-gray-100">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {footerLinks.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">当サイトはアフィリエイト広告を利用しています</p>
        <p className="text-xs text-gray-300 mt-1">© 2026 くじのね</p>
      </div>
    </div>
  )
}
