import type { CSSProperties } from 'react'

export function WpmBars({ values }: { values: number[] }) {
    const n = values.length
    const w = 520
    const h = 190
    const leftPad = 34
    const rightPad = 6
    const topPad = 26
    const base = h - 26
    const chartW = w - leftPad - rightPad

    const max = Math.max(1, ...values)
    const step = max <= 40 ? 10 : max <= 80 ? 20 : 40
    const topMax = Math.max(step, Math.ceil(max / step) * step)
    const heightFor = (v: number) => Math.max(2, (v / topMax) * (base - topPad))
    const yOf = (v: number) => base - heightFor(v)

    const gridValues = [topMax, topMax * 0.75, topMax * 0.5, topMax * 0.25]
    const barW = n > 0 ? (chartW - 6 * (n + 1)) / n : chartW
    const avg = n ? values.reduce((a, b) => a + b, 0) / n : 0
    const best = Math.max(...values, 0)

    return (
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full select-none" role="img" aria-label="WPM over recent sessions">
            <style>
                {`
                .wpm-bar-rise {
                    transform-box: fill-box;
                    transform-origin: center bottom;
                    animation: wpm-rise 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
                    animation-delay: calc(var(--i) * 22ms);
                }
                @keyframes wpm-rise {
                    from { transform: scaleY(0); }
                    to { transform: scaleY(1); }
                }
                .wpm-bar {
                    fill: url(#wpm-grad);
                    opacity: 0.78;
                    transition: fill 0.18s ease, opacity 0.18s ease, filter 0.18s ease;
                }
                .wpm-group:hover .wpm-bar {
                    fill: var(--primary);
                    opacity: 1;
                }
                .wpm-bar.wpm-bar--best {
                    fill: url(#wpm-grad-best);
                    opacity: 1;
                    filter: drop-shadow(0 2px 6px color-mix(in srgb, var(--primary) 45%, transparent));
                }
                .wpm-group:hover .wpm-bar.wpm-bar--best {
                    fill: var(--primary-hover);
                    filter: none;
                }
                .wpm-val {
                    opacity: 0;
                    transition: opacity 0.18s ease;
                }
                .wpm-group:hover .wpm-val,
                .wpm-val.wpm-val--best {
                    opacity: 1;
                }
                `}
            </style>
            <defs>
                <linearGradient id="wpm-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="color-mix(in srgb, var(--primary) 95%, white 5%)" />
                    <stop offset="100%" stopColor="color-mix(in srgb, var(--primary) 30%, transparent)" />
                </linearGradient>
                <linearGradient id="wpm-grad-best" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" />
                    <stop offset="100%" stopColor="color-mix(in srgb, var(--primary) 55%, transparent)" />
                </linearGradient>
            </defs>

            {gridValues.map((v) => {
                const y = yOf(v)
                return (
                    <g key={v}>
                        <line x1={leftPad} x2={w - rightPad} y1={y} y2={y} stroke="var(--line)" strokeDasharray="2 5" />
                        <text
                            x={leftPad - 8}
                            y={y + 3}
                            textAnchor="end"
                            fontSize="8"
                            fill="var(--ink-faint)"
                            fontFamily="var(--font-mono)"
                        >
                            {Math.round(v)}
                        </text>
                    </g>
                )
            })}

            {n > 0 && avg > 0 ? (
                <g>
                    <line
                        x1={leftPad}
                        x2={w - rightPad}
                        y1={yOf(avg)}
                        y2={yOf(avg)}
                        stroke="var(--success)"
                        strokeWidth={1}
                        strokeDasharray="5 4"
                    />
                    <rect
                        x={w - rightPad - 58}
                        y={yOf(avg) - 9}
                        width={56}
                        height={13}
                        rx={6}
                        fill="color-mix(in srgb, var(--success) 14%, var(--surface))"
                        stroke="color-mix(in srgb, var(--success) 38%, transparent)"
                    />
                    <text
                        x={w - rightPad - 30}
                        y={yOf(avg) + 1}
                        textAnchor="middle"
                        fontSize="8"
                        fill="var(--success)"
                        fontFamily="var(--font-mono)"
                    >
                        avg {Math.round(avg)}
                    </text>
                </g>
            ) : null}

            {values.map((value, i) => {
                const isBest = value === best
                const y = yOf(value)
                const bh = heightFor(value)
                const x = leftPad + 6 + i * (barW + 6)
                return (
                    <g key={i} className="wpm-group" style={{ '--i': i } as CSSProperties}>
                        <title>{`Session ${i + 1}: ${Math.round(value)} wpm`}</title>
                        <rect
                            className={`wpm-bar wpm-bar-rise${isBest ? ' wpm-bar--best' : ''}`}
                            x={x}
                            y={y}
                            width={barW}
                            height={bh}
                            rx={Math.min(4, barW / 2)}
                        />
                        <text
                            className={`wpm-val${isBest ? ' wpm-val--best' : ''}`}
                            x={x + barW / 2}
                            y={y - 5}
                            textAnchor="middle"
                            fontSize="8.5"
                            fill={isBest ? 'var(--ink-soft)' : 'var(--ink-faint)'}
                            fontFamily="var(--font-mono)"
                            pointerEvents="none"
                        >
                            {Math.round(value)}
                        </text>
                    </g>
                )
            })}

            {n === 0 ? (
                <text x={w / 2} y={h / 2} textAnchor="middle" fontSize="12" fill="var(--ink-faint)">
                    No completed sessions yet
                </text>
            ) : null}

            <line x1={leftPad} y1={base} x2={w - rightPad} y2={base} stroke="var(--line-strong)" />
        </svg>
    )
}