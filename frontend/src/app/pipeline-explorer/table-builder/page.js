'use client';

// Table Builder view body. The shell (header, toggle, intro) lives in the
// shared layout; this route only renders the view body — the
// TableBuilderTabs host, which owns the sub-tab, filter, and table state.

import TableBuilderTabs from '@/components/pipeline-explorer/table-builder/TableBuilderTabs';

export default function PipelineExplorerTableBuilderPage() {
  return <TableBuilderTabs />;
}
