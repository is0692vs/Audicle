import { render, screen, fireEvent } from "@testing-library/react";
import { PopularArticleCard } from "../PopularArticleCard";
import type { PopularArticle } from "@/types/stats";

// Mock lucide-react icons
jest.mock("lucide-react", () => ({
  Plus: () => <div data-testid="icon-plus" />,
}));

const mockArticle: PopularArticle = {
  url: "https://example.com/article-1",
  domain: "example.com",
  title: "Test Article Title",
  accessCount: 100,
  lastAccessedAt: new Date().toISOString(),
};

describe("PopularArticleCard", () => {
  const mockOnRead = jest.fn();
  const mockOnPlaylistAdd = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("記事の詳細が正しくレンダリングされること", () => {
    render(
      <PopularArticleCard
        article={mockArticle}
        onRead={mockOnRead}
        onPlaylistAdd={mockOnPlaylistAdd}
      />
    );

    expect(screen.getByText("Test Article Title")).toBeInTheDocument();
    expect(screen.getByText("100回")).toBeInTheDocument();
    expect(screen.getByTestId("cache-badge")).toHaveTextContent("キャッシュ済み");
    expect(screen.getByTestId("icon-plus")).toBeInTheDocument();
  });

  it("カードがクリックされたときにonReadが呼び出されること", () => {
    render(
      <PopularArticleCard
        article={mockArticle}
        onRead={mockOnRead}
        onPlaylistAdd={mockOnPlaylistAdd}
      />
    );

    const card = screen.getByTestId("article-card");
    fireEvent.click(card);

    expect(mockOnRead).toHaveBeenCalledWith(mockArticle.url);
    expect(mockOnPlaylistAdd).not.toHaveBeenCalled();
  });

  it("追加ボタンがクリックされたときにonPlaylistAddが呼び出され、イベント伝播が停止すること", () => {
    render(
      <PopularArticleCard
        article={mockArticle}
        onRead={mockOnRead}
        onPlaylistAdd={mockOnPlaylistAdd}
      />
    );

    const addButton = screen.getByRole("button", { name: "プレイリストに追加" });
    fireEvent.click(addButton);

    expect(mockOnPlaylistAdd).toHaveBeenCalledWith(mockArticle);
    expect(mockOnRead).not.toHaveBeenCalled();
  });
});
