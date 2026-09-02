import { useUpdater } from "../services/updater/use-updater";
import { Modal } from "./ui";

export function UpdateDialog() {
  const { status, downloadAndInstall, install } = useUpdater();

  if (
    status.state !== "available" &&
    status.state !== "downloading" &&
    status.state !== "downloaded"
  )
    return null;

  return (
    <Modal open onClose={() => {}}>
      {status.state === "available" && (
        <>
          <p className="eyebrow">Update Available</p>
          <h2 className="mt-1 font-display text-xl">
            OneType v{status.version}
          </h2>
          {status.body && (
            <div className="mt-4 max-h-48 overflow-y-auto rounded-lg border border-line bg-paper-2 p-4">
              <p className="text-xs font-medium text-ink-faint">What&apos;s New</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-ink-soft">
                {status.body}
              </p>
            </div>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className="btn btn-ghost" onClick={() => {}}>
              Later
            </button>
            <button
              type="button"
              className="btn btn-brass"
              onClick={downloadAndInstall}
            >
              Update Now
            </button>
          </div>
        </>
      )}

      {status.state === "downloading" && (
        <>
          <p className="eyebrow">Downloading Update</p>
          <h2 className="mt-1 font-display text-lg">Downloading…</h2>
          <div className="mt-4">
            <div className="h-2 overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-brass transition-all"
                style={{
                  width: status.contentLength
                    ? `${Math.min(100, (status.progress / status.contentLength) * 100)}%`
                    : undefined,
                }}
              />
            </div>
            <p className="mt-2 text-xs text-ink-faint">
              {status.contentLength
                ? `${Math.round((status.progress / status.contentLength) * 100)}%`
                : "Starting…"}
            </p>
          </div>
          <p className="mt-3 text-xs text-ink-faint">
            Please keep OneType open.
          </p>
        </>
      )}

      {status.state === "downloaded" && (
        <>
          <p className="eyebrow">Update Ready</p>
          <h2 className="mt-1 font-display text-lg">Update Downloaded</h2>
          <p className="mt-2 text-sm text-ink-soft">
            The update has been downloaded successfully. OneType needs to
            restart to finish the installation.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className="btn btn-ghost" onClick={() => {}}>
              Later
            </button>
            <button type="button" className="btn btn-primary" onClick={install}>
              Restart &amp; Update
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
