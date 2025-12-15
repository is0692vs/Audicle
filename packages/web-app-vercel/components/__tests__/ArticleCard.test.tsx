import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ArticleCard } from "../ArticleCard";
import { PlaylistItemWithArticle } from "@/types/playlist";

// Mock dependencies
jest.mock("@/lib/utils", () => ({
  extractDomain: jest.fn((url) => `domain-of-${url}`),
  cn: jest.fn((...inputs) => inputs.join(" ")),
}));

jest.mock("@/lib/urlBuilder", () => ({
  createReaderUrl: jest.fn(({ articleUrl }) => `/reader?url=${encodeURIComponent(articleUrl)}`),
}));

// Mock lucide-react icons to make button selection robust
jest.mock("lucide-react", () => ({
  Plus: () => <span data-testid="icon-plus" />,
  Minus: () => <span data-testid="icon-minus" />,
}));

const mockItem: PlaylistItemWithArticle = {
  id: "item-1",
  playlist_id: "playlist-1",
  article_id: "article-1",
  position: 0,
  added_at: "2023-01-01T00:00:00Z",
  article: {
    id: "article-1",
    owner_email: "test@example.com",
    url: "https://example.com/article",
    title: "Test Article Title",
    created_at: "2023-01-01T00:00:00Z",
    updated_at: "2023-01-01T00:00:00Z",
  },
};

describe("ArticleCard", () => {
  const mockOnArticleClick = jest.fn();
  const mockOnPlaylistAdd = jest.fn();
  const mockOnRemove = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders article information correctly", () => {
    render(
      <ArticleCard
        item={mockItem}
        onArticleClick={mockOnArticleClick}
        onPlaylistAdd={mockOnPlaylistAdd}
        onRemove={mockOnRemove}
      />
    );

    expect(screen.getByText("Test Article Title")).toBeInTheDocument();
    expect(screen.getByText("domain-of-https://example.com/article")).toBeInTheDocument();
    // Check date formatting (implementation uses ja-JP locale)
    expect(screen.getByText("2023/1/1")).toBeInTheDocument();
  });

  it("handles article click", () => {
    render(
      <ArticleCard
        item={mockItem}
        onArticleClick={mockOnArticleClick}
        onPlaylistAdd={mockOnPlaylistAdd}
        onRemove={mockOnRemove}
      />
    );

    const link = screen.getByTestId("playlist-article");
    fireEvent.click(link);

    expect(mockOnArticleClick).toHaveBeenCalledWith(mockItem);
  });

  it("allows native browser behavior (no custom handler) when modifier key is pressed", () => {
    render(
      <ArticleCard
        item={mockItem}
        onArticleClick={mockOnArticleClick}
        onPlaylistAdd={mockOnPlaylistAdd}
        onRemove={mockOnRemove}
      />
    );

    const link = screen.getByTestId("playlist-article");

    // Simulate Ctrl+Click (open in new tab)
    fireEvent.click(link, { ctrlKey: true });

    // Ensure our custom client-side handler was NOT called
    expect(mockOnArticleClick).not.toHaveBeenCalled();
  });

  it("handles playlist add button click", () => {
    render(
      <ArticleCard
        item={mockItem}
        onArticleClick={mockOnArticleClick}
        onPlaylistAdd={mockOnPlaylistAdd}
        onRemove={mockOnRemove}
      />
    );

    const plusIcon = screen.getByTestId("icon-plus");
    const addButton = plusIcon.closest("button");
    if (!addButton) {
      fail("Add button not found");
    }
    fireEvent.click(addButton);

    expect(mockOnPlaylistAdd).toHaveBeenCalledWith(mockItem.article_id);
    expect(mockOnArticleClick).not.toHaveBeenCalled(); // Propagation stopped
  });

  it("handles remove button click", () => {
    render(
      <ArticleCard
        item={mockItem}
        onArticleClick={mockOnArticleClick}
        onPlaylistAdd={mockOnPlaylistAdd}
        onRemove={mockOnRemove}
      />
    );

    const minusIcon = screen.getByTestId("icon-minus");
    const removeButton = minusIcon.closest("button");
    if (!removeButton) {
      fail("Remove button not found");
    }
    fireEvent.click(removeButton);

    expect(mockOnRemove).toHaveBeenCalledWith(mockItem.id);
    expect(mockOnArticleClick).not.toHaveBeenCalled(); // Propagation stopped
  });

  it("renders 'No Title' when title is missing", () => {
    const itemWithoutTitle = {
      ...mockItem,
      article: {
        ...mockItem.article!,
        title: "",
      },
    };
    render(
      <ArticleCard
        item={itemWithoutTitle}
        onArticleClick={mockOnArticleClick}
        onPlaylistAdd={mockOnPlaylistAdd}
        onRemove={mockOnRemove}
      />
    );
    expect(screen.getByText("No Title")).toBeInTheDocument();
  });
});
