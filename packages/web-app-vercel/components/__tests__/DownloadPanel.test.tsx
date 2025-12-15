import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import DownloadPanel from "../DownloadPanel";

jest.mock("@/lib/utils", () => ({
  cn: jest.fn((...inputs) => inputs.filter(Boolean).join(" ")),
}));

describe("DownloadPanel", () => {
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Visibility Logic", () => {
    it("should not render when status is idle and no error", () => {
      const { container } = render(
        <DownloadPanel status="idle" progress={{ current: 0, total: 0 }} error={null} estimatedTime={0} onCancel={mockOnCancel} />
      );
      expect(container.firstChild).toBeNull();
    });

    it("should render when status is downloading", () => {
      render(<DownloadPanel status="downloading" progress={{ current: 5, total: 10 }} error={null} estimatedTime={30} onCancel={mockOnCancel} />);
      expect(screen.getByText("音声ファイルを準備中...")).toBeInTheDocument();
    });

    it("should render when error exists even if idle", () => {
      render(<DownloadPanel status="idle" progress={{ current: 0, total: 0 }} error="Network error" estimatedTime={0} onCancel={mockOnCancel} />);
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });

  describe("Progress Display", () => {
    it("should display progress percentage correctly", () => {
      render(<DownloadPanel status="downloading" progress={{ current: 5, total: 10 }} error={null} estimatedTime={30} onCancel={mockOnCancel} />);
      expect(screen.getByText("5 / 10 (50%)")).toBeInTheDocument();
    });

    it("should handle fractional percentages", () => {
      render(<DownloadPanel status="downloading" progress={{ current: 1, total: 3 }} error={null} estimatedTime={10} onCancel={mockOnCancel} />);
      expect(screen.getByText("1 / 3 (33%)")).toBeInTheDocument();
    });
  });

  describe("Estimated Time", () => {
    it("should display time in seconds when less than 60", () => {
      render(<DownloadPanel status="downloading" progress={{ current: 5, total: 10 }} error={null} estimatedTime={45} onCancel={mockOnCancel} />);
      expect(screen.getByText("残り約 45 秒")).toBeInTheDocument();
    });

    it("should display time in minutes when 60 or more", () => {
      render(<DownloadPanel status="downloading" progress={{ current: 2, total: 10 }} error={null} estimatedTime={120} onCancel={mockOnCancel} />);
      expect(screen.getByText("残り約 2 分")).toBeInTheDocument();
    });
  });

  describe("Cancel Button", () => {
    it("should call onCancel when clicked", () => {
      render(<DownloadPanel status="downloading" progress={{ current: 5, total: 10 }} error={null} estimatedTime={30} onCancel={mockOnCancel} />);
      fireEvent.click(screen.getByText("キャンセル"));
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it("should not display cancel button when not downloading", () => {
      render(<DownloadPanel status="error" progress={{ current: 0, total: 0 }} error="Error" estimatedTime={0} onCancel={mockOnCancel} />);
      expect(screen.queryByText("キャンセル")).not.toBeInTheDocument();
    });
  });
});