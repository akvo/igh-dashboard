'use client';

// =========================================================
// PriorityListCard
// =========================================================
// Inline card showing the first 3 priority names plus a `See all`
// button that opens `PriorityListPanel`. Rendered on the WHO Priority
// alignment page when a Disease or Product filter is active.
//
// Inputs:
//   priorities  — full filtered priority list (the slide-in shows all)
//   onSeeAll    — opens the slide-in
//   loading     — skeleton state

const PREVIEW_LIMIT = 3;

export default function PriorityListCard({ priorities = [], onSeeAll, loading = false }) {
  if (loading) {
    return (
      <div className="bg-white border border-gray-200 p-4 flex flex-col gap-3 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        <div className="h-3 bg-gray-200 rounded w-3/4"></div>
        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
        <div className="h-3 bg-gray-200 rounded w-3/5"></div>
        <div className="h-8 bg-gray-200 rounded w-1/3 mt-2"></div>
      </div>
    );
  }

  // Empty filter result: render the empty message in the same card
  // chrome with no preview rows and no `See all`.
  if (priorities.length === 0) {
    return (
      <div className="bg-white border border-gray-200 p-4 flex flex-col gap-3">
        <h4 className="text-sm font-semibold text-black">List of Priorities</h4>
        <p className="text-xs text-gray-500">No priorities match the current selection.</p>
      </div>
    );
  }

  const preview = priorities.slice(0, PREVIEW_LIMIT);
  const overflow = Math.max(priorities.length - PREVIEW_LIMIT, 0);

  return (
    <div className="bg-white border border-gray-200 p-4 flex flex-col gap-3">
      <h4 className="text-sm font-semibold text-black">List of Priorities</h4>
      <ul className="flex flex-col gap-1">
        {preview.map((p) => (
          <li
            key={p.priority_key}
            className="text-xs text-gray-700 truncate"
            title={p.priority_name}
          >
            {p.priority_name}
          </li>
        ))}
        {overflow > 0 && (
          <li className="text-xs text-gray-500 mt-1">{overflow} more</li>
        )}
      </ul>
      {overflow > 0 && (
        <button
          type="button"
          onClick={onSeeAll}
          className="self-start text-xs font-medium text-black border border-gray-300 px-3 py-2 hover:bg-gray-50 transition-colors cursor-pointer bg-white"
        >
          See all
        </button>
      )}
    </div>
  );
}
