import { describe, it, expect } from 'vitest'

import {
    THEMES,
    THEME_VAR_MAP,
    DEFAULT_THEME_PRESET_ID,
    getThemePreset,
    isThemePresetId,
    paletteForTheme,
    applyThemePalette,
    type ThemePalette,
} from '@/core/themes/registry'

const TOKEN_KEYS = Object.keys(THEME_VAR_MAP) as Array<keyof ThemePalette>

function makeStyleTarget(): { vars: Map<string, string>; style: Record<string, unknown> } {
    const vars = new Map<string, string>()
    const style = {
        setProperty: (name: string, value: string) => vars.set(name, value),
        removeProperty: (name: string) => vars.delete(name),
    }
    return { vars, style }
}

describe('theme registry', () => {
    it('exposes at least one curated preset', () => {
        expect(THEMES.length).toBeGreaterThanOrEqual(1)
    })

    it('gives every preset a unique, valid id and a name', () => {
        const ids = new Set<string>()
        for (const preset of THEMES) {
            expect(preset.id).toMatch(/^[a-z0-9-]+$/)
            expect(preset.name.length).toBeGreaterThan(0)
            expect(preset.description.length).toBeGreaterThan(0)
            expect(ids.has(preset.id)).toBe(false)
            ids.add(preset.id)
        }
    })

    it.each(THEMES)('preset %s defines every token in both light and dark', (preset) => {
        for (const tone of ['light', 'dark'] as const) {
            const palette = preset[tone]
            for (const token of TOKEN_KEYS) {
                expect(typeof palette[token]).toBe('string')
                expect(palette[token].length).toBeGreaterThan(0)
            }
        }
    })

    it('resolves presets by id and rejects unknown ones', () => {
        expect(isThemePresetId(DEFAULT_THEME_PRESET_ID)).toBe(true)
        expect(isThemePresetId('lacquer')).toBe(true)
        expect(isThemePresetId('nope')).toBe(false)
        expect(getThemePreset(DEFAULT_THEME_PRESET_ID)).toBeNull()
        expect(getThemePreset('monsoon')?.name.length).toBeGreaterThan(0)
        expect(getThemePreset('bogus')).toBeNull()
    })

    it('paletteForTheme returns the tone palette or null for the default preset', () => {
        const preset = THEMES[0]
        expect(paletteForTheme(preset, 'dark')).toBe(preset.dark)
        expect(paletteForTheme(null, 'light')).toBeNull()
    })

    it('keeps ink readable against its background in every palette', () => {
        // WCAG-style relative-luminance contrast heuristic for solid hex text on
        // solid hex background; rgba washes in the palettes are never used for
        // the ink/bg pair, so only 6-digit hex values are checked here.
        const luminance = (hex: string): number => {
            const value = hex.replace('#', '')
            const [r, g, b] = [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16) / 255)
            return 0.2126 * r + 0.7152 * g + 0.0722 * b
        }
        for (const preset of THEMES) {
            for (const tone of ['light', 'dark'] as const) {
                const palette = preset[tone]
                const bg = luminance(palette.bg)
                const fg = luminance(palette.ink)
                const [hi, lo] = fg > bg ? [fg, bg] : [bg, fg]
                const contrast = (hi + 0.05) / (lo + 0.05)
                expect(contrast, `${preset.id}/${tone} contrast`).toBeGreaterThan(4.5)
            }
        }
    })

    it('applies a preset to a live element by writing each CSS variable', () => {
        const { vars, style } = makeStyleTarget()
        const root = { style } as unknown as HTMLElement
        const preset = getThemePreset('lacquer')
        applyThemePalette(root, preset, 'dark')
        for (const [token, variable] of Object.entries(THEME_VAR_MAP)) {
            expect(vars.get(variable)).toBe(preset?.dark[token as keyof ThemePalette])
        }
    })

    it('clears every managed variable for the default preset', () => {
        const { vars, style } = makeStyleTarget()
        const root = { style } as unknown as HTMLElement
        applyThemePalette(root, getThemePreset('lacquer'), 'dark')
        expect(vars.size).toBe(TOKEN_KEYS.length)
        applyThemePalette(root, getThemePreset(DEFAULT_THEME_PRESET_ID), 'dark')
        expect(vars.size).toBe(0)
    })
})