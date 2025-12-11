import React from "react";
import { render, screen } from "@testing-library/react";
import SettingsButton from "../SettingsButton";

describe("SettingsButton", () => {
  it("renders settings link", () => {
    render(<SettingsButton />);

    // Check if link exists and has correct href
    const link = screen.getByRole("link", { name: /設定/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/settings");

    // Check if SVG icon is present (by checking for svg element)
    // Note: getByRole('link') includes its children, but we can verify internal structure if needed.
    // Since title="設定" is on the Link (anchor), getByRole with name should find it.
  });
});
