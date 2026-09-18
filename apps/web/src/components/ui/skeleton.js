export function Skeleton({ className = '' }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-lg bg-line/70 motion-reduce:animate-none ${className}`} />;
}

export function SkeletonList({ label, rows = 3 }) {
  return (
    <div role="status" aria-label={label} className="space-y-3 py-2">
      {Array.from({ length: rows }, (_, rowIndex) => (
        <Skeleton key={rowIndex} className="h-16 w-full rounded-xl" />
      ))}
    </div>
  );
}
