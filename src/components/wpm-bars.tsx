export function WpmBars({ values }: { values: number[] }) {
    const w = 480
    const h = 120
    const pad = 4
    const max = Math.max(1, ...values)
    const n = values.length
    const barW = n > 0 ? (w - pad * (n + 1)) / n : w
    return (
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="WPM over recent sessions">
            <defs>
                <linearGradient id="wpm-bars" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" />
                    <stop offset="100%" stopColor="color-mix(in srgb, var(--accent) 48%, transparent)" />
                </linearGradient>
            </defs>
            {[0.25, 0.5, 0.75].map((g) => (
                <line key={g} x1={0} x2={w} y1={h - g * (h - 16)} y2={h - g * (h - 16)} stroke="var(--line)" strokeDasharray="2 4" />
            ))}
            {values.map((value, i) => {
                const bh = Math.max(2, (value / max) * (h - 24))
                const x = pad + i * (barW + pad)
                return (
                    <g key={i}>
                        <rect x={x} y={h - bh} width={barW} height={bh} rx={3} fill="url(#wpm-bars)" />
                        <text x={x + barW / 2} y={h - bh - 4} textAnchor="middle" fontSize="8" fill="var(--ink-faint)" fontFamily="var(--font-mono)">
                            {Math.round(value)}
                        </text>
                    </g>
                )
            })}
            {values.length === 0 ? (
                <text x={w / 2} y={h / 2} textAnchor="middle" fontSize="12" fill="var(--ink-faint)">
                    No completed sessions yet
                </text>
            ) : null}
            <line x1={0} y1={h - 0.5} x2={w} y2={h - 0.5} stroke="var(--line-strong)" />
        </svg>
    )
}
