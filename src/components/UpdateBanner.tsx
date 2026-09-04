import { Download, RefreshCw } from "lucide-react";
import { useUpdater } from "../services/updater/use-updater";
import { Button } from "./ui/button";

export function UpdateBanner() {
  const { status, check, downloadAndInstall } = useUpdater();

  if (status.state !== "available") return null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-brass/30 bg-brass/10 px-4 py-2.5 text-sm">
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
    </div>
  );
}
