import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ReaderChunk from "../ReaderChunk";
import { Chunk } from "@/types/api";

jest.mock("@/lib/utils", () => ({
  cn: jest.fn((...inputs) => inputs.filter(Boolean).join(" ")),
}));

describe("ReaderChunk", () => {
  const mockOnClick = jest.fn();
  const createChunk = (overrides: Partial<Chunk> = {}): Chunk => ({
    id: "chunk-1",
    text: "Sample text",
    cleanedText: "Sample text",
    type: "paragraph",
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Basic Rendering", () => {
    it("should render chunk text", () => {
      const chunk = createChunk({ text: "Test paragraph" });
      render(<ReaderChunk chunk={chunk} isActive={false} onClick={mockOnClick} />);
      expect(screen.getByText("Test paragraph")).toBeInTheDocument();
    });

    it("should have data-audicle-id attribute", () => {
      const chunk = createChunk({ id: "test-123" });
      const { container } = render(<ReaderChunk chunk={chunk} isActive={false} onClick={mockOnClick} />);
      expect(container.querySelector('[data-audicle-id="test-123"]')).toBeInTheDocument();
    });
  });

  describe("Heading Rendering", () => {
    it("should render h1 with correct style", () => {
      const chunk = createChunk({ type: "h1", text: "Main Heading" });
      render(<ReaderChunk chunk={chunk} isActive={false} onClick={mockOnClick} />);
      const heading = screen.getByText("Main Heading");
      expect(heading).toHaveClass("text-3xl", "font-semibold");
    });

    it("should render h2 with correct style", () => {
      const chunk = createChunk({ type: "h2", text: "Section" });
      render(<ReaderChunk chunk={chunk} isActive={false} onClick={mockOnClick} />);
      expect(screen.getByText("Section")).toHaveClass("text-2xl", "font-semibold");
    });

    it("should render h3 with correct style", () => {
      const chunk = createChunk({ type: "h3", text: "Subsection" });
      render(<ReaderChunk chunk={chunk} isActive={false} onClick={mockOnClick} />);
      expect(screen.getByText("Subsection")).toHaveClass("text-xl", "font-semibold");
    });
  });

  describe("Special Content Types", () => {
    it("should render list item with margin", () => {
      const chunk = createChunk({ type: "li", text: "List item" });
      render(<ReaderChunk chunk={chunk} isActive={false} onClick={mockOnClick} />);
      expect(screen.getByText("List item")).toHaveClass("ml-6");
    });

    it("should render blockquote with border", () => {
      const chunk = createChunk({ type: "blockquote", text: "Quote" });
      render(<ReaderChunk chunk={chunk} isActive={false} onClick={mockOnClick} />);
      expect(screen.getByText("Quote")).toHaveClass("border-l-4", "italic");
    });
  });

  describe("Active State", () => {
    it("should apply active styling when isActive is true", () => {
      const chunk = createChunk();
      const { container } = render(<ReaderChunk chunk={chunk} isActive={true} onClick={mockOnClick} />);
      const element = container.querySelector('[data-audicle-id]');
      expect(element).toHaveClass("border-primary/60", "bg-primary/20");
    });

    it("should apply font-medium to active non-heading", () => {
      const chunk = createChunk({ type: "paragraph" });
      render(<ReaderChunk chunk={chunk} isActive={true} onClick={mockOnClick} />);
      expect(screen.getByText("Sample text")).toHaveClass("font-medium");
    });
  });

  describe("Click Interaction", () => {
    it("should call onClick with chunk id", () => {
      const chunk = createChunk({ id: "click-test" });
      render(<ReaderChunk chunk={chunk} isActive={false} onClick={mockOnClick} />);
      fireEvent.click(screen.getByText("Sample text").closest("div")!);
      expect(mockOnClick).toHaveBeenCalledWith("click-test");
    });

    it("should not throw when onClick is undefined", () => {
      const chunk = createChunk();
      render(<ReaderChunk chunk={chunk} isActive={false} />);
      expect(() => fireEvent.click(screen.getByText("Sample text").closest("div")!)).not.toThrow();
    });
  });
});