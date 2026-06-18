'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { ChartMenu } from '@/components/ui';
import { buildCSV, downloadCSV } from '@/lib/csv';
import { BarTooltip, GHA_COLORS } from './primitives';

// =========================================================
// Top 5 diseases bar chart
// =========================================================
//
// Presentational extraction of the "Top 5 diseases" chart card from the
// Analytical Insights page. Data, title, loading flag, the ref used for PNG
// capture, and the PNG-download handler all arrive via props; the CSV export
// stays self-contained since it only needs the lib helpers and the `data`
// prop. Bars are coloured by Global Health Area exactly as the source did.

export function TopFiveDiseasesChart({ data, title, description, loading, chartRef, onDownloadPNG, axisLabel = 'Number of candidates' }) {
  return (
    <div className="bg-white border border-gray-200 p-4">
      <div className="flex items-start justify-between mb-1">
        <h3 className="text-base sm:text-lg font-bold text-black">{title}</h3>
        <ChartMenu
          onDownloadCSV={() => {
            const columns = [
              { label: 'Disease', accessor: 'name' },
              { label: 'Count', accessor: 'value' },
              { label: 'Global Health Area', accessor: 'gha' },
            ];
            const csv = buildCSV(columns, data);
            downloadCSV(csv, 'top-5-diseases');
          }}
          onDownloadPNG={onDownloadPNG}
        />
      </div>
      <p className="text-sm text-gray-500 mb-4">{description}</p>
      <div ref={chartRef}>
        {loading ? (
          <div className="h-[260px] flex items-center justify-center"><div className="animate-pulse text-gray-400">Loading...</div></div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12 }} label={{ value: axisLabel, position: 'insideBottom', offset: -10, fontSize: 12, fill: '#666' }} />
                <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 11 }} />
                <Tooltip content={<BarTooltip />} />
                <Bar dataKey="value" barSize={20} radius={[0, 4, 4, 0]}>
                  {data.map((entry) => (
                    <Cell key={entry.name} fill={GHA_COLORS[entry.gha] || '#B28FC9'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap items-center gap-4 mt-3">
              {Object.entries(GHA_COLORS).map(([label, color]) => (
                <div key={label} className="flex items-center gap-1.5 text-xs text-gray-600">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
                  {label}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
