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

  // 各アイテムの幅（ボタンの幅 + マージン）
  const itemWidth = 48; // w-12 = 48px
  const horizontalMargin = 16; // mx-2による左右マージンの合計 (8px * 2)
  const totalItemWidth = itemWidth + horizontalMargin;

  // 中央に配置するためのtransform計算
  const centerOffset = (speeds.length - 1) / 2;
  const transformValue = `translateX(${
    (centerOffset - selectedIndex) * totalItemWidth
  }px)`;

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

        {/* 水平スライダー - 中央インジケーター付きピッカー */}
        <div className="relative mb-8">
          <div className="relative h-20 overflow-hidden">
            {/* 中央インジケーター */}
            <div className="absolute left-1/2 top-0 z-10 transform -translate-x-1/2">
              <div className="w-0 h-0 border-l-4 border-r-4 border-b-6 border-l-transparent border-r-transparent border-b-green-600" />
            </div>

            {/* ドラッグ可能なトラック */}
            <div
              ref={trackRef}
              className="relative h-full cursor-pointer"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            >
              {/* 移動する数字リスト */}
              <div
                className="absolute top-0 left-1/2 flex items-center transition-transform duration-200 ease-out"
                style={{
                  transform: transformValue,
                  transformOrigin: "center",
                }}
              >
                {speeds.map((speed, index) => {
                  const distanceFromCenter = Math.abs(index - selectedIndex);
                  const isSelected = index === selectedIndex;
                  const scale = isSelected
                    ? 1.2
                    : Math.max(0.8, 1 - distanceFromCenter * 0.1);
                  const opacity = isSelected
                    ? 1
                    : Math.max(0.5, 1 - distanceFromCenter * 0.2);

                  return (
                    <div
                      key={speed}
                      onClick={() => onValueChange(speed)}
                      className="flex flex-col items-center justify-center mx-2 transition-all duration-200 cursor-pointer"
                      style={{
                        transform: `scale(${scale})`,
                        opacity,
                      }}
                    >
                      <div
                        className={`flex items-center justify-center w-12 h-12 rounded-full transition-colors duration-200 ${
                          isSelected
                            ? "bg-green-600 text-white"
                            : "bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        <span className="text-sm font-medium">
                          {speed.toFixed(1)}x
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
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
