'use client';

// =========================================================
// IndividualPriorityAnalysisSection — Phase A scaffold.
// =========================================================
// Ships the section's chrome, sub-filter row, empty state, URL state,
// and the `Explore selected priority` slide-in. The active body
// renders explicit placeholders for the stat cards, pipeline chart,
// and candidates table. Each placeholder marks the open question
// gating its real implementation; see
// docs/superpowers/notes/2026-05-19-individual-priority-analysis-questions.md.

import { useState } from 'react';
import { Dropdown, StatCard, Chip } from '@/components/ui';
import { ChartEmptyState } from '@/components/charts';
import { InfoIcon, RefreshIcon } from '@/components/icons';
import { usePriorityAlignment, useRdPriorities } from '@/graphql/hooks';
import { useWhoPageFilters } from './useWhoPageFilters';
import { useIndividualPriorityState } from './useIndividualPriorityState';
import PriorityKeyInfoPanel from './PriorityKeyInfoPanel';

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24">
      <div className="w-12 h-12 flex items-center justify-center rounded-md bg-orange-100 mb-4">
        <InfoIcon className="w-6 h-6 text-orange-500" />
      </div>
      <h4 className="text-lg font-bold text-black mb-1">Nothing selected</h4>
      <p className="text-sm text-gray-500 max-w-xs text-center">
        Please select filters you&apos;d like to include in the overview
      </p>
    </div>
  );
}

function PlaceholderChart() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col">
      <div className="flex items-start justify-between gap-2 mb-1">
        <div>
          <h4 className="text-base font-bold text-black">Pipeline build up</h4>
          <p className="text-sm text-gray-500">
            This visual shows the build up of the pipeline for this priority.
          </p>
        </div>
      </div>
      <div className="flex-1 mt-2">
        <ChartEmptyState
          variant="bar"
          height={280}
          title="Pending data confirmation"
          description="Chart grouping and copy to be defined (Q5/Q6/Q11)."
        />
      </div>
    </div>
  );
}

function PlaceholderTable() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h4 className="text-base font-bold text-black">Candidates linked to priority</h4>
          <Chip variant="primary">— Candidates</Chip>
        </div>
        {/* Search and Download CSV land alongside the real table in
           Phase B (Q4/Q9 gate the row source and column mapping). */}
      </div>
      <div className="text-center py-8">
        <p className="text-sm text-gray-500">
          Pending data confirmation — row source and column mapping to be defined (Q4/Q9).
        </p>
      </div>
    </div>
  );
}

function ActiveBody({ selectedPriorityName, onExplore }) {
  return (
    <div className="flex flex-col gap-6">
      {/* Row A — Pipeline header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h4 className="text-base sm:text-lg font-bold text-black">
          Pipeline for priority: {selectedPriorityName ?? '—'}
        </h4>
        <button
          type="button"
          onClick={onExplore}
          className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 transition-colors cursor-pointer"
        >
          Explore selected priority
        </button>
      </div>

      {/* Rows B+C — two-column grid: left = stat-card stack, right = pipeline chart */}
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
        {/* Column 1 — stacked stat cards (Q1/Q2/Q3 gate the counts) */}
        <div className="flex flex-col gap-4">
          <StatCard
            title="Number of candidates linked to selected priority"
            value="—"
            description="Pending data confirmation"
            variant="number"
          />
          <StatCard
            title="Number of approved products linked to selected priority"
            value="—"
            description="Pending data confirmation"
            variant="number"
          />
          <StatCard
            title="Target population"
            value="Pending data confirmation."
            variant="text"
          />
        </div>

        {/* Column 2 — Pipeline build up chart (Q5/Q6/Q11) */}
        <PlaceholderChart />
      </div>

      {/* Row D — Candidates table (Q4/Q9) */}
      <PlaceholderTable />
    </div>
  );
}

export default function IndividualPriorityAnalysisSection() {
  const page = useWhoPageFilters();
  const state = useIndividualPriorityState();
  const [slideInOpen, setSlideInOpen] = useState(false);

  const { priorities, loading: prioritiesLoading } = usePriorityAlignment(
    page.healthArea.length > 0 ? page.healthArea : null,
    page.primary.length > 0 ? page.primary : null,
    page.secondary.length > 0 ? page.secondary : null,
    page.expandedProduct.length > 0 ? page.expandedProduct : null,
  );

  const dropdownOptions = priorities.map((p) => ({
    value: String(p.priority_key),
    label: p.priority_name,
  }));

  const selectedPriorityName =
    priorities.find((p) => p.priority_key === state.committedPriority)?.priority_name ?? null;

  // Phase B handoff (Q19): when the page-bar filters change to exclude
  // the committed priority, the active body keeps rendering but
  // `selectedPriorityName` becomes null (Row A reads `—`). The
  // dropdown placeholder shows the orphan key, but the rest of the
  // section gives no signal that the user's selection is stale. The
  // final UX (warning chip? auto-clear? grey-out body?) is gated on
  // the designer's Q19 answer. Phase A leaves this as-is.
  const isCommittedInOptions =
    state.committedPriority == null ||
    priorities.some((p) => p.priority_key === state.committedPriority);
  const staleCommitLabel =
    state.committedPriority != null && !isCommittedInOptions
      ? `Unknown priority (#${state.committedPriority}) — not in current filter`
      : null;

  // Slide-in: fetch the committed priority's editorial record only when
  // the panel is open. `useRdPriorities` returns the one node we need.
  const slideinHook = useRdPriorities(
    { priorityKeys: state.committedPriority != null ? [state.committedPriority] : null },
    1,
    0,
    { skip: !slideInOpen || state.committedPriority == null },
  );
  const slideInPriority = slideinHook?.priorities?.[0] ?? null;

  const onDropdownChange = (val) => {
    if (val === '' || val == null) {
      state.setPending(null);
    } else {
      state.setPending(Number(val));
    }
  };

  // `Dropdown` has no `disabled` prop, so we gate interactivity with a
  // wrapping div that suppresses pointer events when the options list is
  // empty or still loading.
  const dropdownDisabled = prioritiesLoading || dropdownOptions.length === 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-black">
            Individual priority analysis
          </h3>
          {/* Q10: section description copy pending designer. */}
          <p className="text-sm text-gray-500">
            Pending designer copy — section description to be defined.
          </p>
        </div>
        {/* Q12: kebab menu items pending — rendered as a visual-only placeholder. */}
        <button
          type="button"
          aria-label="Section menu"
          className="p-2 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 cursor-pointer"
        >
          <span className="block w-1 h-1 rounded-full bg-gray-500 mb-0.5" />
          <span className="block w-1 h-1 rounded-full bg-gray-500 mb-0.5" />
          <span className="block w-1 h-1 rounded-full bg-gray-500" />
        </button>
      </div>
      <div className="mb-4" style={{ borderBottom: '1px solid #26262617' }} />

      <div className="flex flex-wrap items-end gap-4 mb-4">
        <div
          className={`min-w-[260px] ${dropdownDisabled ? 'opacity-50' : ''}`}
          aria-disabled={dropdownDisabled || undefined}
          {...(dropdownDisabled ? { inert: '' } : {})}
        >
          <Dropdown
            label="Select WHO Priority"
            value={state.pendingPriority != null ? String(state.pendingPriority) : ''}
            placeholder={
              staleCommitLabel ||
              (dropdownOptions.length === 0 ? 'No priorities match the current filters' : 'All')
            }
            options={dropdownOptions}
            multiSelect={false}
            variant="outlined"
            onChange={onDropdownChange}
          />
        </div>
        <div className="flex-1" />
        <button
          type="button"
          onClick={state.clear}
          disabled={!state.hasPending && !state.hasCommitted}
          className={`flex items-center gap-2 text-sm px-4 h-[44px] whitespace-nowrap border transition-colors ${
            !state.hasPending && !state.hasCommitted
              ? 'text-gray-400 bg-gray-100 border-gray-200 cursor-not-allowed'
              : 'text-black bg-white border-gray-300 hover:bg-gray-50 cursor-pointer'
          }`}
        >
          Clear
          <RefreshIcon className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={state.apply}
          disabled={!state.hasPending}
          className={`flex items-center justify-center text-sm px-6 h-[44px] whitespace-nowrap transition-colors ${
            !state.hasPending
              ? 'text-gray-400 bg-gray-100 border border-gray-200 cursor-not-allowed'
              : 'text-white bg-orange-500 hover:bg-orange-600 border border-orange-500 cursor-pointer'
          }`}
        >
          Apply
        </button>
      </div>

      <div className="mb-4" style={{ borderBottom: '1px solid #26262617' }} />

      {!state.hasCommitted ? (
        <EmptyState />
      ) : (
        <ActiveBody
          selectedPriorityName={selectedPriorityName}
          onExplore={() => setSlideInOpen(true)}
        />
      )}

      <PriorityKeyInfoPanel
        isOpen={slideInOpen}
        onClose={() => setSlideInOpen(false)}
        priority={slideInPriority}
        loading={slideinHook?.loading}
      />
    </div>
  );
}
