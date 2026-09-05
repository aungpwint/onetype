import { memo, type ReactNode } from 'react'
import type { KeyboardLayout, KeyDefinition } from '@/core/keyboard-layout/layout'
import { useTypingStore } from '@/stores/typing-store'
import { resolveLastKey, resolveTarget } from '@/core/target-model'
import type { Hand } from '@/types'
import { WIDE_KEY_LABEL } from '@/utils/finger-mapper'

interface VirtualKeyboardProps {
    layout: KeyboardLayout
    /** Hide the built-in "press the highlighted key to begin" prompt so the
     *  caller can surface its own start instruction (e.g. the Tab-to-start
     *  hint on lesson exercises). */
    hideReadyMessage?: boolean
}

export function VirtualKeyboard({ layout, hideReadyMessage }: VirtualKeyboardProps) {
    const tick = useTypingStore((state) => state.tick)
    void tick

    const status = useTypingStore((state) => state.status)
    const engine = useTypingStore((state) => state.engine)

    const target = resolveTarget(engine, layout)
    const lastKey = resolveLastKey(engine)

    const expectedCode = target.keyCode

    const expectedShiftCode = target.requiresShift ? shiftCodeFor(target.shiftHand) : null

    const showHint = status === 'ready' || status === 'running'

    return (
        <section
            aria-label="Virtual keyboard"
            data-keyboard-root
            className="relative w-full rounded-2xl border border-line/70 bg-linear-to-b from-card/45 via-card/85 to-card/95 p-2.5 shadow-[0_1px_0_inset_rgba(255,255,255,0.35),0_10px_28px_-14px_rgba(0,0,0,0.28)] backdrop-blur-sm select-none sm:p-3.5 lg:p-4 2xl:p-5"
        >
            <div className="mx-auto w-full min-w-0">
                <div className="flex w-full flex-col gap-1.5 rounded-xl bg-key-well p-2 sm:gap-2 sm:p-2.5 lg:gap-2.5 lg:p-3 2xl:p-3.5">
                    {layout.rows.map((row, rowIndex) => (
                        <KeyboardRow key={rowIndex}>
                            {row.map((definition, definitionIndex) => {
                                const isActive = showHint && (definition.code === expectedCode || definition.code === expectedShiftCode)

                                const flashed = definition.code === lastKey.keyCode ? (lastKey.correct ? 'correct' : 'incorrect') : null

                                const isShiftHint = definition.code === expectedShiftCode

                                return (
                                    <Keycap
                                        key={`${rowIndex}-${definition.code || `pad-${definitionIndex}`}`}
                                        definition={definition}
                                        isActive={isActive}
                                        flashed={flashed}
                                        isShiftHint={isShiftHint}
                                    />
                                )
                            })}
                        </KeyboardRow>
                    ))}
                </div>

                <KeyboardStatus status={status} hideReadyMessage={hideReadyMessage} />
            </div>
        </section>
    )
}

function KeyboardRow({ children }: { children: ReactNode }) {
    return <div className="flex w-full min-w-0 gap-1 sm:gap-1.5 lg:gap-2 2xl:gap-2.5">{children}</div>
}

function KeyboardStatus({ status, hideReadyMessage }: { status: ReturnType<typeof useTypingStore.getState>['status']; hideReadyMessage?: boolean }) {
    const message =
        status === 'ready'
            ? hideReadyMessage
                ? null
                : 'Press the highlighted key to begin'
            : status === 'paused'
              ? 'Paused — press Esc to resume'
              : null

    if (!message) {
        return null
    }

    return (
        <p
            key={status}
            className="keyboard-status-in mt-2.5 text-center font-mono text-[0.6875rem] font-medium tracking-wide text-muted-foreground sm:mt-3 lg:mt-3.5"
        >
            {message}
        </p>
    )
}

function shiftCodeFor(hand: Hand | null): string | null {
    if (hand === 'left') {
        return 'ShiftLeft'
    }

    if (hand === 'right') {
        return 'ShiftRight'
    }

    return null
}

interface KeycapProps {
    definition: KeyDefinition
    isActive: boolean
    flashed: 'correct' | 'incorrect' | null
    isShiftHint: boolean
}

const Keycap = memo(function Keycap({ definition, isActive, flashed, isShiftHint }: KeycapProps) {
    const width = definition.width ?? 1

    const isModifier = definition.kind === 'modifier' || definition.plain === undefined

    const isSpace = definition.code === 'Space'

    const wideLabel = WIDE_KEY_LABEL[definition.code]

    const subLabel = definition.code
        .replace(/^Key/, '')
        .replace(/^Digit/, '')
        .replace(/^Bracket/, '')
        .toLowerCase()

    const label = getKeyLabel({
        definition,
        isModifier,
        isSpace,
        wideLabel,
        subLabel,
    })

    const stateClass = getKeyStateClass({
        isActive,
        isShiftHint,
        flashed,
    })

    const pressClass = flashed ? 'key-press' : ''

    // Keycaps are purely visual indicators of the physical keyboard: they never
    // receive pointer or keyboard input, so render them as presentational spans
    // (wholly hidden from assistive tech) rather than disabled/focusable buttons.
    return (
        <span
            aria-hidden
            data-key={definition.code}
            className={[
                'keycap',

                // Responsive height
                'h-10',
                'sm:h-11',
                'lg:h-12',
                '2xl:h-14',

                // Shape — rounded top, slightly squarer bottom for a keycap feel
                'rounded-lg',
                'rounded-b-md',

                // Layout
                'relative',
                'min-w-0',
                'flex',
                'shrink',
                'items-center',
                'justify-center',
                'overflow-hidden',
                'leading-none',

                // Interaction look
                'select-none',
                'transition-[transform,background-color,box-shadow,border-color]',
                'duration-150',
                'ease-out',

                // Motion
                pressClass,

                // State
                stateClass,
            ].join(' ')}
            style={{
                flexGrow: width,
                flexBasis: 0,
            }}
        >
            <KeycapContent>{label}</KeycapContent>
        </span>
    )
})

function KeycapContent({ children }: { children: ReactNode }) {
    return <span className="flex max-w-full min-w-0 items-center justify-center">{children}</span>
}

function getKeyLabel({
    definition,
    isModifier,
    isSpace,
    wideLabel,
    subLabel,
}: {
    definition: KeyDefinition
    isModifier: boolean
    isSpace: boolean
    wideLabel: string | undefined
    subLabel: string
}): ReactNode {
    if (isSpace) {
        return (
            <span className="keycap-mod truncate px-1 text-[0.625rem] font-semibold tracking-[0.12em] text-muted-foreground/70 uppercase sm:text-[0.6875rem] lg:text-xs 2xl:text-[0.8125rem]">
                space
            </span>
        )
    }

    if (isModifier || wideLabel !== undefined) {
        return (
            <span className="keycap-mod max-w-full truncate px-1 text-[0.625rem] font-semibold tracking-tight text-muted-foreground sm:text-[0.6875rem] lg:text-xs 2xl:text-[0.8125rem]">
                {wideLabel ?? definition.label}
            </span>
        )
    }

    const primary = definition.plain ?? definition.label

    // Physical keyboards use uppercase alphabetic legends as the dominant label.
    const isAlphaKey = /^[A-Za-z]$/.test(primary)
    const primaryDisplay = isAlphaKey ? primary.toUpperCase() : primary

    const showSublabel = primary.toLowerCase() !== subLabel && subLabel.length <= 2

    return (
        <span className="flex min-w-0 flex-col items-center justify-center leading-none">
            <span className="keycap-primary font-myanmar text-sm leading-none font-medium sm:text-base lg:text-lg 2xl:text-xl">{primaryDisplay}</span>

            {showSublabel && (
                <span className="keycap-sublabel mt-0.5 font-mono text-[0.5rem] leading-none font-medium tracking-tight uppercase sm:text-[0.5625rem] lg:text-[0.625rem] 2xl:text-[0.6875rem]">
                    {subLabel}
                </span>
            )}
        </span>
    )
}

function getKeyStateClass({ isActive, isShiftHint, flashed }: { isActive: boolean; isShiftHint: boolean; flashed: 'correct' | 'incorrect' | null }) {
    if (isActive && !isShiftHint) {
        return ['keycap-active'].join(' ')
    }

    if (isShiftHint) {
        return ['keycap-hint'].join(' ')
    }

    if (flashed === 'correct') {
        return ['key-flash-correct', 'border-success/60'].join(' ')
    }

    if (flashed === 'incorrect') {
        return ['key-flash-incorrect', 'border-alert/60'].join(' ')
    }

    return ['keycap-idle'].join(' ')
}
