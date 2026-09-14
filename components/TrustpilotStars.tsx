"use client";

export function TrustpilotStars({
  rating,
  className = "tracking-[0.08em]",
}: {
  rating?: number | null;
  className?: string;
}) {
  const numericRating = Number(rating);
  if (!Number.isFinite(numericRating)) {
    return <span className={`text-[#718275] ${className}`}>☆☆☆☆☆</span>;
  }

  const clampedRating = Math.max(0, Math.min(5, numericRating));
  return (
    <span aria-label={`${clampedRating.toFixed(1)} out of 5 stars`} className={className}>
      {Array.from({ length: 5 }, (_, index) => {
        const fillPercent = Math.max(0, Math.min(1, clampedRating - index)) * 100;
        return (
          <span
            key={index}
            aria-hidden="true"
            className="inline-block"
            style={{
              color: fillPercent === 100 ? "#e5b85d" : "transparent",
              backgroundImage:
                fillPercent > 0 && fillPercent < 100
                  ? "linear-gradient(90deg, #e5b85d 50%, #536359 50%)"
                  : undefined,
              WebkitBackgroundClip:
                fillPercent > 0 && fillPercent < 100 ? "text" : undefined,
            }}
          >
            {fillPercent === 0 ? "☆" : "★"}
          </span>
        );
      })}
    </span>
  );
}

export default TrustpilotStars;
