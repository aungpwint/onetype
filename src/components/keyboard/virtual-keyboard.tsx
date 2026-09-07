import { memo, type ReactNode } from 'react'
import type { KeyboardLayout, KeyDefinition } from '@/core/keyboard-layout/layout'
import { useTypingStore } from '@/stores/typing-store'
import { resolveLastKey, resolveTarget } from '@/core/target-model'
import { containsMyanmar } from '@/core/unicode/myanmar'
import type { Hand } from '@/types'
import { WIDE_KEY_LABEL } from '@/core/finger-mapping/finger-map'

interface VirtualKeyboardProps {
    layout: KeyboardLayout
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
            className="relative w-full rounded-2xl border border-line bg-card/60 p-2.5 shadow-(--shadow-2) backdrop-blur-xl select-none sm:p-3.5 lg:p-4 2xl:p-5"
        >
            <div className="mx-auto w-full min-w-0">
                <div className="keyboard-well flex w-full flex-col gap-1.5 rounded-xl p-2 sm:gap-2 sm:p-2.5 lg:gap-2.5 lg:p-3 2xl:p-3.5">
                    {layout.rows.map((row, rowIndex) => (
                        <KeyboardRow key={rowIndex}>
                            {row.map((definition, definitionIndex) => {
                                const isActive = showHint && (definition.code === expectedCode || definition.code === expectedShiftCode)

                                const flashed = definition.code === lastKey.keyCode ? (lastKey.correct ? 'correct' : 'incorrect') : null

                                const isShiftHint = definition.code === expectedShiftCode

                                return (
                                    <Keycap
                                        key={`${rowIndex}-${definition.code || `pad-${definitionIndex}`}`}
                                        layout={layout}
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
    return <div className="flex w-full min-w-0 items-stretch gap-1 sm:gap-1.5 lg:gap-2 2xl:gap-2.5">{children}</div>
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
            className="keyboard-status-in mt-3.5 text-center font-mono text-[0.6875rem] font-medium tracking-wide text-muted-foreground sm:mt-4 lg:text-xs"
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
    layout: KeyboardLayout
    definition: KeyDefinition
    isActive: boolean
    flashed: 'correct' | 'incorrect' | null
    isShiftHint: boolean
}

const Keycap = memo(function Keycap({ layout, definition, isActive, flashed, isShiftHint }: KeycapProps) {
    const width = definition.width ?? 1

    const isModifier = definition.kind === 'modifier' || definition.plain === undefined

    const isSpace = definition.code === 'Space'

    const wideLabel = WIDE_KEY_LABEL[definition.code]

    const label = getKeyLabel({
        layout,
        definition,
        isModifier,
        isSpace,
        wideLabel,
    })

    const stateClass = getKeyStateClass({
        isActive,
        isShiftHint,
        flashed,
    })

    const pressClass = flashed ? 'key-press' : ''

    return (
        <span
            aria-hidden
            data-key={definition.code}
            className={[
                'keycap',

                // Taller so Burmese ascenders/descenders breathe
                'h-10',
                'sm:h-11',
                'lg:h-12',
                '2xl:h-14',

                'rounded-[11px]',
                'rounded-b-md',

                'relative',
                'min-w-0',
                'flex',
                'items-center',
                'justify-center',
                'leading-none',

                'select-none',
                'transition-[transform,background-color,box-shadow,border-color]',
                'duration-150',
                'ease-out',

                pressClass,

                stateClass,
            ].join(' ')}
            style={{
                flexGrow: width,
                flexShrink: width,
                flexBasis: `calc(var(--key-unit) * ${width})`,
            }}
        >
            {label}
        </span>
    )
})

const ASCII_LEGEND: Record<string, string> = {
    Backquote: '`',
    Minus: '-',
    Equal: '=',
    BracketLeft: '[',
    BracketRight: ']',
    Backslash: '\\',
    Semicolon: ';',
    Quote: "'",
    Comma: ',',
    Period: '.',
    Slash: '/',
}

function asciiLegendFor(code: string): string {
    const literal = ASCII_LEGEND[code]
    if (literal !== undefined) return literal

    if (code.startsWith('Key')) return code.slice(3)
    if (code.startsWith('Digit')) return code.slice(5)

    return code
}

function getKeyLabel({
    layout,
    definition,
    isModifier,
    isSpace,
    wideLabel,
}: {
    layout: KeyboardLayout
    definition: KeyDefinition
    isModifier: boolean
    isSpace: boolean
    wideLabel: string | undefined
}): ReactNode {
    // Keycap label must equal layout.outputFor so the UI and typed Unicode never diverge.
    const plain = layout.outputFor(definition.code, 'none')?.text ?? definition.plain ?? definition.label
    const shifted = layout.outputFor(definition.code, 'shift')?.text ?? definition.shifted

    if (isSpace) {
        return (
            <span className="keycap-mod absolute inset-x-0 bottom-2 truncate px-1.5 text-center text-[0.625rem] font-semibold tracking-[0.14em] text-muted-foreground/70 uppercase sm:text-[0.6875rem] lg:text-xs 2xl:text-[0.8125rem]">
                space
            </span>
        )
    }

    if (isModifier || wideLabel !== undefined) {
        return (
            <span className="keycap-mod absolute top-1 left-1.5 max-w-[calc(100%-0.75rem)] truncate text-[0.55rem] font-semibold tracking-[0.08em] text-muted-foreground uppercase sm:top-1.5 sm:left-2 sm:text-[0.625rem] lg:text-[0.6875rem]">
                {wideLabel ?? definition.label}
            </span>
        )
    }

    const shiftedLong = shifted !== undefined && shifted.length > 2

    return (
        <>
            <span className="keycap-sublabel absolute top-1 left-1.5 text-[0.5rem] font-medium tracking-tight sm:top-1.5 sm:left-2 sm:text-[0.5625rem] lg:text-[0.6rem]">
                {asciiLegendFor(definition.code)}
            </span>

            {shifted !== undefined && shifted.length > 0 && (
                <span
                    className={[
                        'keycap-shift absolute top-1 right-1.5 max-w-[62%] text-right whitespace-nowrap sm:top-1.5 sm:right-2',
                        containsMyanmar(shifted) ? 'font-myanmar' : 'font-keyboard',
                        shiftedLong
                            ? 'text-[0.55rem] leading-none font-semibold sm:text-[0.625rem] lg:text-[0.6875rem]'
                            : 'text-[0.625rem] leading-none font-semibold sm:text-xs lg:text-sm',
                    ].join(' ')}
                >
                    {shifted}
                </span>
            )}

            <span
                className={[
                    'keycap-primary absolute inset-x-0 bottom-1 text-center whitespace-nowrap',
                    containsMyanmar(plain) ? 'font-myanmar' : 'font-keyboard',
                    'text-[0.9375rem] font-medium sm:text-base lg:text-lg 2xl:text-xl',
                ].join(' ')}
            >
                {plain}
            </span>
        </>
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
