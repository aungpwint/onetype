import { useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react'
import { useLocation } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

const PAGE_FADE_IN = 0.18
const PAGE_FADE_OUT = 0.06

const PAGE_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

export function PageTransition({ children, scrollRef }: { children: ReactNode; scrollRef?: RefObject<HTMLElement | null> }) {
    const location = useLocation()
    const nodeRef = useRef<HTMLDivElement>(null)
    const reduceMotion = useReducedMotion()

    useLayoutEffect(() => {
        const scroller = scrollRef?.current ?? nodeRef.current?.parentElement
        scroller?.scrollTo({ top: 0 })
    }, [location.pathname, scrollRef])

    return (
        <AnimatePresence mode="wait" initial={false}>
            <motion.div
                key={location.pathname}
                ref={nodeRef}
                className="page-transition"
                initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0.25, y: 10 }}
                animate={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: PAGE_FADE_OUT, ease: PAGE_EASE } }}
                transition={{ duration: PAGE_FADE_IN, ease: PAGE_EASE }}
            >
                {children}
            </motion.div>
        </AnimatePresence>
    )
}
