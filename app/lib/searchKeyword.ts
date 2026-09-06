// メルカリ・駿河屋・Yahoo!ショッピング・楽天など二次流通サイトへの検索リンク用の
// キーワードを組み立てる。以前は「タイトル先頭2語」「タイトル全文そのまま」など
// 場当たり的な実装がページごとに散らばっており、括弧が閉じないまま切れる
// （例:「一番くじ 映画『ウィキッド」）等でリンク先が0件ヒットになるケースが
// 163くじ中42件（25.8%）あった。ここで一箇所にまとめ、記号除去後に単語単位で
// 組み立てることで、途中で記号が千切れる事故を防ぐ。

const SYMBOLS_RE = /[『』「」【】〈〉《》\[\]()（）~～!！?？:：・,、。.．]/g

function normalizeAccents(str: string): string {
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function cleanText(str: string): string {
  return normalizeAccents(str)
    .replace(SYMBOLS_RE, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function stripTitlePrefix(kujiTitle: string): string {
  return kujiTitle.replace(/^一番くじ\s*/, '').trim()
}

export function extractItemName(prizeName: string): string {
  return prizeName.replace(/^[A-ZＡ-Ｚa-z\w]*賞\s*/, '').trim() || prizeName
}

/** ページ全体（くじ本体）向けの検索キーワード。作品名の先頭数語まで使う。 */
export function buildTitleKeyword(kujiTitle: string, maxWords = 4): string {
  const words = cleanText(stripTitlePrefix(kujiTitle)).split(' ').filter(Boolean).slice(0, maxWords)
  return ['一番くじ', ...words].join(' ').trim()
}

/** 賞品単位の検索キーワード（作品名の先頭1語 + 賞 + 景品名）。 */
export function buildPrizeKeyword(kujiTitle: string, grade: string, prizeName: string): string {
  const titleWord = cleanText(stripTitlePrefix(kujiTitle)).split(' ').filter(Boolean)[0] ?? ''
  const itemName = cleanText(extractItemName(prizeName))
  return ['一番くじ', titleWord, grade, itemName].filter(Boolean).join(' ')
}
