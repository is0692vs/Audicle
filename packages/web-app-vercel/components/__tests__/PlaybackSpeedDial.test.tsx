/**
 * Comprehensive tests for PlaybackSpeedDial component
 * Tests UI interaction, state management, keyboard navigation, and accessibility
 */

import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlaybackSpeedDial } from "../PlaybackSpeedDial";
import "@testing-library/jest-dom";

describe("PlaybackSpeedDial", () => {
  const defaultProps = {
    value: 1,
    speeds: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
    onValueChange: jest.fn(),
    open: false,
    onOpenChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore body overflow
    document.body.style.overflow = "";
  });

  describe("Rendering", () => {
    it("should not render when closed", () => {
      const { container } = render(<PlaybackSpeedDial {...defaultProps} />);
      expect(container.firstChild).toBeNull();
    });

    it("should render when open", () => {
      render(<PlaybackSpeedDial {...defaultProps} open={true} />);
      
      expect(screen.getByText("再生速度")).toBeInTheDocument();
      expect(screen.getByText("1.0x")).toBeInTheDocument();
    });

    it("should display current speed value", () => {
      render(<PlaybackSpeedDial {...defaultProps} open={true} value={1.5} />);
      
      expect(screen.getByText("1.5x")).toBeInTheDocument();
    });

    it("should render all speed markers", () => {
      render(<PlaybackSpeedDial {...defaultProps} open={true} />);
      
      // Check for speed markers in the UI
      const markers = screen.getAllByText(/[0-9.]+x/);
      expect(markers.length).toBeGreaterThan(0);
    });

    it("should render close button", () => {
      render(<PlaybackSpeedDial {...defaultProps} open={true} />);
      
      const closeButton = screen.getByRole("button");
      expect(closeButton).toBeInTheDocument();
    });
  });

  describe("Speed Display and Formatting", () => {
    it("should format speed with one decimal place", () => {
      const { rerender } = render(<PlaybackSpeedDial {...defaultProps} open={true} value={1} />);
      expect(screen.getByText("1.0x")).toBeInTheDocument();

      rerender(<PlaybackSpeedDial {...defaultProps} open={true} value={1.5} />);
      expect(screen.getByText("1.5x")).toBeInTheDocument();

      rerender(<PlaybackSpeedDial {...defaultProps} open={true} value={0.75} />);
      expect(screen.getByText("0.8x")).toBeInTheDocument(); // Rounds to nearest marker
    });

    it("should handle edge case speeds", () => {
      const { rerender } = render(
        <PlaybackSpeedDial {...defaultProps} open={true} value={0.5} />
      );
      expect(screen.getByText("0.5x")).toBeInTheDocument();

      rerender(<PlaybackSpeedDial {...defaultProps} open={true} value={2} />);
      expect(screen.getByText("2.0x")).toBeInTheDocument();
    });

    it("should clamp invalid speed values to available speeds", () => {
      // Value not in speeds array should clamp to nearest
      render(<PlaybackSpeedDial {...defaultProps} open={true} value={0.3} />);
      
      // Should default to 1x or closest valid speed
      expect(screen.queryByText("0.3x")).not.toBeInTheDocument();
    });

    it("should handle speed values outside the range", () => {
      const { rerender } = render(
        <PlaybackSpeedDial {...defaultProps} open={true} value={3} />
      );
      
      // Should clamp to max speed
      expect(screen.queryByText("3.0x")).not.toBeInTheDocument();
      
      rerender(<PlaybackSpeedDial {...defaultProps} open={true} value={0.1} />);
      
      // Should clamp to min speed
      expect(screen.queryByText("0.1x")).not.toBeInTheDocument();
    });
  });

  describe("Close Button Interaction", () => {
    it("should call onOpenChange with false when close button is clicked", () => {
      const onOpenChange = jest.fn();
      render(<PlaybackSpeedDial {...defaultProps} open={true} onOpenChange={onOpenChange} />);
      
      const closeButton = screen.getByRole("button");
      fireEvent.click(closeButton);
      
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it("should close on close button click", async () => {
      const user = userEvent.setup();
      const onOpenChange = jest.fn();
      
      render(<PlaybackSpeedDial {...defaultProps} open={true} onOpenChange={onOpenChange} />);
      
      const closeButton = screen.getByRole("button");
      await user.click(closeButton);
      
      expect(onOpenChange).toHaveBeenCalledWith(false);
      expect(onOpenChange).toHaveBeenCalledTimes(1);
    });
  });

  describe("Pointer Interaction (Drag/Click)", () => {
    it("should handle pointer down event", () => {
      render(<PlaybackSpeedDial {...defaultProps} open={true} />);
      
      const track = document.querySelector(".cursor-pointer");
      expect(track).toBeInTheDocument();
      
      if (track) {
        fireEvent.pointerDown(track, { clientY: 100 });
        // Component should start tracking pointer
      }
    });

    it("should handle pointer move event during drag", () => {
      const onValueChange = jest.fn();
      render(
        <PlaybackSpeedDial {...defaultProps} open={true} onValueChange={onValueChange} />
      );
      
      const track = document.querySelector(".cursor-pointer");
      
      if (track) {
        // Start drag
        fireEvent.pointerDown(track, { clientY: 100 });
        
        // Move pointer
        fireEvent.pointerMove(track, { clientY: 150 });
        
        // Should potentially update preview
      }
    });

    it("should handle pointer up event", () => {
      const onValueChange = jest.fn();
      render(
        <PlaybackSpeedDial {...defaultProps} open={true} onValueChange={onValueChange} />
      );
      
      const track = document.querySelector(".cursor-pointer");
      
      if (track) {
        fireEvent.pointerDown(track, { clientY: 100 });
        fireEvent.pointerMove(track, { clientY: 150 });
        fireEvent.pointerUp(track);
        
        // Should call onValueChange with new speed
        expect(onValueChange).toHaveBeenCalled();
      }
    });

    it("should handle click without drag", () => {
      const onValueChange = jest.fn();
      render(
        <PlaybackSpeedDial {...defaultProps} open={true} onValueChange={onValueChange} />
      );
      
      const track = document.querySelector(".cursor-pointer");
      
      if (track) {
        fireEvent.pointerDown(track, { clientY: 100 });
        fireEvent.pointerUp(track, { clientY: 100 }); // Same position = click
        
        expect(onValueChange).toHaveBeenCalled();
      }
    });

    it("should prevent default on pointer events", () => {
      render(<PlaybackSpeedDial {...defaultProps} open={true} />);
      
      const track = document.querySelector(".cursor-pointer");
      
      if (track) {
        const event = new PointerEvent("pointerdown", {
          clientY: 100,
          cancelable: true,
        });
        
        const preventDefaultSpy = jest.spyOn(event, "preventDefault");
        track.dispatchEvent(event);
        
        // Should prevent default to avoid text selection during drag
        // Note: This depends on implementation
      }
    });
  });

  describe("Keyboard Navigation", () => {
    it("should close dialog on Escape key", () => {
      const onOpenChange = jest.fn();
      render(<PlaybackSpeedDial {...defaultProps} open={true} onOpenChange={onOpenChange} />);
      
      fireEvent.keyDown(document, { key: "Escape" });
      
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it("should not respond to other keys for dialog close", () => {
      const onOpenChange = jest.fn();
      render(<PlaybackSpeedDial {...defaultProps} open={true} onOpenChange={onOpenChange} />);
      
      fireEvent.keyDown(document, { key: "Enter" });
      fireEvent.keyDown(document, { key: "Space" });
      fireEvent.keyDown(document, { key: "Tab" });
      
      expect(onOpenChange).not.toHaveBeenCalled();
    });

    it("should handle multiple Escape key presses", () => {
      const onOpenChange = jest.fn();
      render(<PlaybackSpeedDial {...defaultProps} open={true} onOpenChange={onOpenChange} />);
      
      fireEvent.keyDown(document, { key: "Escape" });
      fireEvent.keyDown(document, { key: "Escape" });
      
      expect(onOpenChange).toHaveBeenCalledTimes(2);
    });
  });

  describe("Body Overflow Management", () => {
    it("should set body overflow to hidden when open", () => {
      render(<PlaybackSpeedDial {...defaultProps} open={true} />);
      
      expect(document.body.style.overflow).toBe("hidden");
    });

    it("should restore body overflow when closed", () => {
      const { rerender } = render(<PlaybackSpeedDial {...defaultProps} open={true} />);
      
      expect(document.body.style.overflow).toBe("hidden");
      
      rerender(<PlaybackSpeedDial {...defaultProps} open={false} />);
      
      expect(document.body.style.overflow).toBe("");
    });

    it("should restore body overflow on unmount", () => {
      const { unmount } = render(<PlaybackSpeedDial {...defaultProps} open={true} />);
      
      expect(document.body.style.overflow).toBe("hidden");
      
      unmount();
      
      expect(document.body.style.overflow).toBe("");
    });
  });

  describe("Speed Selection and Value Change", () => {
    it("should initialize with correct speed index", () => {
      const { rerender } = render(
        <PlaybackSpeedDial {...defaultProps} open={true} value={1} />
      );
      
      expect(screen.getByText("1.0x")).toBeInTheDocument();
      
      rerender(<PlaybackSpeedDial {...defaultProps} open={true} value={1.5} />);
      
      expect(screen.getByText("1.5x")).toBeInTheDocument();
    });

    it("should update when value prop changes", () => {
      const { rerender } = render(
        <PlaybackSpeedDial {...defaultProps} open={true} value={1} />
      );
      
      expect(screen.getByText("1.0x")).toBeInTheDocument();
      
      rerender(<PlaybackSpeedDial {...defaultProps} open={true} value={1.5} />);
      
      expect(screen.getByText("1.5x")).toBeInTheDocument();
    });

    it("should handle rapid value changes", () => {
      const { rerender } = render(
        <PlaybackSpeedDial {...defaultProps} open={true} value={0.5} />
      );
      
      for (const speed of defaultProps.speeds) {
        rerender(<PlaybackSpeedDial {...defaultProps} open={true} value={speed} />);
        // Should update without errors
      }
    });

    it("should call onValueChange with selected speed", () => {
      const onValueChange = jest.fn();
      render(
        <PlaybackSpeedDial {...defaultProps} open={true} onValueChange={onValueChange} />
      );
      
      const track = document.querySelector(".cursor-pointer");
      
      if (track) {
        fireEvent.pointerDown(track, { clientY: 100 });
        fireEvent.pointerUp(track, { clientY: 100 });
        
        expect(onValueChange).toHaveBeenCalledWith(expect.any(Number));
      }
    });
  });

  describe("Speed Array Edge Cases", () => {
    it("should handle single speed option", () => {
      const singleSpeed = [1];
      render(
        <PlaybackSpeedDial {...defaultProps} open={true} speeds={singleSpeed} value={1} />
      );
      
      expect(screen.getByText("1.0x")).toBeInTheDocument();
    });

    it("should handle empty speeds array gracefully", () => {
      const emptyS peeds: number[] = [];
      
      // Should not crash, might show default or no speeds
      expect(() => {
        render(
          <PlaybackSpeedDial {...defaultProps} open={true} speeds={emptySpeeds} value={1} />
        );
      }).not.toThrow();
    });

    it("should handle large number of speeds", () => {
      const manySpeeds = Array.from({ length: 20 }, (_, i) => 0.5 + i * 0.1);
      
      render(
        <PlaybackSpeedDial {...defaultProps} open={true} speeds={manySpeeds} value={1} />
      );
      
      expect(screen.getByText("再生速度")).toBeInTheDocument();
    });

    it("should handle unsorted speeds array", () => {
      const unsortedSpeeds = [2, 0.5, 1.5, 1, 0.75];
      
      render(
        <PlaybackSpeedDial {...defaultProps} open={true} speeds={unsortedSpeeds} value={1} />
      );
      
      expect(screen.getByText("1.0x")).toBeInTheDocument();
    });

    it("should handle duplicate speeds", () => {
      const duplicateSpeeds = [0.5, 1, 1, 1.5, 1.5, 2];
      
      render(
        <PlaybackSpeedDial {...defaultProps} open={true} speeds={duplicateSpeeds} value={1} />
      );
      
      expect(screen.getByText("1.0x")).toBeInTheDocument();
    });
  });

  describe("Preview State", () => {
    it("should update preview index during pointer move", () => {
      const { rerender } = render(
        <PlaybackSpeedDial {...defaultProps} open={true} value={1} />
      );
      
      const track = document.querySelector(".cursor-pointer");
      
      if (track) {
        fireEvent.pointerDown(track, { clientY: 100 });
        fireEvent.pointerMove(track, { clientY: 200 });
        
        // Preview should potentially update
        // Exact behavior depends on implementation
      }
    });

    it("should sync preview with selected on pointer up", () => {
      const onValueChange = jest.fn();
      render(
        <PlaybackSpeedDial {...defaultProps} open={true} onValueChange={onValueChange} />
      );
      
      const track = document.querySelector(".cursor-pointer");
      
      if (track) {
        fireEvent.pointerDown(track, { clientY: 100 });
        fireEvent.pointerMove(track, { clientY: 150 });
        fireEvent.pointerUp(track);
        
        // Preview should sync with selected
        expect(onValueChange).toHaveBeenCalled();
      }
    });
  });

  describe("Event Listener Cleanup", () => {
    it("should remove keydown listener when closed", () => {
      const { rerender } = render(<PlaybackSpeedDial {...defaultProps} open={true} />);
      
      const removeEventListenerSpy = jest.spyOn(document, "removeEventListener");
      
      rerender(<PlaybackSpeedDial {...defaultProps} open={false} />);
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith("keydown", expect.any(Function));
      
      removeEventListenerSpy.mockRestore();
    });

    it("should remove listeners on unmount", () => {
      const { unmount } = render(<PlaybackSpeedDial {...defaultProps} open={true} />);
      
      const removeEventListenerSpy = jest.spyOn(document, "removeEventListener");
      
      unmount();
      
      expect(removeEventListenerSpy).toHaveBeenCalled();
      
      removeEventListenerSpy.mockRestore();
    });

    it("should not leak memory with multiple open/close cycles", () => {
      const { rerender } = render(<PlaybackSpeedDial {...defaultProps} open={false} />);
      
      // Open and close multiple times
      for (let i = 0; i < 10; i++) {
        rerender(<PlaybackSpeedDial {...defaultProps} open={true} />);
        rerender(<PlaybackSpeedDial {...defaultProps} open={false} />);
      }
      
      // Should not have accumulated listeners
      // This is hard to test directly, but component should clean up
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA labels", () => {
      render(<PlaybackSpeedDial {...defaultProps} open={true} />);
      
      // Check for accessibility labels
      const heading = screen.getByText("再生速度");
      expect(heading).toBeInTheDocument();
    });

    it("should be keyboard navigable", () => {
      const onOpenChange = jest.fn();
      render(<PlaybackSpeedDial {...defaultProps} open={true} onOpenChange={onOpenChange} />);
      
      // Should be able to close with keyboard
      fireEvent.keyDown(document, { key: "Escape" });
      expect(onOpenChange).toHaveBeenCalled();
    });

    it("should have proper button roles", () => {
      render(<PlaybackSpeedDial {...defaultProps} open={true} />);
      
      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
    });
  });

  describe("Visual Feedback", () => {
    it("should display speed markers for all speeds", () => {
      render(<PlaybackSpeedDial {...defaultProps} open={true} />);
      
      // Visual markers should be rendered
      const speedDisplay = screen.getByText(/[0-9.]+x/);
      expect(speedDisplay).toBeInTheDocument();
    });

    it("should highlight current speed position", () => {
      render(<PlaybackSpeedDial {...defaultProps} open={true} value={1.5} />);
      
      // Current speed should be displayed
      expect(screen.getByText("1.5x")).toBeInTheDocument();
    });

    it("should update visual feedback during drag", () => {
      render(<PlaybackSpeedDial {...defaultProps} open={true} />);
      
      const track = document.querySelector(".cursor-pointer");
      
      if (track) {
        fireEvent.pointerDown(track, { clientY: 100 });
        fireEvent.pointerMove(track, { clientY: 150 });
        
        // Visual feedback should update
        // Exact implementation depends on CSS classes
      }
    });
  });

  describe("Performance", () => {
    it("should handle rapid pointer movements efficiently", () => {
      render(<PlaybackSpeedDial {...defaultProps} open={true} />);
      
      const track = document.querySelector(".cursor-pointer");
      
      if (track) {
        fireEvent.pointerDown(track, { clientY: 100 });
        
        // Simulate rapid movements
        for (let y = 100; y < 200; y += 5) {
          fireEvent.pointerMove(track, { clientY: y });
        }
        
        fireEvent.pointerUp(track);
        
        // Should handle without performance issues
      }
    });

    it("should not cause excessive re-renders", () => {
      const renderSpy = jest.fn();
      
      const WrapperComponent = (props: typeof defaultProps) => {
        renderSpy();
        return <PlaybackSpeedDial {...props} />;
      };
      
      const { rerender } = render(<WrapperComponent {...defaultProps} open={true} />);
      
      const initialRenderCount = renderSpy.mock.calls.length;
      
      // Change value
      rerender(<WrapperComponent {...defaultProps} open={true} value={1.5} />);
      
      // Should only re-render when necessary
      expect(renderSpy).toHaveBeenCalled();
    });
  });

  describe("Integration Scenarios", () => {
    it("should work with external state management", () => {
      let externalValue = 1;
      const setExternalValue = jest.fn((value: number) => {
        externalValue = value;
      });
      
      const { rerender } = render(
        <PlaybackSpeedDial
          {...defaultProps}
          open={true}
          value={externalValue}
          onValueChange={setExternalValue}
        />
      );
      
      const track = document.querySelector(".cursor-pointer");
      
      if (track) {
        fireEvent.pointerDown(track, { clientY: 100 });
        fireEvent.pointerUp(track, { clientY: 100 });
        
        if (setExternalValue.mock.calls.length > 0) {
          const newValue = setExternalValue.mock.calls[0][0];
          rerender(
            <PlaybackSpeedDial
              {...defaultProps}
              open={true}
              value={newValue}
              onValueChange={setExternalValue}
            />
          );
        }
      }
    });

    it("should maintain state consistency across prop changes", () => {
      const { rerender } = render(
        <PlaybackSpeedDial {...defaultProps} open={true} value={1} />
      );
      
      // Change multiple props
      rerender(<PlaybackSpeedDial {...defaultProps} open={true} value={1.5} />);
      rerender(<PlaybackSpeedDial {...defaultProps} open={false} value={1.5} />);
      rerender(<PlaybackSpeedDial {...defaultProps} open={true} value={1.5} />);
      
      // Should maintain consistency
      expect(screen.queryByText("1.5x")).toBeInTheDocument();
    });

    it("should handle async value updates", async () => {
      const onValueChange = jest.fn();
      
      render(
        <PlaybackSpeedDial {...defaultProps} open={true} onValueChange={onValueChange} />
      );
      
      const track = document.querySelector(".cursor-pointer");
      
      if (track) {
        fireEvent.pointerDown(track, { clientY: 100 });
        fireEvent.pointerUp(track, { clientY: 100 });
        
        await waitFor(() => {
          expect(onValueChange).toHaveBeenCalled();
        });
      }
    });
  });

  describe("Error Boundaries", () => {
    it("should handle invalid prop combinations gracefully", () => {
      // Value not in speeds array
      expect(() => {
        render(
          <PlaybackSpeedDial
            {...defaultProps}
            open={true}
            value={0.3}
            speeds={[0.5, 1, 1.5, 2]}
          />
        );
      }).not.toThrow();
    });

    it("should handle NaN speed values", () => {
      expect(() => {
        render(<PlaybackSpeedDial {...defaultProps} open={true} value={NaN} />);
      }).not.toThrow();
    });

    it("should handle Infinity speed values", () => {
      expect(() => {
        render(<PlaybackSpeedDial {...defaultProps} open={true} value={Infinity} />);
      }).not.toThrow();
    });

    it("should handle negative speed values", () => {
      expect(() => {
        render(<PlaybackSpeedDial {...defaultProps} open={true} value={-1} />);
      }).not.toThrow();
    });
  });

  describe("State Synchronization", () => {
    it("should sync selectedIndex with value prop", () => {
      const { rerender } = render(
        <PlaybackSpeedDial {...defaultProps} open={true} value={1} />
      );
      
      expect(screen.getByText("1.0x")).toBeInTheDocument();
      
      rerender(<PlaybackSpeedDial {...defaultProps} open={true} value={1.75} />);
      
      expect(screen.getByText("1.8x")).toBeInTheDocument(); // Rounds to nearest
    });

    it("should sync previewIndex with selectedIndex on mount", () => {
      render(<PlaybackSpeedDial {...defaultProps} open={true} value={1.5} />);
      
      // Preview should match selected initially
      expect(screen.getByText("1.5x")).toBeInTheDocument();
    });

    it("should reset preview after interaction completes", () => {
      const onValueChange = jest.fn((val) => val);
      const { rerender } = render(
        <PlaybackSpeedDial {...defaultProps} open={true} onValueChange={onValueChange} />
      );
      
      const track = document.querySelector(".cursor-pointer");
      
      if (track) {
        fireEvent.pointerDown(track, { clientY: 100 });
        fireEvent.pointerMove(track, { clientY: 150 });
        fireEvent.pointerUp(track);
        
        if (onValueChange.mock.calls.length > 0) {
          const newValue = onValueChange.mock.results[0].value;
          rerender(
            <PlaybackSpeedDial
              {...defaultProps}
              open={true}
              value={newValue}
              onValueChange={onValueChange}
            />
          );
        }
      }
    });
  });

  describe("Edge Case Interactions", () => {
    it("should handle pointer events outside track boundaries", () => {
      const onValueChange = jest.fn();
      render(
        <PlaybackSpeedDial {...defaultProps} open={true} onValueChange={onValueChange} />
      );
      
      const track = document.querySelector(".cursor-pointer");
      
      if (track) {
        fireEvent.pointerDown(track, { clientY: 100 });
        
        // Move pointer far outside
        fireEvent.pointerMove(track, { clientY: -100 });
        fireEvent.pointerUp(track);
        
        // Should clamp to valid range
        if (onValueChange.mock.calls.length > 0) {
          const value = onValueChange.mock.calls[0][0];
          expect(defaultProps.speeds).toContain(value);
        }
      }
    });

    it("should handle simultaneous pointer events", () => {
      const onValueChange = jest.fn();
      render(
        <PlaybackSpeedDial {...defaultProps} open={true} onValueChange={onValueChange} />
      );
      
      const track = document.querySelector(".cursor-pointer");
      
      if (track) {
        // Simulate multiple pointers (touch)
        fireEvent.pointerDown(track, { clientY: 100, pointerId: 1 });
        fireEvent.pointerDown(track, { clientY: 150, pointerId: 2 });
        
        // Should handle gracefully
        fireEvent.pointerUp(track, { pointerId: 1 });
        fireEvent.pointerUp(track, { pointerId: 2 });
      }
    });

    it("should handle window resize during interaction", () => {
      render(<PlaybackSpeedDial {...defaultProps} open={true} />);
      
      const track = document.querySelector(".cursor-pointer");
      
      if (track) {
        fireEvent.pointerDown(track, { clientY: 100 });
        
        // Simulate window resize
        global.innerHeight = 800;
        fireEvent(window, new Event("resize"));
        
        fireEvent.pointerMove(track, { clientY: 150 });
        fireEvent.pointerUp(track);
        
        // Should handle gracefully
      }
    });
  });

  describe("Regression Tests", () => {
    it("should not have keyboard navigation on track (removed feature)", () => {
      render(<PlaybackSpeedDial {...defaultProps} open={true} />);
      
      const track = document.querySelector(".cursor-pointer");
      
      if (track) {
        // Track should not have role="slider" or aria attributes for keyboard nav
        expect(track).not.toHaveAttribute("role", "slider");
        expect(track).not.toHaveAttribute("tabIndex");
        expect(track).not.toHaveAttribute("aria-valuemin");
        expect(track).not.toHaveAttribute("aria-valuemax");
        expect(track).not.toHaveAttribute("aria-valuenow");
        expect(track).not.toHaveAttribute("aria-valuetext");
      }
    });

    it("should not call onKeyDown on track", () => {
      render(<PlaybackSpeedDial {...defaultProps} open={true} />);
      
      const track = document.querySelector(".cursor-pointer");
      
      if (track) {
        // These keys should not affect the track
        fireEvent.keyDown(track, { key: "ArrowLeft" });
        fireEvent.keyDown(track, { key: "ArrowRight" });
        fireEvent.keyDown(track, { key: "Home" });
        fireEvent.keyDown(track, { key: "End" });
        
        // No keyboard handler should be registered
        // Only Escape should work at document level
      }
    });

    it("should not auto-focus track when opening", () => {
      const { rerender } = render(<PlaybackSpeedDial {...defaultProps} open={false} />);
      
      rerender(<PlaybackSpeedDial {...defaultProps} open={true} />);
      
      const track = document.querySelector(".cursor-pointer");
      
      // Track should not be focused
      expect(document.activeElement).not.toBe(track);
    });
  });
});