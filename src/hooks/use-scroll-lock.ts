import { useEffect } from 'react'

export function useScrollLock() {
    useEffect(() => {
        const html = document.documentElement
        const body = document.body
        const restored = { html: html.style.overflowY, body: body.style.overflowY }
        html.style.overflowY = 'hidden'
        body.style.overflowY = 'hidden'
        return () => {
            html.style.overflowY = restored.html
            body.style.overflowY = restored.body
        }
    }, [])
}
