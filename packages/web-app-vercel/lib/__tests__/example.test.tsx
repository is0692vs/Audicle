import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

describe("Example Test", () => {
  it("should render a simple text", () => {
    render(<div>Hello World</div>);
    expect(screen.getByText("Hello World")).toBeInTheDocument();
  });
});
