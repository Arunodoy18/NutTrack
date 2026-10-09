"use client";

import React from "react";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { clearLocalUserData } from "@/lib/clientStorage";

export default function LogoutButton() {
  return (
    <button 
      onClick={() => {
        clearLocalUserData();
        signOut({ callbackUrl: "/auth/login" });
      }}
      className="flex items-center justify-center gap-2 w-full py-4 text-red-500 font-bold text-sm bg-white rounded-[32px] shadow-sm border border-surface-line mt-6 mb-6 hover:bg-red-50 transition-colors"
    >
      <LogOut className="w-5 h-5" />
      Sign Out
    </button>
  );
}
