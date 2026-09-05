import { useMemo, type ReactNode } from 'react'
import type { KeyboardLayout } from '@/core/keyboard-layout/layout'
import { useTypingStore } from '@/stores/typing-store'
import { useUiStore } from '@/stores/ui-store'
import { VirtualKeyboard } from './virtual-keyboard'
import { HandOverlay } from '@/components/hand-guide/hand-overlay'
import { resolveTarget } from '@/core/target-model'

export function KeyboardContainer({ layout, hideReadyMessage }: { layout: KeyboardLayout; hideReadyMessage?: boolean }) {
    const handGuide = useUiStore((s) => s.handGuideVisible)

    return (
        <div className="mx-auto w-full max-w-4xl select-none">
            <div className="relative">
                {handGuide ? (
                    <IntegratedHandGuide layout={layout}>
                        <VirtualKeyboard layout={layout} hideReadyMessage={hideReadyMessage} />
                    </IntegratedHandGuide>
                ) : (
                    <VirtualKeyboard layout={layout} hideReadyMessage={hideReadyMessage} />
                )}
            </div>
        </div>
    )
}

function IntegratedHandGuide({ layout, children }: { layout: KeyboardLayout; children: ReactNode }) {
    const tick = useTypingStore((s) => s.tick)
    void tick
    const status = useTypingStore((s) => s.status)
    const engine = useTypingStore((s) => s.engine)
    const target = resolveTarget(engine, engine?.layout ?? null)
    const inPlay = status === 'ready' || status === 'running'

    const activeKey = useMemo(() => (inPlay ? (target.keyCode ?? null) : null), [inPlay, target.keyCode])

    const shiftKey = useMemo(() => {
        if (!inPlay || !target.requiresShift) return null
        return target.shiftHand === 'left' ? 'ShiftLeft' : target.shiftHand === 'right' ? 'ShiftRight' : null
    }, [inPlay, target.requiresShift, target.shiftHand])

    return (
        <HandOverlay layout={layout} activeKey={activeKey} shiftKey={shiftKey} isActive={inPlay}>
            {children}
        </HandOverlay>
    )
}
