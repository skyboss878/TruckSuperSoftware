import LandingPageClient from '@/components/LandingPageClient'
import { readdirSync, statSync } from 'fs'
import { join } from 'path'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function countFiles(dir, filename) {
  let count = 0
  try {
    const entries = readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) count += countFiles(full, filename)
      else if (entry.name === filename) count++
    }
  } catch {}
  return count
}

export default function Page() {
  const apiCount = countFiles(join(process.cwd(), 'app/api'), 'route.js')
  const pageCount = countFiles(join(process.cwd(), 'app'), 'page.js')
  return <LandingPageClient apiCount={apiCount} pageCount={pageCount} />
}
