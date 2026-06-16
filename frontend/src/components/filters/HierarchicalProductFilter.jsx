'use client';

// =========================================================
// HierarchicalProductFilter
// =========================================================
//
// A multi-select product-type dropdown that renders most products as
// a flat checkbox list, plus ONE expandable group ("Vector control
// products", VCP) whose children are the individual vector-control
// categories.
//
// Unlike HierarchicalDiseaseFilter, the parent group here is NOT a
// queryable entity — it is purely a UI convenience over its child
// values. There is therefore no implicit/explicit state: `selected`
// always holds the concrete child/flat values that are checked, and
// the parent checkbox is derived from how many of its (available)
// children are selected.
//
// Mode-agnostic via a single {value,label} option contract:
//   - by-name: value === label === product_name
//   - by-key:  value = String(product_key), label = product_name
// Options may also be passed as plain strings (treated as value=label),
// matching the existing Dropdown contract. The caller decides which
// option VALUES belong to the group via `groupMembers`.

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDownIcon, SearchIcon } from '../icons';
import CheckboxBox from './_shared/CheckboxBox';

// Sentinel value for the synthetic group row (never a real option).
const GROUP_ROW_VALUE = '__vcp_group__';

// Derive the parent group's checkbox state from its AVAILABLE child
// values (those present in the current options) and the selection.
export function deriveGroupState(availableChildValues, selectedValues) {
  if (availableChildValues.length === 0) return 'unchecked';
  const selectedSet = new Set(selectedValues);
  const selectedCount = availableChildValues.filter((v) => selectedSet.has(v)).length;
  if (selectedCount === 0) return 'unchecked';
  if (selectedCount === availableChildValues.length) return 'checked';
  return 'indeterminate';
}

// Split normalized {value,label} options into the flat (non-group)
// list and the group's available children.
export function partitionOptions(options, groupMembers) {
  const memberSet = new Set(groupMembers);
  const flat = [];
  const children = [];
  for (const opt of options) {
    if (memberSet.has(opt.value)) children.push(opt);
    else flat.push(opt);
  }
  return { flat, children };
}

export default function HierarchicalProductFilter({
  options = [],
  groupMembers = [],
  groupLabel = 'Vector control products',
  hiddenMemberLabels = [],
  selected = [],
  onChange,
  label,
  placeholder = 'All',
  className = '',
  variant = 'outlined',
  compact = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 0 });

  // Normalize options to {value,label} so callers may pass strings.
  const normOptions = useMemo(
    () =>
      options.map((o) =>
        typeof o === 'object' ? o : { value: o, label: o },
      ),
    [options],
  );

  const { flat, children: allChildren } = useMemo(
    () => partitionOptions(normOptions, groupMembers),
    [normOptions, groupMembers],
  );

  // Suppress specific group members (by product-name label) from the
  // expandable group. Excluding them from `children` here drops them from
  // the rendered list AND from `childValues` (group-state derivation and
  // the group toggle), so the control stays self-consistent. Interim
  // measure: see
  // docs/superpowers/notes/2026-06-17-vcp-include-in-pipeline-stale-2019-flag.md.
  // Once the upstream data fix lands the hidden product leaves the active
  // data and this becomes a no-op — remove the prop with that fix.
  const children = useMemo(() => {
    if (hiddenMemberLabels.length === 0) return allChildren;
    const hidden = new Set(hiddenMemberLabels);
    return allChildren.filter((c) => !hidden.has(c.label));
  }, [allChildren, hiddenMemberLabels]);

  const childValues = useMemo(() => children.map((c) => c.value), [children]);

  // Top-level rows: flat options plus, when the group has at least one
  // available child, a synthetic group row. Sorted by label so the
  // group sits naturally among the flat products.
  const rows = useMemo(() => {
    const flatRows = flat.map((o) => ({
      kind: 'flat',
      value: o.value,
      label: o.label,
    }));
    const all =
      children.length > 0
        ? [...flatRows, { kind: 'group', value: GROUP_ROW_VALUE, label: groupLabel }]
        : flatRows;
    return all.sort((a, b) => a.label.localeCompare(b.label));
  }, [flat, children, groupLabel]);

  // Search: flat rows match by label; the group row matches if its
  // label OR any child label matches.
  const visibleRows = useMemo(() => {
    if (!searchQuery) return rows;
    const needle = searchQuery.toLowerCase();
    return rows.filter((r) => {
      if (r.label.toLowerCase().includes(needle)) return true;
      if (r.kind === 'group') {
        return children.some((c) => c.label.toLowerCase().includes(needle));
      }
      return false;
    });
  }, [rows, children, searchQuery]);

  const labelByValue = useMemo(() => {
    const m = new Map();
    for (const o of normOptions) m.set(o.value, o.label);
    return m;
  }, [normOptions]);

  // ---------------------------------------------------------
  // Portal positioning + outside-click (mirrors the disease filter)
  // ---------------------------------------------------------

  const updatePosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const menuHeight = 384;
      const spaceBelow = window.innerHeight - rect.bottom;
      const fitsBelow = spaceBelow >= menuHeight + 4;
      const top = fitsBelow ? rect.bottom + 4 : Math.max(4, rect.top - menuHeight - 4);
      setMenuPosition({ top, left: rect.left, width: rect.width });
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
  // Selection handlers — concrete values only, no sentinel state
  // ---------------------------------------------------------

  function emit(next) {
    if (onChange) onChange(next);
  }

  function toggleValue(value) {
    emit(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value],
    );
  }

  function toggleGroup() {
    const state = deriveGroupState(childValues, selected);
    if (state === 'checked') {
      const memberSet = new Set(childValues);
      emit(selected.filter((v) => !memberSet.has(v)));
    } else {
      emit(Array.from(new Set([...selected, ...childValues])));
    }
  }

  function toggleExpanded() {
    setExpanded((v) => !v);
  }

  function clearAll(e) {
    e.stopPropagation();
    emit([]);
  }

  // ---------------------------------------------------------
  // Trigger display
  // ---------------------------------------------------------

  const totalCount = selected.length;
  // Fall back to the raw value if the first selected option isn't in the
  // current (possibly cross-filtered or not-yet-loaded) options list.
  const firstLabel =
    totalCount > 0 ? labelByValue.get(selected[0]) ?? selected[0] : null;
  const triggerText =
    totalCount === 0 ? (
      <span className="text-gray-400">{placeholder}</span>
    ) : totalCount === 1 ? (
      <span className="truncate text-black">{firstLabel}</span>
    ) : (
      <span className="truncate text-black">
        {firstLabel} +{totalCount - 1}
      </span>
    );

  // ---------------------------------------------------------
  // Menu (portal)
  // ---------------------------------------------------------

  const menu =
    isOpen && typeof document !== 'undefined'
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
                  placeholder="Search product"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-gray-300 focus:outline-none focus:border-[#E76A42]"
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                />
              </div>
            </div>
            <div className="overflow-y-auto max-h-80">
              {visibleRows.map((row, i) => {
                const isLast = i === visibleRows.length - 1;
                if (row.kind === 'flat') {
                  const checked = selected.includes(row.value);
                  return (
                    <div key={row.value} className={isLast ? '' : 'border-b border-gray-100'}>
                      <button
                        type="button"
                        onClick={() => toggleValue(row.value)}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-left bg-transparent border-none cursor-pointer hover:bg-gray-50 transition-colors"
                        aria-label={row.label}
                      >
                        <CheckboxBox state={checked ? 'checked' : 'unchecked'} />
                        <span className="text-black truncate">{row.label}</span>
                      </button>
                    </div>
                  );
                }
                // group row
                const state = deriveGroupState(childValues, selected);
                return (
                  <div key={row.value} className={isLast ? '' : 'border-b border-gray-100'}>
                    <div className="flex items-stretch">
                      <button
                        type="button"
                        onClick={toggleGroup}
                        className="flex-1 flex items-center gap-3 px-4 py-2.5 text-sm text-left bg-transparent border-none cursor-pointer hover:bg-gray-50 transition-colors"
                        aria-label={row.label}
                      >
                        <CheckboxBox state={state} />
                        <span className="text-black truncate">{row.label}</span>
                      </button>
                      <button
                        type="button"
                        onClick={toggleExpanded}
                        className="px-3 text-gray-400 hover:text-black hover:bg-gray-100 transition-colors cursor-pointer bg-transparent border-none"
                        aria-label={`${expanded ? 'Collapse' : 'Expand'} ${row.label}`}
                      >
                        <span className="text-sm font-medium leading-none">
                          {expanded ? '−' : '+'}
                        </span>
                      </button>
                    </div>
                    {expanded && (
                      <div className="pl-7 pb-1 bg-gray-50/50">
                        {children.map((c) => {
                          const childChecked = selected.includes(c.value);
                          return (
                            <button
                              key={c.value}
                              type="button"
                              onClick={() => toggleValue(c.value)}
                              className="flex items-center gap-3 w-full px-4 py-1.5 text-sm text-left bg-transparent border-none cursor-pointer hover:bg-gray-100 transition-colors"
                              aria-label={c.label}
                            >
                              <CheckboxBox state={childChecked ? 'checked' : 'unchecked'} />
                              <span className="text-gray-700 truncate">{c.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
              {visibleRows.length === 0 && (
                <div className="px-4 py-3 text-sm text-gray-400">No products match.</div>
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
          ${
            variant === 'outlined'
              ? `border ${isOpen ? 'bg-white border-orange-500' : 'bg-white border-black-24'}`
              : isOpen
                ? 'bg-white border-2 border-orange-500'
                : 'bg-[#F2F2F4]'
          }`}
      >
        <span className="flex items-center overflow-hidden min-w-0 flex-1">{triggerText}</span>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {totalCount > 0 && (
            <span
              role="button"
              tabIndex={0}
              onClick={clearAll}
              className="inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 border-none bg-transparent cursor-pointer p-0"
              aria-label="Clear product selection"
            >
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                <path d="M1 1L7 7M7 1L1 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
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
