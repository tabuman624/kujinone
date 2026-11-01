// 日本時間（JST）の日付ユーティリティ。
// new Date().toISOString() はUTCなので、JST 0〜9時にデプロイ等で再生成されると
// 「今日」が前日扱いになる。日付で表示を切り替えるページはこちらを使う。

const JST_OFFSET_MS = 9 * 3600_000

/** JSTの今日（YYYY-MM-DD） */
export function todayJst(): string {
  return new Date(Date.now() + JST_OFFSET_MS).toISOString().slice(0, 10)
}

/** JSTの当月（YYYY-MM） */
export function currentMonthJst(): string {
  return todayJst().slice(0, 7)
}

/** 'YYYY-MM' → '2026年11月' */
export function monthLabel(yyyymm: string): string {
  const [y, m] = yyyymm.split('-')
  return `${y}年${Number(m)}月`
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

/** 'YYYY-MM-DD' の曜日（0=日〜6=土）。日付だけを扱うのでUTCで計算してよい */
export function weekdayOf(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay()
}

export function weekdayLabel(date: string): string {
  return WEEKDAYS[weekdayOf(date)]
}

/** 'YYYY-MM-DD' → '11/13' */
export function shortDate(date: string): string {
  return `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`
}
