"use client";

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  useLayoutEffect,
} from "react";

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
  const itemRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [totalItemWidth, setTotalItemWidth] = useState(64); // 初期値として64pxを設定
  const startXRef = useRef(0);
  const startIndexRef = useRef(0);
  const [dragOffset, setDragOffset] = useState(0);
  const initialIndex =
    speeds.indexOf(value) !== -1 ? speeds.indexOf(value) : speeds.indexOf(1);
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const [previewIndex, setPreviewIndex] = useState(initialIndex);

  useEffect(() => {
    const newIndex = speeds.indexOf(value);
    const index = newIndex !== -1 ? newIndex : speeds.indexOf(1);
    setSelectedIndex(index);
    setPreviewIndex(index);
  }, [value, speeds]);

  // DOMからアイテムの幅を動的に取得
  useLayoutEffect(() => {
    if (itemRef.current) {
      const itemRect = itemRef.current.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(itemRef.current);
      const marginLeft = parseFloat(computedStyle.marginLeft);
      const marginRight = parseFloat(computedStyle.marginRight);
      const totalWidth = itemRect.width + marginLeft + marginRight;
      setTotalItemWidth(totalWidth);
    }
  }, [open]); // openがtrueになった時に再計算

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      setIsDragging(true);
      startXRef.current = e.clientX;
      startIndexRef.current = selectedIndex;
      setDragOffset(0);
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [selectedIndex]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      const currentX = e.clientX;
      const totalDeltaX = currentX - startXRef.current;
      setDragOffset(totalDeltaX);

      // プレビュー選択: 中央に来るアイテムを先にハイライトして見せる
      if (totalItemWidth > 0) {
        const deltaIndex = Math.round(totalDeltaX / totalItemWidth);
        const newPreviewIndex = Math.max(
          0,
          Math.min(speeds.length - 1, startIndexRef.current - deltaIndex)
        );
        setPreviewIndex(newPreviewIndex);
        // ライブで再生速度を変更してプレビューする（必要に応じて削除可能）
        onValueChange(speeds[newPreviewIndex]);
      }
    },
    [isDragging, totalItemWidth, speeds, onValueChange]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
    // スナップ: dragOffset に基づいて一番近いインデックスに
    const offsetIndex = dragOffset / totalItemWidth;
    const targetIndex = Math.max(
      0,
      Math.min(
        speeds.length - 1,
        Math.round(startIndexRef.current - offsetIndex)
      )
    );
    setSelectedIndex(targetIndex);
    setPreviewIndex(targetIndex);
    onValueChange(speeds[targetIndex]);
    setDragOffset(0);
  }, [dragOffset, totalItemWidth, speeds, onValueChange]);

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
      const index = speeds.indexOf(speed);
      if (index !== -1) setSelectedIndex(index);
      onValueChange(speed);
      onOpenChange(false);
    },
    [onValueChange, onOpenChange, speeds]
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

  const currentSpeed = speeds[previewIndex];

  // 中央に配置するためのtransform計算
  const transformValue = `translateX(${
    -(previewIndex * totalItemWidth + totalItemWidth / 2) + dragOffset
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
            <div
              className="absolute left-1/2 top-0 z-10"
              style={{ transform: `translateX(-50%)` }}
            >
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
                className="absolute top-0 left-1/2 flex items-center"
                style={{
                  transform: transformValue,
                  transformOrigin: "left",
                  transition: isDragging ? "none" : "transform 0.2s ease-out",
                  pointerEvents: "none",
                }}
              >
                {speeds.map((speed, index) => {
                  const distanceFromCenter = Math.abs(index - previewIndex);
                  const isSelected = index === previewIndex;
                  const scale = isSelected
                    ? 1.2
                    : Math.max(0.8, 1 - distanceFromCenter * 0.1);
                  const opacity = isSelected
                    ? 1
                    : Math.max(0.5, 1 - distanceFromCenter * 0.2);

                  return (
                    <div
                      key={speed}
                      ref={index === 0 ? itemRef : null} // 最初のアイテムにrefを設定
                      onClick={() => handleSpeedClick(speed)}
                      className="flex flex-col items-center justify-center mx-2 transition-all duration-200 cursor-pointer"
                      style={{
                        transform: `scale(${scale})`,
                        opacity,
                        pointerEvents: "auto",
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
