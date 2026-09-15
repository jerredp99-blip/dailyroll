"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#101815",
          color: "#e4e4e7",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            Daily Roll encountered a critical error
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#a1a1aa", marginBottom: "1.5rem" }}>
            We're sorry — something broke at the root level. Please try again.
          </p>
          <button
            onClick={() => reset()}
            style={{
              padding: "0.625rem 1.5rem",
              backgroundColor: "#059669",
              color: "white",
              border: "none",
              borderRadius: "0.75rem",
              fontSize: "0.875rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
