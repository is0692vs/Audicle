import React from "react";
import { render, act } from "@testing-library/react";
import {
  PlaylistPlaybackProvider,
  usePlaylistPlayback,
} from "@/contexts/PlaylistPlaybackContext";

// Mock next/navigation useRouter
const pushMock = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));

const TestComponent = () => {
  const ctx = usePlaylistPlayback();
  // Expose methods on window for test access
  // @ts-expect-error intentionally exposing internals for tests
  window.__test__ = ctx;
  return null;
};

const sampleItems = Array.from({ length: 3 }).map((_, i) => ({
  id: `item-${i}`,
  article_id: `article-${i}`,
  position: i,
  article: {
    id: `article-${i}`,
    url: `https://example.com/article-${i}`,
    title: `Article ${i}`,
  },
}));

describe("PlaylistPlaybackContext circular behavior", () => {
  beforeEach(() => {
    pushMock.mockClear();
  });

  test("canMovePrevious and canMoveNext are true when items exist", async () => {
    render(
      <PlaylistPlaybackProvider>
        <TestComponent />
      </PlaylistPlaybackProvider>
    );

    // initialize
    await act(async () => {
      // @ts-expect-error test harness: calling internal helper
      await window.__test__.startPlaylistPlayback(
        "pl-1",
        "My Playlist",
        sampleItems,
        0
      );
    });

    // @ts-expect-error test harness: reading internal flags
    const { canMovePrevious, canMoveNext, state } = window.__test__;

    expect(state.items.length).toBe(3);
    expect(canMovePrevious).toBe(true);
    expect(canMoveNext).toBe(true);
  });

  test("playNext wraps around to first item after last", async () => {
    render(
      <PlaylistPlaybackProvider>
        <TestComponent />
      </PlaylistPlaybackProvider>
    );

    await act(async () => {
      // start at last index
      // @ts-expect-error test harness: calling internal helper
      await window.__test__.startPlaylistPlayback(
        "pl-1",
        "My Playlist",
        sampleItems,
        2
      );
      // @ts-expect-error test harness: calling internal helper
      await window.__test__.playNext();
    });

    // Expect push to be called with index=0
    expect(pushMock).toHaveBeenCalled();
    const lastCall = pushMock.mock.calls[pushMock.mock.calls.length - 1][0];
    expect(lastCall).toContain("index=0");
  });

  test("playPrevious wraps around to last item when at first index", async () => {
    render(
      <PlaylistPlaybackProvider>
        <TestComponent />
      </PlaylistPlaybackProvider>
    );

    await act(async () => {
      // start at first index
      // @ts-expect-error test harness: calling internal helper
      await window.__test__.startPlaylistPlayback(
        "pl-1",
        "My Playlist",
        sampleItems,
        0
      );
      // @ts-expect-error test harness: calling internal helper
      await window.__test__.playPrevious();
    });

    // Expect push to be called with index=2
    expect(pushMock).toHaveBeenCalled();
    const lastCall = pushMock.mock.calls[pushMock.mock.calls.length - 1][0];
    expect(lastCall).toContain("index=2");
  });
});
