import { useEffect } from 'react'

// Pins html and body to the viewport while the caller is mounted, so the page
// can never scroll no matter what the layout does. Restores the previous
// overflow styles on unmount. Mirrors the app-shell/session route behavior:
// full-screen session views leave the shell, so html/body must be locked here.
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