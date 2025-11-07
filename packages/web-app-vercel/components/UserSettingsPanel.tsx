"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  UserSettings,
  VOICE_MODELS,
  Language,
  VoiceModel,
} from "@/types/settings";

export default function UserSettingsPanel() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanged, setHasChanged] = useState(false);

  // Fetch settings on mount
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/settings/get");

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch settings");
      }

      const data = await response.json();
      setSettings({
        playback_speed: data.playback_speed,
        voice_model: data.voice_model,
        language: data.language,
      });
      setHasChanged(false);
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("設定の読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handlePlaybackSpeedChange = (value: number) => {
    if (settings) {
      setSettings({ ...settings, playback_speed: value });
      setHasChanged(true);
    }
  };

  const handleVoiceModelChange = (value: string) => {
    if (settings) {
      setSettings({
        ...settings,
        voice_model: value as VoiceModel,
      });
      setHasChanged(true);
    }
  };

  const handleLanguageChange = (value: string) => {
    if (settings) {
      // 言語変更 (音声モデルは独立)
      setSettings({
        ...settings,
        language: value as Language,
      });
      setHasChanged(true);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      const response = await fetch("/api/settings/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playback_speed: settings.playback_speed,
          voice_model: settings.voice_model,
          language: settings.language,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save settings");
      }

      setHasChanged(false);
      toast.success("設定を保存しました");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error(
        error instanceof Error ? error.message : "設定の保存に失敗しました"
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-zinc-700 rounded w-1/4"></div>
            <div className="h-4 bg-zinc-700 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!settings) {
    return null;
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardContent className="p-4 lg:p-6">
        <h3 className="font-bold mb-4">再生設定</h3>

        <div className="space-y-6">
          {/* Playback Speed Slider */}
          <div>
            <label className="text-sm text-zinc-400 mb-3 block">
              再生速度: {settings.playback_speed.toFixed(1)}x
            </label>
            <Slider
              value={[settings.playback_speed]}
              onValueChange={(value) => handlePlaybackSpeedChange(value[0])}
              min={0.5}
              max={3.0}
              step={0.1}
              className="w-full"
            />
            <p className="text-xs text-zinc-500 mt-2">
              0.5x～3.0x（デフォルト: 1.0x）
            </p>
          </div>

          {/* Language Dropdown */}
          <div>
            <label className="text-sm text-zinc-400 mb-2 block">言語</label>
            <select
              value={settings.language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm lg:text-base"
            >
              <option value="ja-JP">日本語</option>
              <option value="en-US">English</option>
            </select>
          </div>

          {/* Voice Model Dropdown */}
          <div>
            <label className="text-sm text-zinc-400 mb-2 block">
              音声モデル
            </label>
            <select
              value={settings.voice_model}
              onChange={(e) => handleVoiceModelChange(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm lg:text-base"
            >
              {VOICE_MODELS.map((model) => (
                <option key={model.value} value={model.value}>
                  {model.label}
                </option>
              ))}
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSave}
              disabled={!hasChanged || saving}
              className="bg-violet-600 hover:bg-violet-700 disabled:bg-zinc-600"
            >
              {saving ? "保存中..." : "保存"}
            </Button>
            {hasChanged && (
              <Button
                onClick={fetchSettings}
                variant="ghost"
                className="text-zinc-400 hover:text-white"
              >
                キャンセル
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
