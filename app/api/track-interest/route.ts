import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { prize_id } = await req.json()
    if (!prize_id || typeof prize_id !== 'number') {
      return NextResponse.json({ ok: false }, { status: 400 })
    }
    await supabase.rpc('increment_prize_interest', { p_prize_id: prize_id })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
