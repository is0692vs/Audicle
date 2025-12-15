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
  if ((status === "idle" || status === "completed") && !error) {
    return null;
  }

  if (status === "idle" && error) {
    status = "error";
  }

  const percentage = progress.total
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  const statusMeta: Record<
    "downloading" | "error" | "cancelled",
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

  const activeMeta = statusMeta[status as keyof typeof statusMeta];

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className={cn(
            "flex items-center gap-2 text-sm font-semibold",
            activeMeta?.tone ?? "text-zinc-300"
          )}
        >
          <span className="text-lg" aria-hidden>
            {activeMeta?.icon ?? "ℹ️"}
          </span>
          <span>{activeMeta?.label ?? "ステータス"}</span>
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
            role="progressbar"
            aria-valuenow={percentage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="ダウンロード進行状況"
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

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

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
