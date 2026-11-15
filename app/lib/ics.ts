// 発売予定をスマホなどのカレンダーに入れるための、カレンダー形式（iCalendar、RFC 5545）の文字列を作る（2026-11-15）。
// 使う場所：/schedule/calendar.ics（発売予定の全部を購読する）と /kuji/[id]/calendar.ics（そのくじだけを追加する）。
// 予定は終日の予定にし、メモにくじページへのリンク（utm_source=calendar）を入れて、発売日に戻ってきてもらう。

const SITE = 'https://kujinone.com'

export const CALENDAR_FEED_PATH = '/schedule/calendar.ics'

// くじ1件の発売日を追加するリンク先。どちらも押されたときだけ動くルート（/kuji/[id]/calendar.ics・google-calendar）
export const kujiIcsHref = (id: number) => `/kuji/${id}/calendar.ics`
export const kujiGoogleHref = (id: number) => `/kuji/${id}/google-calendar`

export type CalendarKuji = {
  id: number
  title: string
  price: number
  release_at: string // 'YYYY-MM-DD'
  available_stores: unknown
  updated_at: string | null
}

function kujiUrl(id: number): string {
  return `${SITE}/kuji/${id}?utm_source=calendar&utm_medium=ics&utm_campaign=release`
}

function dateValue(date: string): string {
  return date.slice(0, 10).replace(/-/g, '')
}

function nextDay(date: string): string {
  const d = new Date(`${date.slice(0, 10)}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

// DTSTAMP は必須。再生成のたびに変わらないよう、今の時刻ではなくくじの更新日時を使う（ISRの決まり）
function stamp(k: CalendarKuji): string {
  const t = k.updated_at ? new Date(k.updated_at) : new Date(`${k.release_at}T00:00:00Z`)
  return t.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function escapeText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}

// 1行は75バイトまで。超える分は改行＋空白で続ける。日本語（3バイト）の途中では切らない。
const encoder = new TextEncoder()
function fold(line: string): string {
  const out: string[] = []
  let current = ''
  let bytes = 0
  for (const ch of line) {
    const n = encoder.encode(ch).length
    const limit = out.length === 0 ? 75 : 74 // 続きの行は先頭の空白で1バイト使う
    if (bytes + n > limit) {
      out.push(current)
      current = ''
      bytes = 0
    }
    current += ch
    bytes += n
  }
  out.push(current)
  return out.join('\r\n ')
}

export function eventSummary(k: { title: string }): string {
  return `${k.title} 発売`
}

export function eventDescription(k: CalendarKuji): string {
  const stores = Array.isArray(k.available_stores) ? (k.available_stores as string[]) : []
  return [
    `1回${k.price.toLocaleString()}円`,
    ...(stores.length > 0 ? [`取扱店：${stores.join('・')}`] : []),
    `ラインナップと期待値：${kujiUrl(k.id)}`,
  ].join('\n')
}

function vevent(k: CalendarKuji): string[] {
  return [
    'BEGIN:VEVENT',
    `UID:kuji-${k.id}@kujinone.com`,
    `DTSTAMP:${stamp(k)}`,
    `DTSTART;VALUE=DATE:${dateValue(k.release_at)}`,
    `DTEND;VALUE=DATE:${dateValue(nextDay(k.release_at))}`,
    `SUMMARY:${escapeText(eventSummary(k))}`,
    `DESCRIPTION:${escapeText(eventDescription(k))}`,
    `URL:${kujiUrl(k.id)}`,
    'TRANSP:TRANSPARENT', // 終日の予定で、その日の空き時間をふさがない
    'END:VEVENT',
  ]
}

export function buildCalendar(kujiList: CalendarKuji[], name: string): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//kujinone.com//release schedule//JA',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(name)}`,
    'X-WR-TIMEZONE:Asia/Tokyo',
    // 購読したカレンダーを読み直す間隔の希望（守るかはアプリによる）
    'REFRESH-INTERVAL;VALUE=DURATION:PT12H',
    'X-PUBLISHED-TTL:PT12H',
    ...kujiList.flatMap(vevent),
    'END:VCALENDAR',
  ]
  return lines.map(fold).join('\r\n') + '\r\n'
}

export function icsResponse(body: string, filename: string): Response {
  return new Response(body, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

/** そのくじの発売日を Google カレンダーの「予定を作成」画面で開くリンク（スマホのブラウザでも使える） */
export function googleCalendarEventUrl(k: CalendarKuji): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: eventSummary(k),
    dates: `${dateValue(k.release_at)}/${dateValue(nextDay(k.release_at))}`,
    details: eventDescription(k),
  })
  return `https://calendar.google.com/calendar/render?${params}`
}

/** 発売予定の全部を購読するリンク。iPhone は webcal: を開くとカレンダーの「照会」画面が出る */
export const CALENDAR_FEED_WEBCAL = `webcal://kujinone.com${CALENDAR_FEED_PATH}`
export const CALENDAR_FEED_HTTPS = `${SITE}${CALENDAR_FEED_PATH}`
// Google カレンダーは、URLでの登録をパソコンのブラウザでしかできない（Google カレンダーのヘルプ、2026-11-15確認）
export const CALENDAR_FEED_GOOGLE = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(CALENDAR_FEED_WEBCAL)}`
