'use client';

// Empty-field placeholder. Mirrors the convention used by the
// Aggregate portfolio DataTable (see
// `src/components/ui/data-table/DataTable.jsx`) so the slide-ins
// speak the same language for missing values: lowercase, italic,
// muted.
export function NoInfo() {
  return (
    <span className="text-gray-400 italic">no information available</span>
  );
}
