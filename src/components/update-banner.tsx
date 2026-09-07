import { Download, RefreshCw } from 'lucide-react'
import { useUpdater } from '@/services/updater/use-updater'
import { Button } from './ui/button'
import { Progress } from './ui/progress'

export function UpdateBanner() {
    const { status, check, downloadAndInstall, install } = useUpdater()

    if (status.state !== 'available' && status.state !== 'downloading' && status.state !== 'downloaded') return null

    const percent = status.state === 'downloading' && status.contentLength ? Math.min(100, (status.progress / status.contentLength) * 100) : 0

    return (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-accent/30 bg-accent/10 px-4 py-2.5 text-sm">
            {status.state === 'available' && (
                <>
                    <span>
                        Update available: <strong>v{status.version}</strong>
                    </span>
                    <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={check}>
                            <RefreshCw className="size-3.5" />
                            Check again
                        </Button>
                        <Button size="sm" variant="brass" onClick={downloadAndInstall}>
                            <Download className="size-3.5" />
                            Download &amp; install
                        </Button>
                    </div>
                </>
            )}

            {status.state === 'downloading' && (
                <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="shrink-0 text-muted-foreground">Downloading {status.version ? `v${status.version}` : 'update'}…</span>
                    <Progress value={percent} className="max-w-44" />
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                        {status.contentLength ? `${Math.round(percent)}%` : '…'}
                    </span>
                </div>
            )}

            {status.state === 'downloaded' && (
                <>
                    <span>
                        Update ready — <strong>restart to finish</strong>
                    </span>
                    <Button size="sm" variant="default" onClick={() => void install()}>
                        <RefreshCw className="size-3.5" />
                        Restart &amp; Update
                    </Button>
                </>
            )}
        </div>
    )
}
