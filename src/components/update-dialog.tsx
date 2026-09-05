import { Download, RefreshCw } from 'lucide-react'
import { useUpdater } from '@/services/updater/use-updater'
import { Modal } from './ui'
import { Button } from './ui/button'
import { Progress } from './ui/progress'
import { eyebrowClass } from '@/lib/utils'

export function UpdateDialog() {
    const { status, downloadAndInstall, install } = useUpdater()

    if (status.state !== 'available' && status.state !== 'downloading' && status.state !== 'downloaded') return null

    return (
        <Modal open onClose={() => {}} ariaLabel="Update available">
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
                        <Button variant="ghost" onClick={() => {}}>
                            Later
                        </Button>
                        <Button variant="brass" onClick={downloadAndInstall}>
                            <Download className="size-4" />
                            Update Now
                        </Button>
                    </div>
                </>
            )}

            {status.state === 'downloading' && (
                <>
                    <p className={eyebrowClass}>Downloading Update</p>
                    <h2 className="mt-1 font-display text-lg">Downloading…</h2>
                    <div className="mt-4">
                        <Progress value={status.contentLength ? Math.min(100, (status.progress / status.contentLength) * 100) : 0} />
                        <p className="mt-2 text-xs text-muted-foreground">
                            {status.contentLength ? `${Math.round((status.progress / status.contentLength) * 100)}%` : 'Starting…'}
                        </p>
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">Please keep OneType open.</p>
                </>
            )}

            {status.state === 'downloaded' && (
                <>
                    <p className={eyebrowClass}>Update Ready</p>
                    <h2 className="mt-1 font-display text-lg">Update Downloaded</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        The update has been downloaded successfully. OneType needs to restart to finish the installation.
                    </p>
                    <div className="mt-5 flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => {}}>
                            Later
                        </Button>
                        <Button variant="default" onClick={install}>
                            <RefreshCw className="size-4" />
                            Restart &amp; Update
                        </Button>
                    </div>
                </>
            )}
        </Modal>
    )
}
