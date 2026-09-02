import { useUpdater } from "../services/updater/use-updater";
import { Modal } from "./ui";

export function UpdateDialog() {
  const { status, install } = useUpdater();

  if (status.state !== "downloading" && status.state !== "downloaded") return null;

  return (
    <Modal open onClose={() => {}}>
      <h2 className="font-display text-lg">
        {status.state === "downloading" ? "Downloading update…" : "Update ready"}
      </h2>

      {status.state === "downloading" && (
        <div className="mt-4">
          <div className="h-2 overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-brass transition-all"
              style={{
                width: status.contentLength
                  ? `${Math.min(100, (status.progress / status.contentLength) * 100)}%`
                  : "indeterminate",
              }}
            />
          </div>
          <p className="mt-2 text-xs text-ink-faint">
            {status.contentLength
              ? `${Math.round((status.progress / status.contentLength) * 100)}%`
              : "Starting…"}
          </p>
        </div>
      )}

      {status.state === "downloaded" && (
        <p className="mt-2 text-sm text-ink-soft">
          The update has been downloaded. The app will restart to finish installing.
        </p>
      )}

      <div className="mt-5 flex justify-end gap-2">
        {status.state === "downloaded" && (
          <button type="button" className="btn btn-primary" onClick={install}>
            Restart now
          </button>
        )}
      </div>
    </Modal>
  );
}
