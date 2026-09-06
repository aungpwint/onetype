import type { StudentSummary } from '@/services/types'
import { formatDateTime } from '@/lib/format'

interface RegisterRow {
    code: string
    name: string
    level: string
    wpm: number
    accuracy: number
    minutes: number
    progress: number
    attempts: number
    lastPracticed: string
}

const REGISTER_HEADERS: ReadonlyArray<keyof RegisterRow> = [
    'code',
    'name',
    'level',
    'wpm',
    'accuracy',
    'minutes',
    'progress',
    'attempts',
    'lastPracticed',
]

const REGISTER_LABELS: Record<keyof RegisterRow, string> = {
    code: 'Code',
    name: 'Name',
    level: 'Level',
    wpm: 'WPM',
    accuracy: 'Accuracy %',
    minutes: 'Minutes',
    progress: 'Progress %',
    attempts: 'Attempts',
    lastPracticed: 'Last practiced',
}

function registerRowFromSummary(s: StudentSummary): RegisterRow {
    return {
        code: s.student.studentCode,
        name: s.student.displayName,
        level: s.level ?? '—',
        wpm: Math.round(s.wpm),
        accuracy: Math.round(s.accuracy),
        minutes: Math.round(s.totalMinutes),
        progress: Math.round(s.progress * 100),
        attempts: s.attempts,
        lastPracticed: s.lastPracticedAt ? formatDateTime(s.lastPracticedAt) : '—',
    }
}

export function buildRegisterRows(summaries: StudentSummary[]): RegisterRow[] {
    return summaries.map(registerRowFromSummary)
}

export function csvField(value: string | number): string {
    const s = String(value)
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function registerToCsv(rows: RegisterRow[], headers: readonly (keyof RegisterRow)[] = REGISTER_HEADERS): string {
    const lines = [headers.map((h) => csvField(REGISTER_LABELS[h])).join(',')]
    for (const row of rows) lines.push(headers.map((h) => csvField(row[h])).join(','))
    return lines.join('\r\n')
}

export function registerFilename(date: Date = new Date()): string {
    const iso = date.toISOString().slice(0, 10)
    return `register-${iso}.csv`
}

function htmlEscape(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

export function registerToHtml(
    rows: RegisterRow[],
    { title, generatedAt }: { title: string; generatedAt: string },
    headers: readonly (keyof RegisterRow)[] = REGISTER_HEADERS,
): string {
    const rowsHtml = rows.map((row) => `<tr>${headers.map((h) => `<td>${htmlEscape(String(row[h]))}</td>`).join('')}</tr>`).join('\n')
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${htmlEscape(title)}</title>
<style>
body { font: 13px/1.5 system-ui, sans-serif; color: #1a1a1a; }
h1 { font-size: 18px; margin: 0 0 2px; }
.meta { color: #666; font-size: 12px; margin-bottom: 16px; }
table { border-collapse: collapse; width: 100%; }
th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; vertical-align: top; }
th { background: #f0f0f0; }
td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
@media print { body { font-size: 11px; } }
</style>
</head>
<body>
<h1>${htmlEscape(title)}</h1>
<p class="meta">Generated ${htmlEscape(generatedAt)}</p>
<table>
<thead><tr>${headers.map((h) => `<th${h === 'wpm' || h === 'accuracy' || h === 'minutes' || h === 'progress' || h === 'attempts' ? ' class="num"' : ''}>${htmlEscape(REGISTER_LABELS[h])}</th>`).join('')}</tr></thead>
<tbody>
${rowsHtml}
</tbody>
</table>
</body>
</html>`
}
