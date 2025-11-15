"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface PlaybackSpeedDialProps {
  open: boolean;
  value: number;
  onValueChange: (value: number) => void;
  onOpenChange: (open: boolean) => void;
  speeds?: number[];
}

const DEFAULT_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];

export function PlaybackSpeedDial({
  open,
  value,
  onValueChange,
  onOpenChange,
  speeds = DEFAULT_SPEEDS,
}: PlaybackSpeedDialProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(
    speeds.indexOf(value) !== -1 ? speeds.indexOf(value) : speeds.indexOf(1)
  );

  useEffect(() => {
    const newIndex = speeds.indexOf(value);
    setSelectedIndex(newIndex !== -1 ? newIndex : speeds.indexOf(1));
  }, [value, speeds]);

  const updateFromPointer = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return;

      const rect = track.getBoundingClientRect();
      const trackWidth = rect.width;
      const relativeX = Math.max(0, Math.min(trackWidth, clientX - rect.left));
      const progress = relativeX / trackWidth;
      const newIndex = Math.round(progress * (speeds.length - 1));

      setSelectedIndex(newIndex);
      onValueChange(speeds[newIndex]);
    },
    [speeds, onValueChange]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      setIsDragging(true);
      updateFromPointer(e.clientX);
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [updateFromPointer]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      updateFromPointer(e.clientX);
    },
    [isDragging, updateFromPointer]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onOpenChange(false);
      }
    },
    [onOpenChange]
  );

  const handleSpeedClick = useCallback(
    (speed: number) => {
      onValueChange(speed);
      onOpenChange(false);
    },
    [onValueChange, onOpenChange]
  );

  const handlePresetClick = useCallback(
    (speed: number) => {
      onValueChange(speed);
    },
    [onValueChange]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false);
      }
    };

    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [open, onOpenChange]);

  if (!open) return null;

  const currentSpeed = speeds[selectedIndex];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full max-w-sm rounded-t-3xl bg-white dark:bg-gray-900 p-6 shadow-2xl transform transition-transform duration-300 ease-out">
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            再生速度
          </h3>
          <p className="text-2xl font-bold text-green-600 mt-2">
            {currentSpeed?.toFixed(1)}x
          </p>
        </div>

        {/* 水平スライダー - 数字直接配置 + 中央固定針 */}
        <div className="relative mb-8">
          <div
            ref={trackRef}
            className="relative h-16 bg-gray-200 dark:bg-gray-700 rounded-full cursor-pointer overflow-hidden flex items-center justify-between px-4"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            {speeds.map((speed, index) => {
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={speed}
                  className={`flex flex-col items-center justify-center w-12 h-12 rounded-full transition-all duration-200 ${
                    isSelected
                      ? "bg-green-600 text-white scale-110 shadow-lg"
                      : "bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600"
                  }`}
                  onClick={() => handleSpeedClick(speed)}
                >
                  <span className="text-sm font-medium">
                    {speed.toFixed(1)}x
                  </span>
                </button>
              );
            })}

            {/* 中央固定針 */}
            <div className="absolute left-1/2 top-0 bottom-0 flex items-center justify-center pointer-events-none transform -translate-x-1/2">
              <div className="w-1 h-10 bg-green-600 rounded-full shadow-lg" />
              <div className="absolute -bottom-2 w-0 h-0 border-l-2 border-r-2 border-t-4 border-l-transparent border-r-transparent border-t-green-600" />
            </div>
          </div>

          {/* 速度範囲ラベル */}
          <div className="flex justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
            <span>{speeds[0]}x</span>
            <span>{speeds[speeds.length - 1]}x</span>
          </div>
        </div>
      </div>
    </div>
  );
}
