import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const TENANT_TABLES = ['produkti', 'veprimi', 'veprim_batch', 'gjendje', 'lokacioni'] as const

const REPO_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../repositories',
)

describe('tenant scope guard', () => {
  it('keeps tenant table access inside repositories/', () => {
    const srcRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
    const offenders: string[] = []

    function walk(dir: string) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          if (entry.name === 'repositories' || entry.name === 'node_modules') continue
          walk(full)
          continue
        }
        if (!entry.name.endsWith('.ts') || entry.name.endsWith('.test.ts')) continue

        const rel = path.relative(srcRoot, full)
        const content = fs.readFileSync(full, 'utf8')
        for (const table of TENANT_TABLES) {
          if (content.includes(`.from('${table}')`) || content.includes(`.from("${table}")`)) {
            offenders.push(`${rel} -> ${table}`)
          }
        }
      }
    }

    walk(srcRoot)
    expect(offenders).toEqual([])
  })

  it('requires tenantId as first parameter on repository exports', () => {
    const files = fs.readdirSync(REPO_DIR).filter(
      (f) =>
        f.endsWith('.ts') &&
        f !== 'perdoruesRepository.ts' &&
        f !== 'lokacioniAccessRepository.ts',
    )
    for (const file of files) {
      const content = fs.readFileSync(path.join(REPO_DIR, file), 'utf8')
      const matches = content.matchAll(/export async function \w+\(\s*supabase[^,]+,\s*(\w+)/g)
      for (const match of matches) {
        expect(match[1]).toBe('tenantId')
      }
    }
  })
})
