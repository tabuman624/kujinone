/**
 * Yahoo OAuth 認証コールバック（一時エンドポイント）
 * 認証後に code パラメータを表示するだけ。
 * リフレッシュトークン取得後に削除する。
 */
import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const error = req.nextUrl.searchParams.get('error')

  if (error) {
    return new Response(`エラー: ${error}`, { status: 400, headers: { 'content-type': 'text/plain; charset=utf-8' } })
  }

  if (!code) {
    return new Response('code パラメータがありません', { status: 400, headers: { 'content-type': 'text/plain; charset=utf-8' } })
  }

  return new Response(
    `認証コード取得成功！\n\ncode=${code}\n\nこのコードをコピーして Claude に伝えてください。`,
    { headers: { 'content-type': 'text/plain; charset=utf-8' } }
  )
}
