'use client';

// =========================================================
// HierarchicalDiseaseFilter
// =========================================================
//
// A multi-select dropdown of primary diseases ("Malaria",
// "Tuberculosis", ...) where each primary that has children expands
// to show its sub-diseases ("P. falciparum", "P. vivax", ...). The
// state is held by the page in two parallel arrays:
//
//     primarySelected: string[]   // primaries the user picked
//     secondarySelected: string[] // explicit sub-diseases the user picked
//
// The render layer derives the parent checkbox state from the two
// arrays. There is no third "implicit/explicit" state on the parent;
// instead, "implicit" means the parent is in `primarySelected` and
// none of its children are in `secondarySelected`.
//
// Render rules for primary `p` with children `C(p)`:
//
//   - p ∈ primarySelected, C(p) ∩ secondarySelected = ∅
//       → parent checked; children render visually checked but the
//         state is implicit (no entries in secondarySelected).
//   - p ∈ primarySelected, ∃ c ∈ C(p) ∩ secondarySelected
//       → parent indeterminate; children render their literal state.
//   - p ∉ primarySelected, C(p) ∩ secondarySelected ≠ ∅
//       → parent indeterminate; children render their literal state.
//   - else
//       → parent unchecked; no children visually checked.
//
// Toggle rules (the heart of the component) are below in
// `togglePrimary` / `toggleSecondary`. They cover six transitions:
//
//   1. Check primary (no children explicit): add primary; secondary
//      list untouched.
//   2. Uncheck primary: remove primary AND remove all of its
//      children from secondary list (covers expand-then-uncheck).
//   3. Uncheck child while parent currently *implicit*: "expand" --
//      add all the *other* children to secondarySelected, keep
//      parent in primarySelected. The unchecked child is NOT added.
//   4. Uncheck child while parent currently *explicit*: remove the
//      child. If that empties the parent's explicit set AND the
//      parent is still in primarySelected, the parent collapses
//      back to implicit (no UI change beyond the state shape).
//   5. Re-check child while parent in primarySelected (explicit
//      state): add the child back. If that completes C(p), normalize
//      to implicit -- remove all of C(p) from secondarySelected.
//   6. Check child while parent NOT in primarySelected: add the
//      child to secondarySelected; do NOT auto-add the parent.

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDownIcon, SearchIcon } from '../icons';

// ---------------------------------------------------------
// Tree construction
// ---------------------------------------------------------
//
// `hierarchyRows` is the shape returned by `getDiseaseHierarchy()`:
//   { primary_disease, secondary_disease, global_health_area }
//
// For each primary, accumulate its children (excluding the self-row
// emitted for childless primaries) and remember the GHA for sort
// key purposes. Returns a Map preserving primary order.
function buildTree(hierarchyRows) {
  const map = new Map();
  for (const { primary_disease, secondary_disease, global_health_area } of hierarchyRows) {
    if (!primary_disease) continue;
    if (!map.has(primary_disease)) {
      map.set(primary_disease, { secondaries: new Set(), gha: global_health_area });
    }
    if (secondary_disease && secondary_disease !== primary_disease) {
      map.get(primary_disease).secondaries.add(secondary_disease);
    }
  }
  return map;
}

// Pure helper used by tests and render.
function deriveParentState(primary, primarySelected, secondarySelected, children) {
  const inPrimary = primarySelected.includes(primary);
  const explicitChildren = children.filter((c) => secondarySelected.includes(c));
  if (inPrimary && explicitChildren.length === 0) return 'checked';
  if (inPrimary && explicitChildren.length > 0) return 'indeterminate';
  if (!inPrimary && explicitChildren.length > 0) return 'indeterminate';
  return 'unchecked';
}

// ---------------------------------------------------------
// Visual primitives
// ---------------------------------------------------------

function CheckboxBox({ state }) {
  // `state` ∈ { 'checked', 'indeterminate', 'unchecked' }.
  const filled = state === 'checked' || state === 'indeterminate';
  return (
    <span
      className={`w-4 h-4 border rounded flex items-center justify-center shrink-0 ${
        filled ? 'border-orange-500 bg-orange-500' : 'border-gray-300 bg-white'
      }`}
      aria-hidden="true"
    >
      {state === 'checked' && (
        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
          <path
            d="M1 4L3.5 6.5L9 1"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      {state === 'indeterminate' && (
        <svg width="10" height="2" viewBox="0 0 10 2" fill="none">
          <path d="M1 1L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )}
    </span>
  );
}

// ---------------------------------------------------------
// Main component
// ---------------------------------------------------------

export default function HierarchicalDiseaseFilter({
  hierarchy = [],
  primarySelected = [],
  secondarySelected = [],
  onChange,
  label,
  placeholder = 'All',
  className = '',
  compact = false,
  variant = 'outlined',
  defaultOpen = false,
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [expanded, setExpanded] = useState(() => new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 0 });

  const tree = useMemo(() => buildTree(hierarchy), [hierarchy]);
  const primaries = useMemo(
    () => Array.from(tree.keys()).sort((a, b) => a.localeCompare(b)),
    [tree],
  );

  // Filter primaries by the search box. Match either the primary
  // name itself or any of its children -- so searching for
  // "P. falciparum" surfaces "Malaria" with the matching child.
  const filteredPrimaries = useMemo(() => {
    if (!searchQuery) return primaries;
    const needle = searchQuery.toLowerCase();
    return primaries.filter((p) => {
      if (p.toLowerCase().includes(needle)) return true;
      const children = Array.from(tree.get(p).secondaries);
      return children.some((c) => c.toLowerCase().includes(needle));
    });
  }, [primaries, tree, searchQuery]);

  // ---------------------------------------------------------
  // Portal positioning + outside-click (mirrors Dropdown.jsx)
  // ---------------------------------------------------------

  const updatePosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event) => {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(event.target) &&
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // ---------------------------------------------------------
  // Toggle handlers (the six transitions in the spec)
  // ---------------------------------------------------------

  function emit(nextPrimary, nextSecondary) {
    if (!onChange) return;
    onChange({
      primarySelected: nextPrimary,
      secondarySelected: nextSecondary,
    });
  }

  function togglePrimary(p) {
    const children = Array.from(tree.get(p)?.secondaries ?? []);
    const inPrimary = primarySelected.includes(p);
    if (inPrimary) {
      // Uncheck: drop the primary AND any of its children that were
      // explicitly selected (otherwise an "expand-then-uncheck"
      // would leave the children behind and re-narrow the result).
      emit(
        primarySelected.filter((x) => x !== p),
        secondarySelected.filter((x) => !children.includes(x)),
      );
    } else {
      // Check: add the primary. Don't touch the secondary list.
      emit([...primarySelected, p], secondarySelected);
    }
  }

  function toggleSecondary(p, c) {
    const children = Array.from(tree.get(p)?.secondaries ?? []);
    const inPrimary = primarySelected.includes(p);
    const inSecondary = secondarySelected.includes(c);
    const explicitChildren = children.filter((x) => secondarySelected.includes(x));
    const isImplicit = inPrimary && explicitChildren.length === 0;

    if (isImplicit) {
      // Parent currently implicit (visually checked via the parent).
      // Unchecking one child means "expand": keep the parent, add
      // every OTHER child to the explicit list. The unchecked child
      // is the one being deselected, so it stays out of the list.
      const remaining = children.filter((x) => x !== c);
      emit(primarySelected, [...secondarySelected, ...remaining]);
      return;
    }

    if (inSecondary) {
      // Removing an explicit child. If after removal no explicit
      // children remain AND the parent is still selected, the
      // parent collapses back to implicit (no children listed).
      const next = secondarySelected.filter((x) => x !== c);
      emit(primarySelected, next);
      return;
    }

    // Adding a child. If the parent isn't selected yet, just add
    // the child. If the parent IS selected and adding this child
    // makes the explicit set equal to C(p), normalize to implicit.
    const next = [...secondarySelected, c];
    const allChildrenNowExplicit = children.every((x) => next.includes(x));
    if (inPrimary && allChildrenNowExplicit) {
      emit(primarySelected, next.filter((x) => !children.includes(x)));
    } else {
      emit(primarySelected, next);
    }
  }

  // ---------------------------------------------------------
  // Trigger button display
  // ---------------------------------------------------------

  const totalCount = primarySelected.length + secondarySelected.length;
  const firstSelected = primarySelected[0] ?? secondarySelected[0];
  const triggerText = totalCount === 0
    ? <span className="text-gray-400">{placeholder}</span>
    : totalCount === 1
      ? <span className="truncate text-black">{firstSelected}</span>
      : <span className="truncate text-black">{firstSelected} +{totalCount - 1}</span>;

  function clearAll(e) {
    e.stopPropagation();
    emit([], []);
  }

  function toggleExpanded(p) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  }

  // ---------------------------------------------------------
  // Menu (portal)
  // ---------------------------------------------------------

  const menu = isOpen && typeof document !== 'undefined'
    ? createPortal(
        <div
          ref={menuRef}
          className="fixed bg-white rounded-lg shadow-lg z-[9999] max-h-96 overflow-hidden border border-gray-200"
          style={{
            top: `${menuPosition.top}px`,
            left: `${menuPosition.left}px`,
            width: `${menuPosition.width}px`,
            minWidth: '260px',
          }}
        >
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search disease"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-gray-300 focus:outline-none focus:border-[#E76A42]"
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
            </div>
          </div>
          <div className="overflow-y-auto max-h-80">
            {filteredPrimaries.map((p, i) => {
              const children = Array.from(tree.get(p).secondaries).sort((a, b) =>
                a.localeCompare(b),
              );
              const state = deriveParentState(p, primarySelected, secondarySelected, children);
              const hasChildren = children.length > 0;
              const isExpanded = expanded.has(p);

              return (
                <div
                  key={p}
                  className={i < filteredPrimaries.length - 1 ? 'border-b border-gray-100' : ''}
                >
                  <div className="flex items-stretch">
                    <button
                      type="button"
                      onClick={() => togglePrimary(p)}
                      className="flex-1 flex items-center gap-3 px-4 py-2.5 text-sm text-left bg-transparent border-none cursor-pointer hover:bg-gray-50 transition-colors"
                      aria-label={p}
                    >
                      <CheckboxBox state={state} />
                      <span className="text-black truncate">{p}</span>
                    </button>
                    {hasChildren && (
                      <button
                        type="button"
                        onClick={() => toggleExpanded(p)}
                        className="px-3 text-gray-400 hover:text-black hover:bg-gray-100 transition-colors cursor-pointer bg-transparent border-none"
                        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${p}`}
                      >
                        <span className="text-sm font-medium leading-none">
                          {isExpanded ? '−' : '+'}
                        </span>
                      </button>
                    )}
                  </div>
                  {hasChildren && isExpanded && (
                    <div className="pl-7 pb-1 bg-gray-50/50">
                      {children.map((c) => {
                        // A child is visually checked if either it's
                        // explicitly in secondarySelected OR its parent
                        // is in primarySelected with no explicit
                        // children (the implicit-all case).
                        const explicit = secondarySelected.includes(c);
                        const inPrimary = primarySelected.includes(p);
                        const explicitChildren = children.filter((x) =>
                          secondarySelected.includes(x),
                        );
                        const childChecked =
                          explicit || (inPrimary && explicitChildren.length === 0);
                        return (
                          <button
                            key={c}
                            type="button"
                            onClick={() => toggleSecondary(p, c)}
                            className="flex items-center gap-3 w-full px-4 py-1.5 text-sm text-left bg-transparent border-none cursor-pointer hover:bg-gray-100 transition-colors"
                            aria-label={c}
                          >
                            <CheckboxBox state={childChecked ? 'checked' : 'unchecked'} />
                            <span className="text-gray-700 truncate">{c}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            {filteredPrimaries.length === 0 && (
              <div className="px-4 py-3 text-sm text-gray-400">No diseases match.</div>
            )}
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && <span className="text-sm text-gray-500 font-normal">{label}</span>}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          setIsOpen((v) => !v);
          if (!isOpen) setSearchQuery('');
        }}
        className={`flex items-center justify-between text-sm font-normal text-black cursor-pointer text-left transition-colors
          ${compact ? 'gap-2 px-3 h-9 w-[180px] max-w-full' : 'w-full px-4 py-2.5 h-[44px]'}
          ${variant === 'outlined'
            ? `border ${isOpen ? 'bg-white border-orange-500' : 'bg-white border-black-24'}`
            : isOpen ? 'bg-white border-2 border-orange-500' : 'bg-[#F2F2F4]'}`}
      >
        <span className="flex items-center overflow-hidden min-w-0 flex-1">
          {triggerText}
        </span>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {totalCount > 0 && (
            <span
              role="button"
              tabIndex={0}
              onClick={clearAll}
              className="inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 border-none bg-transparent cursor-pointer p-0"
              aria-label="Clear disease selection"
            >
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                <path
                  d="M1 1L7 7M7 1L1 7"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          )}
          <ChevronDownIcon
            className={`w-5 h-5 ${variant === 'outlined' ? 'text-black-64' : 'text-gray-500'} transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>
      {menu}
    </div>
  );
}

// Exported for direct unit testing of the pure render-state logic.
export { deriveParentState as __deriveParentState, buildTree as __buildTree };
