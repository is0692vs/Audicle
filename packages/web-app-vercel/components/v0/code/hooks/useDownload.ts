export function useDownload(config: any) {
  return {
    status: "idle" as const,
    progress: { current: 0, total: 0 },
    error: null,
    estimatedTime: 0,
    startDownload: () => {},
    cancelDownload: () => {},
  }
}
