import { useState } from 'react'
import { layoutActivity, type ActivityDay, cellLevel } from '@/lib/activity-data'
import { cn } from '@/lib/utils'

export type { ActivityDay }

const WEEKDAYS = ['Mon', 'Wed', 'Fri']
const WEEK_COUNT = 26

export function ActivityHeatmap({ days, title = 'Typing activity' }: { days: ActivityDay[]; title?: string }) {
    // Snapshot "today" once so the trailing window stays stable across re-renders.
    const [now] = useState(() => Date.now())

    const { cells, max } = layoutActivity(days, now)
    const activeDays = cells.filter((c) => c.minutes > 0).length

    return (
        <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-medium">{title}</h2>
                <span className="text-xs text-muted-foreground">
                    {activeDays} active day{activeDays === 1 ? '' : 's'} · last {WEEK_COUNT} weeks
                </span>
            </div>
            <div className="mt-3 overflow-x-auto">
                <div className="flex gap-1" role="img" aria-label={`${title}: ${activeDays} active days in the last ${WEEK_COUNT} weeks`}>
                    <div className="flex w-7 flex-col justify-between py-0.5 text-[9px] leading-3 text-muted-foreground">
                        {WEEKDAYS.map((d) => (
                            <span key={d}>{d}</span>
                        ))}
                    </div>
                    <div className="flex flex-col gap-1">
                        {Array.from({ length: WEEK_COUNT }).map((_, w) => (
                            <div key={w} className="flex gap-1">
                                {cells.slice(w * 7, w * 7 + 7).map((day) => {
                                    const level = cellLevel(day.minutes, max)
                                    return (
                                        <div
                                            key={day.date}
                                            title={`${new Date(day.date).toDateString()} — ${day.minutes ? `${day.minutes.toFixed(0)} min · ${day.sessions} session${day.sessions === 1 ? '' : 's'}` : 'no activity'}`}
                                            className={cn(
                                                'size-3 rounded-[3px] transition-colors',
                                                level === 0 && 'bg-muted/60',
                                                level === 1 && 'bg-brass/25',
                                                level === 2 && 'bg-brass/45',
                                                level === 3 && 'bg-brass/70',
                                                level === 4 && 'bg-brass',
                                            )}
                                        />
                                    )
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
                <span>Less</span>
                {[0, 1, 2, 3, 4].map((l) => (
                    <span key={l} className={cn('size-2.5 rounded-[3px]', l === 0 ? 'bg-muted/60' : l === 1 ? 'bg-brass/25' : l === 2 ? 'bg-brass/45' : l === 3 ? 'bg-brass/70' : 'bg-brass')} />
                ))}
                <span>More</span>
            </div>
        </div>
    )
}
