import { describe, expect, it } from 'vitest'

import type { StudentSummary } from '@/services/types'
import { buildRegisterRows, csvField, registerFilename, registerToCsv, registerToHtml } from '@/core/register/export'

function summary(overrides: Partial<StudentSummary> = {}): StudentSummary {
    return {
        student: { id: 'stu-1', studentCode: 'STU-001', name: 'Ma Ma', displayName: 'Ma Ma', avatar: null, active: true, createdAt: 0, updatedAt: 0 },
        level: 'level-1',
        lessonNumber: 3,
        progress: 0.5,
        accuracy: 94.2,
        wpm: 31.7,
        totalMinutes: 120,
        lastPracticedAt: null,
        attempts: 12,
        ...overrides,
    }
}

describe('register export', () => {
    it('builds a row from a summary', () => {
        const row = buildRegisterRows([summary()])[0]
        expect(row).toEqual({
            code: 'STU-001',
            name: 'Ma Ma',
            level: 'level-1',
            wpm: 32,
            accuracy: 94,
            minutes: 120,
            progress: 50,
            attempts: 12,
            lastPracticed: '—',
        })
    })

    it('renders a CSV with header and quoted cells when needed', () => {
        const rows = buildRegisterRows([
            summary(),
            summary({
                student: {
                    id: 'stu-2',
                    studentCode: 'STU-2',
                    name: 'Aung, Aung',
                    displayName: 'Aung, Aung',
                    avatar: null,
                    active: true,
                    createdAt: 0,
                    updatedAt: 0,
                },
            }),
        ])
        const csv = registerToCsv(rows)
        const lines = csv.split('\r\n')
        expect(lines[0]).toBe('Code,Name,Level,WPM,Accuracy %,Minutes,Progress %,Attempts,Last practiced')
        expect(lines[1].startsWith('STU-001,Ma Ma,level-1,32,94,120,50,12,—')).toBe(true)
        expect(lines[2].startsWith('STU-2,"Aung, Aung"')).toBe(true)
        expect(lines).toHaveLength(3)
    })

    it('escapes commas, quotes and newlines in fields', () => {
        expect(csvField('a,b')).toBe('"a,b"')
        expect(csvField('say "hi"')).toBe('"say ""hi"""')
        expect(csvField('plain')).toBe('plain')
        expect(csvField(42)).toBe('42')
    })

    it('produces a stable filename for the date', () => {
        expect(registerFilename(new Date('2026-09-06T12:00:00Z'))).toBe('register-2026-09-06.csv')
    })

    it('escapes html and keeps numeric alignment classes off text cells', () => {
        const html = registerToHtml(
            [{ code: 'A&B', name: '<b>x</b>', level: '—', wpm: 12, accuracy: 90, minutes: 3, progress: 10, attempts: 2, lastPracticed: '—' }],
            { title: 'Register & roll', generatedAt: 'today' },
        )
        expect(html).toContain('A&amp;B')
        expect(html).toContain('&lt;b&gt;x&lt;/b&gt;')
        expect(html).toContain('<th class="num">WPM</th>')
    })
})
