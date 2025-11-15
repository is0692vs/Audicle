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
  const dialRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(
    speeds.indexOf(value) !== -1 ? speeds.indexOf(value) : speeds.indexOf(1)
  );

  const MIN_ANGLE = -120;
  const MAX_ANGLE = 120;
  const ANGLE_STEP = (MAX_ANGLE - MIN_ANGLE) / (speeds.length - 1);
  const MIN_INTERACTION_RADIUS = 40;
  const ANGLE_TOLERANCE = 15;

  const positions = speeds.map((speed, index) => ({
    speed,
    angle: MIN_ANGLE + ANGLE_STEP * index,
  }));

  const selectByAngle = useCallback(
    (angle: number) => {
      let closestIndex: number | null = null;
      let smallestDiff = Number.POSITIVE_INFINITY;

      positions.forEach(({ angle: targetAngle }, index) => {
        const diff = Math.abs(targetAngle - angle);
        if (diff < smallestDiff) {
          smallestDiff = diff;
          closestIndex = index;
        }
      });

      if (closestIndex !== null && smallestDiff <= ANGLE_TOLERANCE) {
        setSelectedIndex(closestIndex);
        onValueChange(speeds[closestIndex]);
      }
    },
    [positions, speeds, onValueChange]
  );

  const updateFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const dial = dialRef.current;
      if (!dial) return;

      const rect = dial.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const deltaX = clientX - centerX;
      const deltaY = clientY - centerY;
      const radius = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      if (radius < MIN_INTERACTION_RADIUS) return;

      const angleRadians = Math.atan2(deltaX, -deltaY);
      const angleDegrees = (angleRadians * 180) / Math.PI;

      selectByAngle(angleDegrees);
    },
    [selectByAngle]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      setIsDragging(true);
      updateFromPointer(e.clientX, e.clientY);
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [updateFromPointer]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      updateFromPointer(e.clientX, e.clientY);
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
            {value.toFixed(1)}x
          </p>
        </div>

        <div className="relative h-64 w-64 mx-auto mb-6">
          {/* 背景円 */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 shadow-inner" />

          {/* 速度ボタン */}
          {positions.map(({ speed, angle }, index) => {
            const isSelected = speeds[selectedIndex] === speed;
            const radian = (angle * Math.PI) / 180;
            const radius = 100;
            const x = Math.sin(radian) * radius;
            const y = -Math.cos(radian) * radius;

            return (
              <button
                key={speed}
                onClick={() => handleSpeedClick(speed)}
                className={`absolute w-8 h-8 rounded-full border-2 transition-all duration-200 ${
                  isSelected
                    ? "bg-green-600 border-green-600 text-white shadow-lg scale-110"
                    : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:scale-105"
                }`}
                style={{
                  left: `calc(50% + ${x}px - 16px)`,
                  top: `calc(50% + ${y}px - 16px)`,
                }}
              >
                <span className="text-xs font-medium">{speed.toFixed(1)}</span>
              </button>
            );
          })}

          {/* ポインタ */}
          {selectedIndex !== -1 && (
            <div
              className="absolute w-1 h-12 bg-green-600 rounded-full origin-bottom transition-transform duration-200"
              style={{
                left: "calc(50% - 2px)",
                top: "calc(50% - 48px)",
                transform: `rotate(${positions[selectedIndex]?.angle || 0}deg)`,
              }}
            />
          )}

          {/* 中央の操作エリア */}
          <div
            ref={dialRef}
            className="absolute inset-0 rounded-full cursor-pointer"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              const currentIndex = speeds.indexOf(value);
              if (currentIndex > 0) {
                handleSpeedClick(speeds[currentIndex - 1]);
              }
            }}
            disabled={speeds.indexOf(value) === 0}
            className="flex-1 py-3 px-4 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            ゆっくり
          </button>
          <button
            onClick={() => {
              const currentIndex = speeds.indexOf(value);
              if (currentIndex < speeds.length - 1) {
                handleSpeedClick(speeds[currentIndex + 1]);
              }
            }}
            disabled={speeds.indexOf(value) === speeds.length - 1}
            className="flex-1 py-3 px-4 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            速く
          </button>
        </div>

        <button
          onClick={() => onOpenChange(false)}
          className="w-full mt-4 py-3 px-4 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          閉じる
        </button>
      </div>
    </div>
  );
}
