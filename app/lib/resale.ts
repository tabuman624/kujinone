// 再販売のくじと、その元（初回販売）のくじを結びつける。
// 再販売のタイトルは「元のタイトル（再販売）」か「元のタイトル（再販売・二次受注）」の形で、
// 元のくじのタイトルとは末尾以外が完全に一致する（2026-11時点で10件、うち元のくじがDBにあるのは6件）。
// product_id の付け方（-2 / _2）は統一されていないので、タイトルで結ぶ。

const RESALE_SUFFIX = /\s*[（(]再販売[^）)]*[）)]\s*$/

/** 再販売のくじなら、元のくじのタイトルを返す。再販売でなければ null */
export function resaleBaseTitle(title: string): string | null {
  return RESALE_SUFFIX.test(title) ? title.replace(RESALE_SUFFIX, '').trim() : null
}
