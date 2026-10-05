// Uses the spec'd .skeleton class in globals.css: appears after 300ms, 1500ms shimmer,
// shimmer disabled under reduced motion — all defined in one place.
export function Skeleton({ className = '' }) {
  return <div aria-hidden="true" className={`skeleton ${className}`.trim()} />;
}

export function SkeletonList({ label, rows = 3 }) {
  return (
    <div role="status" aria-label={label} className="space-y-3 py-2">
      {Array.from({ length: rows }, (_, rowIndex) => (
        <Skeleton key={rowIndex} className="h-16 w-full !rounded-xl" />
      ))}
    </div>
  );
}
