import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import App from './app'
import { initUi } from '@/stores/ui-store'
import { installDevToolsGuards } from '@/security/devtools-guard'
import { ErrorBoundary } from '@/components/ui'
import './app.css'

initUi()
installDevToolsGuards()

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
        <MotionConfig reducedMotion="user">
            <ErrorBoundary>
                <HashRouter>
                    <App />
                </HashRouter>
            </ErrorBoundary>
        </MotionConfig>
    </React.StrictMode>,
)
