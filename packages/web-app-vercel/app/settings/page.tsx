"use client";

import StorageManager from "@/components/StorageManager";
import UserSettingsPanel from "@/components/UserSettingsPanel";
import AppLayout from "@/components/AppLayout";

export default function SettingsPage() {
  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6 lg:mb-8">
          <h2 className="text-2xl lg:text-3xl font-bold mb-2">設定</h2>
          <p className="text-sm lg:text-base text-zinc-400">
            再生設定をカスタマイズ
          </p>
        </div>

        <div className="max-w-2xl space-y-6">
          <UserSettingsPanel />
          <StorageManager />
        </div>
      </div>
    </AppLayout>
  );
}
