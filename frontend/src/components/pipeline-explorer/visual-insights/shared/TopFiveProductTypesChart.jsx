'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ChartMenu } from '@/components/ui';
import { buildCSV, downloadCSV } from '@/lib/csv';
import { BarTooltip } from './primitives';

// =========================================================
// Top 5 product types bar chart
// =========================================================
//
// Presentational extraction of the "Top 5 product types" chart card from the
// Analytical Insights page. Data, title, loading flag, the PNG-capture ref,
// and the PNG-download handler arrive via props; the CSV export stays
// self-contained since it only needs the lib helpers and the `data` prop.

export function TopFiveProductTypesChart({ data, title, loading, chartRef, onDownloadPNG }) {
  return (
    <div className="bg-white border border-gray-200 p-4">
      <div className="flex items-start justify-between mb-1">
        <h3 className="text-base sm:text-lg font-bold text-black">{title}</h3>
        <ChartMenu
          onDownloadCSV={() => {
            const columns = [{ label: 'Product type', accessor: 'name' }, { label: 'Count', accessor: 'value' }];
            const csv = buildCSV(columns, data);
            downloadCSV(csv, 'top-5-product-types');
          }}
          onDownloadPNG={onDownloadPNG}
        />
      </div>
      <p className="text-sm text-gray-500 mb-4">Lorem ipsum dolor sit amet consectetur.</p>
      <div ref={chartRef}>
        {loading ? (
          <div className="h-[260px] flex items-center justify-center"><div className="animate-pulse text-gray-400">Loading...</div></div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12 }} label={{ value: 'Number of candidates', position: 'insideBottom', offset: -10, fontSize: 12, fill: '#666' }} />
              <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12 }} />
              <Tooltip content={<BarTooltip />} />
              <Bar dataKey="value" fill="#fe7449" barSize={20} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
