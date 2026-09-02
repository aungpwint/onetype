import { useUpdater } from "../services/updater/use-updater";

export function UpdateBanner() {
  const { status, check } = useUpdater();

  if (status.state !== "available") return null;

  return (
    <div className="flex items-center justify-between rounded-lg border border-brass/30 bg-brass/10 px-4 py-2.5 text-sm">
      <span>
        Update available: <strong>v{status.version}</strong>
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          className="btn btn-ghost !py-1 text-xs"
          onClick={check}
        >
          Check again
        </button>
        <a href="#/settings" className="btn btn-primary !py-1 text-xs">
          View update
        </a>
      </div>
    </div>
  );
}
