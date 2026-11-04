import XIcon from './XIcon'
import { X_HANDLE, X_URL } from '../lib/siteMeta'

// X（@kujinone）へのフォロー導線。記事の本文の後・くじページの下・スケジュールの上で使う。
// 文言は実際に投稿している内容（発売前日のお知らせ、毎週の集計データ）に合わせる。
// 「お得」などの言い方はしない。
export const X_FOLLOW_DEFAULT = '発売前日のお知らせと、毎週の集計データをXで投稿しています'

export default function XFollowCTA({ title = X_FOLLOW_DEFAULT, compact = false }: { title?: string; compact?: boolean }) {
  return (
    <a
      href={X_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`くじのねのXアカウント（${X_HANDLE}）`}
      className={`flex items-center gap-3 border rounded-xl bg-shu-bg border-shu text-shu press ${compact ? 'px-3 py-2' : 'p-3'}`}
    >
      <XIcon className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} flex-shrink-0`} />
      <div className="flex-1 min-w-0">
        <p className={`${compact ? 'text-xs' : 'text-sm'} font-bold`}>{title}</p>
        <p className="text-xs opacity-70">{X_HANDLE} をフォロー</p>
      </div>
      <span className="text-sm flex-shrink-0">→</span>
    </a>
  )
}
