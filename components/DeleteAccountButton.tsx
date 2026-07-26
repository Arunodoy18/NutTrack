"use client";

import React, { useState } from "react";
import { signOut } from "next-auth/react";
import { Trash2 } from "lucide-react";
import { deleteAccountAction } from "@/app/actions";

export default function DeleteAccountButton({ userId }: { userId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    const result = await deleteAccountAction(userId);
    if (result.success) {
      signOut({ callbackUrl: "/auth/login" });
    } else {
      setDeleting(false);
      alert(result.error || "Failed to delete account. Please try again.");
    }
  };

  if (confirming) {
    return (
      <div className="w-full bg-white rounded-[32px] shadow-sm border border-red-200 mt-3 mb-6 p-5">
        <p className="text-sm font-medium text-ink mb-4">
          This permanently deletes your account and all your logged meals, goals, and history. This can&apos;t be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setConfirming(false)}
            disabled={deleting}
            className="flex-1 py-3 rounded-2xl text-sm font-bold text-ink-soft bg-surface-muted hover:bg-surface-line transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 py-3 rounded-2xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-60"
          >
            {deleting ? "Deleting..." : "Yes, delete everything"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="flex items-center justify-center gap-2 w-full py-4 text-ink-faint font-medium text-sm bg-white rounded-[32px] shadow-sm border border-surface-line mt-3 mb-6 hover:bg-red-50 hover:text-red-500 transition-colors"
    >
      <Trash2 className="w-4 h-4" />
      Delete Account
    </button>
  );
}
