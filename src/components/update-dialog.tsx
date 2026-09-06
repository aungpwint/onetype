import { AlertCircle, CheckCircle2, Download, Loader2, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { useUpdater } from '@/services/updater/use-updater'
import { Modal } from './ui'
import { Button } from './ui/button'
import { Progress } from './ui/progress'
import { eyebrowClass } from '@/lib/utils'

function formatBytes(bytes: number | undefined): string {
    if (!bytes || bytes <= 0) return ''
    const units = ['B', 'KB', 'MB', 'GB']
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
    return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

export function UpdateDialog() {
    const { status, check, updateNow, install, reset, autoUpdate } = useUpdater()
    const [dismissedVersion, setDismissedVersion] = useState<string | null>(null)
    const [dismissedDownload, setDismissedDownload] = useState(false)

    if (autoUpdate === 'off') return null
    if (status.state === 'idle' || status.state === 'checking' || status.state === 'not-available') return null
    if (status.state === 'available' && dismissedVersion === status.version) return null
    if (status.state === 'downloaded' && dismissedDownload) return null

    const handleLater = () => {
        if (status.state === 'available') setDismissedVersion(status.version)
        else if (status.state === 'downloaded') setDismissedDownload(true)
        else if (status.state === 'error' || status.state === 'completed') void reset()
    }

    const busy = status.state === 'downloading' || status.state === 'installing'
    const version =
        status.state === 'available' || status.state === 'downloading' || status.state === 'downloaded' || status.state === 'installing'
            ? status.version
            : undefined

    return (
        <Modal open onClose={handleLater} ariaLabel="Update available" dismissable={!busy}>
            {status.state === 'available' && (
                <>
                    <p className={eyebrowClass}>Update Available</p>
                    <h2 className="mt-1 font-display text-xl">OneType v{status.version}</h2>
                    {status.body && (
                        <div className="mt-4 max-h-48 overflow-y-auto rounded-lg border border-border bg-muted p-4">
                            <p className="text-xs font-medium text-muted-foreground">What&apos;s New</p>
                            <p className="mt-1 text-sm whitespace-pre-wrap text-foreground">{status.body}</p>
                        </div>
                    )}
                    <div className="mt-5 flex justify-end gap-2">
                        <Button variant="ghost" onClick={handleLater}>
                            Later
                        </Button>
                        <Button variant="brass" onClick={() => void updateNow()}>
                            <Download className="size-4" />
                            Update Now
                        </Button>
                    </div>
                    <p className="mt-3 flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
                        <Loader2 className="size-3" />
                        Update Now downloads and restarts OneType automatically. Your progress is saved.
                    </p>
                </>
            )}

            {status.state === 'downloading' && (
                <>
                    <p className={eyebrowClass}>Downloading Update</p>
                    <h2 className="mt-1 font-display text-lg">{version ? `Updating to v${version}` : 'Updating OneType'}…</h2>
                    <div className="mt-4">
                        <Progress value={status.contentLength ? Math.min(100, (status.progress / status.contentLength) * 100) : 0} />
                        <p className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                            <span>
                                {status.contentLength ? `${Math.round((status.progress / status.contentLength) * 100)}%` : 'Preparing download…'}
                            </span>
                            <span className="tabular-nums">{formatBytes(status.contentLength)}</span>
                        </p>
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">Please keep OneType open while this finishes.</p>
                </>
            )}

            {status.state === 'downloaded' && (
                <>
                    <p className={eyebrowClass}>Update Ready</p>
                    <h2 className="mt-1 font-display text-lg">{version ? `v${version} is ready` : 'Update downloaded'}</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        OneType needs to restart to finish the installation. This takes a moment and your work is saved.
                    </p>
                    <div className="mt-5 flex justify-end gap-2">
                        <Button variant="ghost" onClick={handleLater}>
                            Later
                        </Button>
                        <Button variant="default" onClick={() => void install()}>
                            <RefreshCw className="size-4" />
                            Restart &amp; Update
                        </Button>
                    </div>
                </>
            )}

            {status.state === 'installing' && (
                <>
                    <p className={eyebrowClass}>Updating OneType</p>
                    <h2 className="mt-1 flex items-center gap-2 font-display text-lg">
                        <Loader2 className="size-4 animate-spin text-accent" />
                        {version ? `Installing v${version}` : 'Installing update'}…
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        OneType is restarting itself. Your progress is saved and will be here when you&apos;re back.
                    </p>
                </>
            )}

            {status.state === 'completed' && (
                <>
                    <p className={eyebrowClass}>Update Complete</p>
                    <h2 className="mt-1 flex items-center gap-2 font-display text-lg">
                        <CheckCircle2 className="size-5 text-success" />
                        OneType is up to date
                    </h2>
                    <div className="mt-5 flex justify-end">
                        <Button variant="default" onClick={handleLater}>
                            Done
                        </Button>
                    </div>
                </>
            )}

            {status.state === 'error' && (
                <>
                    <p className={eyebrowClass}>Update Failed</p>
                    <h2 className="mt-1 flex items-center gap-2 font-display text-lg">
                        <AlertCircle className="size-5 text-destructive" />
                        Something went wrong
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">{status.message}</p>
                    <p className="mt-1 text-xs text-muted-foreground">OneType keeps working as usual. You can try again whenever you like.</p>
                    <div className="mt-5 flex justify-end gap-2">
                        <Button variant="ghost" onClick={handleLater}>
                            Later
                        </Button>
                        <Button variant="default" onClick={() => void check()}>
                            <RefreshCw className="size-4" />
                            Try again
                        </Button>
                    </div>
                </>
            )}
        </Modal>
    )
}
