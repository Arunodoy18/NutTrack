"use client";

import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

function Skeleton() {
  return (
    <div className="mx-auto grid max-w-5xl grid-cols-1 items-start gap-8 px-4 md:grid-cols-[1fr_340px]" aria-hidden>
      <div className="order-2 h-64 rounded-3xl border border-surface-line bg-white md:order-1" />
      <div className="order-1 mx-auto h-[600px] w-[300px] rounded-[44px] border-[9px] border-ink bg-surface md:order-2" />
    </div>
  );
}

const LiveDemo = dynamic(() => import("./LiveDemo"), { ssr: false, loading: () => <Skeleton /> });

/** Loads the demo's code only when it is close to the screen, so the page itself stays light. */
export default function LiveDemoLoader() {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") { setShow(true); return; }
    const io = new IntersectionObserver((e) => { if (e.some((x) => x.isIntersecting)) { setShow(true); io.disconnect(); } }, { rootMargin: "600px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <div ref={ref} className="min-h-[640px]">{show ? <LiveDemo /> : <Skeleton />}</div>;
}
