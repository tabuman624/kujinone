import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { kuji_id } = await req.json()
    if (!kuji_id || typeof kuji_id !== 'number') {
      return NextResponse.json({ ok: false }, { status: 400 })
    }
    await supabase.rpc('increment_kuji_view', { p_kuji_id: kuji_id })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
