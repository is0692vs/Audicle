import { render, screen } from "@testing-library/react";
import ReaderView from "../ReaderView";
import type { Chunk } from "@/types/api";

// Mock dependencies
jest.mock("@/hooks/useDownload", () => ({
  useDownload: jest.fn(() => ({
    status: "idle",
    progress: 0,
    error: null,
    estimatedTime: null,
    startDownload: jest.fn(),
    cancelDownload: jest.fn(),
  })),
}));

jest.mock("@/hooks/useAutoScroll", () => ({
  useAutoScroll: jest.fn(),
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
  },
}));

// Mock child components
jest.mock("../ReaderChunk", () => ({
  __esModule: true,
  default: ({ chunk, isActive, onClick }: any) => (
    <div
      data-testid={`reader-chunk-${chunk.id}`}
      data-active={isActive}
      onClick={() => onClick(chunk.id)}
    >
      {chunk.text}
    </div>
  ),
}));

jest.mock("../DownloadPanel", () => ({
  __esModule: true,
  default: ({ status }: any) => (
    <div data-testid="download-panel">Status: {status}</div>
  ),
}));

describe("ReaderView", () => {
  const mockChunks: Chunk[] = [
    { id: "c1", text: "Chunk 1", type: "p" },
    { id: "c2", text: "Chunk 2", type: "p" },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("チャンクが提供されない場合、空の状態をレンダリングすること", () => {
    render(
      <ReaderView
        chunks={[]}
        articleUrl=""
        voiceModel="ja-JP"
        speed={1}
        onChunkClick={jest.fn()}
      />
    );

    expect(
      screen.getByText("読み上げたい記事のURLを入力してください")
    ).toBeInTheDocument();
  });

  it("チャンクが提供された場合、チャンクとダウンロードパネルをレンダリングすること", () => {
    render(
      <ReaderView
        chunks={mockChunks}
        articleUrl="https://example.com"
        currentChunkId="c1"
        voiceModel="ja-JP"
        speed={1}
        onChunkClick={jest.fn()}
      />
    );

    expect(screen.getByTestId("download-panel")).toBeInTheDocument();
    expect(screen.getByTestId("reader-chunk-c1")).toBeInTheDocument();
    expect(screen.getByTestId("reader-chunk-c2")).toBeInTheDocument();
    expect(screen.getByText("Chunk 1")).toBeInTheDocument();
    expect(screen.getByText("Chunk 2")).toBeInTheDocument();
  });

  it("アクティブなチャンクがハイライトされること", () => {
    render(
      <ReaderView
        chunks={mockChunks}
        articleUrl="https://example.com"
        currentChunkId="c1"
        voiceModel="ja-JP"
        speed={1}
        onChunkClick={jest.fn()}
      />
    );

    const chunk1 = screen.getByTestId("reader-chunk-c1");
    const chunk2 = screen.getByTestId("reader-chunk-c2");

    expect(chunk1).toHaveAttribute("data-active", "true");
    expect(chunk2).toHaveAttribute("data-active", "false");
  });

  it("チャンクがクリックされたときにonChunkClickが呼び出されること", () => {
    const mockOnChunkClick = jest.fn();
    render(
      <ReaderView
        chunks={mockChunks}
        articleUrl="https://example.com"
        currentChunkId="c1"
        voiceModel="ja-JP"
        speed={1}
        onChunkClick={mockOnChunkClick}
      />
    );

    const chunk2 = screen.getByTestId("reader-chunk-c2");
    chunk2.click();

    expect(mockOnChunkClick).toHaveBeenCalledWith("c2");
  });
});
