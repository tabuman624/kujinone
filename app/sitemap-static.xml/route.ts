import { buildUrlsetXml, xmlResponse } from '../lib/sitemapXml'

export const revalidate = 3600

const BASE = 'https://kujinone.com'
const STATIC_DATE = new Date('2026-05-01')

export async function GET() {
  const now = new Date()
  const entries = [
    { url: BASE, lastModified: now, changeFrequency: 'daily' as const, priority: 1 },
    { url: `${BASE}/schedule`, lastModified: now, changeFrequency: 'daily' as const, priority: 0.9 },
    { url: `${BASE}/calc`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.9 },
    { url: `${BASE}/today`, lastModified: now, changeFrequency: 'daily' as const, priority: 0.7 },
    { url: `${BASE}/ranking/wanted`, lastModified: now, changeFrequency: 'daily' as const, priority: 0.6 },
    { url: `${BASE}/about`, lastModified: STATIC_DATE, changeFrequency: 'yearly' as const, priority: 0.3 },
    { url: `${BASE}/howto`, lastModified: STATIC_DATE, changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${BASE}/privacy`, lastModified: STATIC_DATE, changeFrequency: 'yearly' as const, priority: 0.3 },
    { url: `${BASE}/terms`, lastModified: STATIC_DATE, changeFrequency: 'yearly' as const, priority: 0.3 },
    { url: `${BASE}/contact`, lastModified: STATIC_DATE, changeFrequency: 'yearly' as const, priority: 0.3 },
  ]
  return xmlResponse(buildUrlsetXml(entries))
}
