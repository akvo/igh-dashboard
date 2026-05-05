'use client';

import { useMemo, useState, useCallback } from 'react';
import { CloseIcon } from '../icons';
import { displayHealthArea } from '@/lib/transformations/constants';

/**
 * Build a hierarchical structure from flat disease hierarchy rows.
 * Returns: { [global_health_area]: { [primary_disease]: string[] } }
 * where the string[] are sub-diseases (excluding the
 * self-row sentinel emitted for childless primaries).
 */
function buildHierarchy(rows) {
  if (!rows?.length) return {};

  const tree = {};
  for (const { primary_disease, secondary_disease, global_health_area } of rows) {
    if (!tree[global_health_area]) tree[global_health_area] = {};
    if (!tree[global_health_area][primary_disease]) {
      tree[global_health_area][primary_disease] = [];
    }
    if (secondary_disease !== primary_disease) {
      const list = tree[global_health_area][primary_disease];
      if (!list.includes(secondary_disease)) {
        list.push(secondary_disease);
      }
    }
  }

  // Sort children alphabetically within each parent
  for (const area of Object.keys(tree)) {
    for (const parent of Object.keys(tree[area])) {
      tree[area][parent].sort((a, b) => a.localeCompare(b));
    }
  }

  return tree;
}

// One clickable row for a leaf disease (a childless primary or a
// sub-disease). The whole row is a single <button>, so the orange
// "Explore →" hint that fades in on hover is part of the same
// click target instead of a sibling element. The button itself is
// the `group`, so the hint reveals on hover anywhere on the row.
//
// `tone` picks between the two existing text colors:
//   'primary'   -> text-gray-700 (top-level childless primary)
//   'secondary' -> text-gray-500 (nested sub-disease)
function LeafDiseaseRow({ name, onExplore, tone = 'primary' }) {
  const textColor = tone === 'secondary' ? 'text-gray-500' : 'text-gray-700';
  const padding = tone === 'secondary' ? 'py-1' : 'py-1.5';
  return (
    <button
      onClick={onExplore}
      className={`group flex items-center w-full text-left text-sm ${textColor} hover:text-black ${padding} px-1 transition-colors cursor-pointer bg-transparent border-0`}
    >
      <span className="flex-1">{name}</span>
      <span className="text-xs text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity font-medium whitespace-nowrap pr-1">
        Explore &rarr;
      </span>
    </button>
  );
}

// Parent row that has children: name button on the left,
// expand/collapse toggle on the right. The "Explore →" hover
// hint is intentionally absent for parents with children -- the
// expander is the visual affordance.
function DiseaseRow({ name, expanded, onToggle, onExplore }) {
  return (
    <div className="flex items-center">
      <button
        onClick={onExplore}
        className="flex-1 text-left text-sm text-gray-700 hover:text-black py-1.5 px-1 transition-colors cursor-pointer bg-transparent border-0"
      >
        {name}
      </button>
      <button
        onClick={onToggle}
        className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-black hover:bg-gray-100 rounded transition-colors cursor-pointer bg-transparent border-0 shrink-0"
        aria-label={expanded ? 'Collapse' : 'Expand'}
      >
        <span className="text-sm font-medium leading-none">{expanded ? '−' : '+'}</span>
      </button>
    </div>
  );
}

function ParentDiseaseItem({ name, subDiseases, onExplore, globalHealthArea }) {
  const [expanded, setExpanded] = useState(false);
  const hasSubDiseases = subDiseases.length > 0;

  // Childless primaries are leaf rows themselves. They get the
  // single-button treatment so the whole row is clickable.
  if (!hasSubDiseases) {
    return (
      <LeafDiseaseRow
        name={name}
        tone="primary"
        onExplore={() => onExplore('primary', name, null, globalHealthArea)}
      />
    );
  }

  return (
    <div>
      <DiseaseRow
        name={name}
        expanded={expanded}
        onToggle={() => setExpanded((prev) => !prev)}
        onExplore={() => onExplore('primary', name, null, globalHealthArea)}
      />
      {expanded && (
        <div className="pl-4 border-l border-gray-100 ml-1 mt-0.5 mb-1">
          {subDiseases.map((child) => (
            <LeafDiseaseRow
              key={child}
              name={child}
              tone="secondary"
              onExplore={() => onExplore('secondary', child, name, globalHealthArea)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DiseaseListPanel({ isOpen, onClose, hierarchy = [] }) {
  const tree = useMemo(() => buildHierarchy(hierarchy), [hierarchy]);

  const sortedAreas = useMemo(
    () => Object.keys(tree).sort((a, b) => a.localeCompare(b)),
    [tree],
  );

  // Click handler dispatches to the correct URL parameters depending
  // on which row was clicked:
  //
  //   kind === 'primary' -> ?primary=<name>     (parent click; relies on
  //                                              implicit "all children"
  //                                              semantic on the
  //                                              destination page)
  //   kind === 'secondary' -> ?primary=<parent>&secondary=<child>
  //   kind === '' (no name) -> /portfolio-analysis (Find out more)
  //
  // `globalHealthArea` is always preserved on `?gha=` so the
  // destination page hydrates the GHA filter as the user expects.
  const handleExplore = useCallback(
    (kind, name, primaryParent, globalHealthArea) => {
      onClose();
      if (!kind || !name) {
        window.location.href = '/portfolio-analysis';
        return;
      }
      const params = new URLSearchParams();
      if (globalHealthArea) params.set('gha', globalHealthArea);
      if (kind === 'primary') {
        params.set('primary', name);
      } else if (kind === 'secondary') {
        if (primaryParent) params.set('primary', primaryParent);
        params.set('secondary', name);
      }
      window.location.href = `/portfolio-analysis?${params.toString()}`;
    },
    [onClose],
  );

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-lg bg-white z-50 shadow-xl transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-bold text-black">
            Diseases covered in platform
          </h2>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleExplore('', '', null, null)}
              className="text-xs font-medium text-orange-500 hover:text-orange-600 transition-colors cursor-pointer bg-transparent border-0 whitespace-nowrap"
            >
              Find out more &rarr;
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-md hover:bg-gray-100 transition-colors cursor-pointer bg-transparent border-0"
              aria-label="Close panel"
            >
              <CloseIcon className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto h-[calc(100%-73px)] p-6">
          {sortedAreas.map((area) => {
            const parents = tree[area];
            const sortedParents = Object.keys(parents).sort((a, b) =>
              a.localeCompare(b),
            );

            return (
              <div key={area} className="mb-6">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 pb-1 border-b border-gray-200">
                  {displayHealthArea(area)}
                </h4>
                <div className="flex flex-col">
                  {sortedParents.map((parent) => (
                    <ParentDiseaseItem
                      key={parent}
                      name={parent}
                      subDiseases={parents[parent]}
                      onExplore={handleExplore}
                      globalHealthArea={area}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
