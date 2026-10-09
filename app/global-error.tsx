"use client";

// Last-resort boundary: renders its own <html> because the root layout itself failed.
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 32,
          textAlign: "center",
          fontFamily: "system-ui, -apple-system, Roboto, sans-serif",
          background: "#F4F4F6",
          color: "#242428",
        }}
      >
        <h1 style={{ fontSize: 28, fontWeight: 900, margin: "0 0 8px" }}>Something went wrong</h1>
        <p style={{ color: "#6b6b73", margin: "0 0 24px", maxWidth: 320 }}>
          Nura couldn&apos;t load. Your data is safe — please try again.
        </p>
        <button
          onClick={() => reset()}
          style={{
            background: "#FC4C02", color: "#fff", border: 0, borderRadius: 16,
            padding: "14px 28px", fontWeight: 700, fontSize: 16,
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
