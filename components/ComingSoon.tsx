"use client";

import React from "react";

export default function ComingSoon({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <div 
      className={className} 
      onClick={(e) => {
        e.preventDefault();
        alert("This feature is coming soon in v2.0!");
      }}
    >
      {children}
    </div>
  );
}
