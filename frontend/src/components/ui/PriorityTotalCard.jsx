'use client';

// =========================================================
// PriorityTotalCard
// =========================================================
// Big-number stat card with the same chrome as `PriorityShareCard`
// (white background, gray border, narrow padding). Used as the top
// card in the Priorities overview section on both the Home page and
// the WHO Priority alignment page.

export default function PriorityTotalCard({ total = 0, loading = false }) {
  if (loading) {
    return (
      <div className="bg-white border border-gray-200 p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
        <div className="h-10 bg-gray-200 rounded w-1/3 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-3/4"></div>
      </div>
    );
  }
  return (
    <div className="bg-white border border-gray-200 p-4 flex flex-col gap-4">
      <h4 className="text-sm font-semibold text-black">Priorities</h4>
      <div>
        <div
          className="text-[40px] font-extrabold text-black leading-tight"
          style={{ fontFamily: 'var(--font-align), system-ui, sans-serif' }}
        >
          {total.toLocaleString()}
        </div>
        <p className="text-xs text-gray-500 mt-2">Total number of priorities</p>
      </div>
    </div>
  );
}
