import type { Metadata } from 'next'
import { supabase } from '../lib/supabase'
import ScheduleList from './ScheduleList'

export const metadata: Metadata = {
  title: '一番くじ 発売スケジュール | くじのね',
  description: '一番くじの発売スケジュール一覧。月別に新作・最新くじの発売日をチェックして、期待値計算に役立てよう。',
}

export default async function SchedulePage() {
  const { data: kujiList } = await supabase
    .from('kuji')
    .select('*')
    .eq('is_active', true)
    .order('release_at', { ascending: true })

  return (
    <main>
      <div className="bg-gray-900 px-6 py-8 text-white">
        <p className="text-xs font-bold tracking-widest text-gray-400 mb-1">SCHEDULE</p>
        <h1 className="text-xl font-black">発売スケジュール</h1>
      </div>
      <ScheduleList kujiList={kujiList ?? []} />
    </main>
  )
}
