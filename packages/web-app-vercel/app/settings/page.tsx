"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import StorageManager from "@/components/StorageManager";
import UserSettingsPanel from "@/components/UserSettingsPanel";
import Sidebar from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Menu, X, Home, List, Settings, Plus } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();

  return (
    <div className="h-screen bg-black text-white overflow-hidden">
      <Sidebar />

      <main className="lg:ml-64 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto bg-linear-to-b from-zinc-900 to-black">
          <div className="p-4 sm:p-6 lg:p-8">
            {/* Page Header */}
            <div className="mb-6 lg:mb-8">
              <h2 className="text-2xl lg:text-3xl font-bold">設定</h2>
              <p className="text-sm lg:text-base text-zinc-400">
                再生設定をカスタマイズ
              </p>
            </div>

            {/* Content */}
            <div className="max-w-2xl space-y-6">
              <UserSettingsPanel />
              <StorageManager />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
