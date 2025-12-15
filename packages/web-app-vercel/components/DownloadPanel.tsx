import { memo } from "react";
import { cn } from "@/lib/utils";

interface DownloadPanelProps {
  status: string;
  progress: {
    current: number;
    total: number;
  };
  error: string | null;
  estimatedTime: number;
  onCancel: () => void;
}

const DownloadPanel = memo(function DownloadPanel({
  status,
  progress,
  error,
  estimatedTime,
  onCancel,
}: DownloadPanelProps) {
  // Simplified logic: Return null if inactive (idle/completed) AND there is no error to show.
  const isInactive = status === "idle" || status === "completed";
  if (isInactive && !error) {
    return null;
  }

  const percentage = progress.total
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  const statusMeta: Record<
    string,
    { icon: string; label: string; tone: string }
  > = {
    downloading: {
      icon: "⬇️",
      label: "音声ファイルを準備中...",
      tone: "text-primary/70",
    },
    error: {
      icon: "⚠️",
      label: "ダウンロードに失敗しました",
      tone: "text-red-400",
    },
    cancelled: {
      icon: "⏹️",
      label: "ダウンロードをキャンセルしました",
      tone: "text-yellow-400",
    },
  };

  // Safe access with fallback instead of type assertion
  const activeMeta = statusMeta[status] ?? {
    icon: "ℹ️",
    label: "ステータス",
    tone: "text-zinc-300",
  };

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className={cn(
            "flex items-center gap-2 text-sm font-semibold",
            activeMeta.tone
          )}
        >
          <span className="text-lg" aria-hidden>
            {activeMeta.icon}
          </span>
          <span>{activeMeta.label}</span>
        </div>
        {progress.total > 0 && (
          <span className="text-sm text-zinc-400">
            {progress.current} / {progress.total} ({percentage}%)
          </span>
        )}
      </div>

      {progress.total > 0 && (
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}

      {status === "downloading" && estimatedTime > 0 && (
        <p className="mt-3 text-xs text-zinc-400">
          {estimatedTime < 60
            ? `残り約 ${Math.round(estimatedTime)} 秒`
            : `残り約 ${Math.round(estimatedTime / 60)} 分`}
        </p>
      )}

      {/* Sanitize error display: Avoid raw error dumps if possible, though currently passed string is used. */}
      {error && (
        <p className="mt-3 text-sm text-red-400" data-testid="download-error">
          {error}
        </p>
      )}

      {status === "downloading" && (
        <button
          onClick={onCancel}
          className="mt-4 inline-flex items-center justify-center rounded-full border border-zinc-700 px-4 py-1.5 text-sm font-medium transition-colors hover:bg-zinc-800"
        >
          キャンセル
        </button>
      )}
    </div>
  );
});

export default DownloadPanel;
