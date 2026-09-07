import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath, URL } from 'node:url'

import { searchSettings, groupMatches, SETTINGS_CATALOG } from '@/core/settings/catalog'

describe('settings catalogue', () => {
    it('every entry has a unique id and a non-empty label', () => {
        const ids = SETTINGS_CATALOG.map((e) => e.id)
        expect(new Set(ids).size).toBe(ids.length)
        for (const entry of SETTINGS_CATALOG) {
            expect(entry.label.length).toBeGreaterThan(0)
            expect(entry.section.length).toBeGreaterThan(0)
        }
    })

    it('returns every entry (rank 0) for an empty query', () => {
        const all = searchSettings('')
        expect(all).toHaveLength(SETTINGS_CATALOG.length)
        expect(all.every((m) => m.rank === 0)).toBe(true)
    })

    it('ranks exact labels above partial matches', () => {
        const matches = searchSettings('theme')
        expect(matches[0].entry.id).toBe('theme')
        expect(matches[0].rank).toBe(0)
        expect(matches.some((m) => m.entry.id === 'appearance')).toBe(true)
    })

    it('matches on section names and keywords', () => {
        expect(searchSettings('volume').some((m) => m.entry.id === 'sound-volume')).toBe(true)
        expect(searchSettings('backup').some((m) => m.entry.id === 'export-all')).toBe(true)
        expect(searchSettings('myanmar').some((m) => m.entry.id === 'default-language')).toBe(true)
    })

    it('is case- and whitespace-insensitive', () => {
        const a = searchSettings('  CareT   Style ')
        const b = searchSettings('caret style')
        expect(a.map((m) => m.entry.id)).toEqual(b.map((m) => m.entry.id))
    })

    it('groups item matches by section', () => {
        const groups = groupMatches(searchSettings('caret'))
        expect(groups.length).toBeGreaterThanOrEqual(1)
        for (const g of groups) {
            expect(g.items.length).toBeGreaterThan(0)
        }
    })

    it('unmatched queries return nothing', () => {
        expect(searchSettings('zzzz-no-such-setting')).toHaveLength(0)
    })
})

describe('settings page source of truth', () => {
    const pageSource = readFileSync(resolve(fileURLToPath(new URL('../../src/pages/settings-page.tsx', import.meta.url))), 'utf-8')
    const anchors = new Set([...pageSource.matchAll(/\bid="settings-([a-z0-9-]+)"/g)].map((m) => m[1]))
    const catalogIds = new Set(SETTINGS_CATALOG.map((e) => e.id))

    it('every page anchor is documented in the catalogue', () => {
        for (const anchor of anchors) {
            expect(catalogIds.has(anchor), `missing catalogue entry for "settings-${anchor}"`).toBe(true)
        }
    })

    it('every catalogue entry has a scroll anchor on the page', () => {
        for (const entry of SETTINGS_CATALOG) {
            expect(anchors.has(entry.id), `settings page is missing id="settings-${entry.id}"`).toBe(true)
        }
    })
})
