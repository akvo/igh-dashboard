export default function ChartLegend({
  items,
  visibleItems,
  onToggle,
  onSelectAll,
  onClearAll,
  minItemsForBulkActions = 3,
}) {
  return (
    <div className="flex flex-wrap gap-4 mb-6 items-center">
      {items.length >= minItemsForBulkActions && (
        <div className="flex gap-1 mr-2">
          <button
            type="button"
            onClick={onSelectAll}
            className="text-xs text-orange-500 hover:underline cursor-pointer bg-transparent border-0 p-0"
          >
            Select all
          </button>
          <span className="text-xs text-black-24">|</span>
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs text-orange-500 hover:underline cursor-pointer bg-transparent border-0 p-0"
          >
            Clear all
          </button>
        </div>
      )}
      {items.map((item) => (
        <label
          key={item.key}
          className="flex items-center gap-2 cursor-pointer select-none"
        >
          <div className="relative">
            <input
              type="checkbox"
              checked={!!visibleItems[item.key]}
              onChange={() => onToggle(item.key)}
              className="sr-only"
            />
            <div
              className="w-5 h-5 rounded border-2 flex items-center justify-center transition-colors"
              style={{
                backgroundColor: visibleItems[item.key]
                  ? item.color
                  : 'transparent',
                borderColor: item.color,
              }}
            >
              {visibleItems[item.key] && (
                <svg
                  className="w-3 h-3 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </div>
          </div>
          <span className="text-sm text-black-88">{item.label}</span>
        </label>
      ))}
    </div>
  );
}
