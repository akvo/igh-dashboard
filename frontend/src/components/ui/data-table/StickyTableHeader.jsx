'use client';

import { useEffect, useRef } from 'react';
import DataTableHeader from './DataTableHeader';
import DataTableFilterRow from './DataTableFilterRow';

// =========================================================
// StickyTableHeader — cloned, page-sticky column header
// =========================================================
//
// The table's own header cannot stay pinned to the page scroll: to keep
// horizontal scroll *inside* the table, the table sits in an
// overflow-x-auto wrapper, and (per the CSS overflow-x/y coupling) that
// wrapper is also a vertical scroll container — so a sticky header inside
// it sticks to the wrapper, which never scrolls vertically, and scrolls
// away with the page.
//
// This is a second copy of the header + filter rows that lives OUTSIDE
// the wrapper, so it sticks to the page's scroll container. It mirrors
// the real header's column widths (columns are content-sized — widths are
// only known after render), mirrors the wrapper's horizontal scroll, and
// is hidden until the real header scrolls above the sticky line so the
// header is never shown twice. It reuses DataTableHeader / DataTableFilterRow
// so sort, the column kebab, the frozen first column, and the filter
// inputs all keep working while pinned.
//
// ponytail: the clone is aria-hidden — screen-reader / keyboard users act
// on the real controls (the browser scrolls them into view on focus), the
// clone is the mouse-visible sticky convenience. Duplicating live inputs
// is the accepted cost of a cloned sticky header; the alternative (moving
// the single real thead out into its own table) is a much larger refactor
// of the working table.

// Nearest vertical scroll ancestor — the element (or the document) the
// clone should stick to.
function getScrollParent(el) {
  let p = el?.parentElement;
  while (p) {
    const oy = getComputedStyle(p).overflowY;
    if (oy === 'auto' || oy === 'scroll') return p;
    p = p.parentElement;
  }
  return document.scrollingElement || document.documentElement;
}

export default function StickyTableHeader({
  columns,
  activeSort,
  filters,
  onSort,
  onHideColumn,
  onFilterChange,
  graphqlTable,
  filterContext,
  buildContextForColumn,
  serverSide,
  data,
  scrollableRef, // the overflow-x-auto wrapper
  realHeaderRowRef, // the real <tr> inside the table's <thead>
  headerHeight, // measured px height of the real header row
}) {
  const containerRef = useRef(null); // zero-height sticky; its top is auto-set
  const clipRef = useRef(null); // overflow-hidden scroll box, synced to wrapper
  const tableRef = useRef(null); // clone table; width pinned to the real table
  const colgroupRef = useRef(null); // one <col> per column, width-mirrored

  const hasFilters = columns.some((c) => c.filter);

  // Mirror column widths from the real header cells onto our <col>s.
  // Re-runs whenever the real header row resizes: data load, column
  // reorder / show-hide, user column-resize, window resize.
  useEffect(() => {
    const realRow = realHeaderRowRef.current;
    if (!realRow) return;
    const sync = () => {
      const cells = realRow.children;
      const cols = colgroupRef.current?.children ?? [];
      for (let i = 0; i < cols.length; i++) {
        const w = cells[i]?.getBoundingClientRect().width ?? 0;
        cols[i].style.width = `${w}px`;
      }
      // Pin the clone table to the real table's exact width. Without a
      // definite width, `table-layout: fixed` ignores the summed <col>
      // widths and re-distributes columns narrower, so the header ends
      // before the body when scrolled horizontally.
      const realTable = realRow.closest('table');
      if (realTable && tableRef.current) {
        tableRef.current.style.width = `${realTable.getBoundingClientRect().width}px`;
      }
    };
    sync();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(sync);
    ro.observe(realRow);
    return () => ro.disconnect();
  }, [columns, realHeaderRowRef]);

  // Position (below any sticky chrome) + horizontal-scroll mirror +
  // visibility. Done imperatively via refs so it stays off React's render
  // path on every scroll frame. Horizontal sync uses the clip's own
  // scrollLeft (an overflow:hidden box scrolls programmatically) rather
  // than a transform, so the frozen column's `sticky left:0` pins against
  // it exactly as it does in the real table.
  useEffect(() => {
    const wrapper = scrollableRef.current;
    const realRow = realHeaderRowRef.current;
    const container = containerRef.current;
    const clip = clipRef.current;
    if (!wrapper || !realRow || !container || !clip) return;
    const scroller = getScrollParent(container);

    // Sticky bars pinned above this header (page filter bars, tab strips,
    // the Table Builder toolbar…). Measured from the DOM so no host needs
    // to pass an offset: a bar counts if it lives in the same scroll
    // container, comes before the header, and horizontally overlaps it
    // (the last test drops side rails like the sticky sidebar). The set
    // only changes on layout, so it's cached and refreshed on resize.
    let bars = [];
    const refreshBars = () => {
      const cRect = container.getBoundingClientRect();
      bars = [...scroller.querySelectorAll('*')].filter((el) => {
        if (el === container || container.contains(el) || el.contains(container)) return false;
        if (el.closest('table')) return false;
        if (getComputedStyle(el).position !== 'sticky') return false;
        if (!(container.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING)) return false;
        const r = el.getBoundingClientRect();
        return r.right > cRect.left && r.left < cRect.right;
      });
    };
    refreshBars();

    const update = () => {
      clip.scrollLeft = wrapper.scrollLeft;
      // Stick right below the lowest pinned chrome bar.
      const scrollerTop =
        scroller === document.scrollingElement || scroller === document.documentElement
          ? 0
          : scroller.getBoundingClientRect().top;
      const chromeBottom = bars.reduce(
        (m, el) => Math.max(m, el.getBoundingClientRect().bottom),
        scrollerTop
      );
      container.style.top = `${chromeBottom - scrollerTop}px`;
      // Show only once the real header has scrolled above that line;
      // otherwise the header would be visible twice.
      const line = clip.getBoundingClientRect().top;
      clip.style.visibility = realRow.getBoundingClientRect().top < line - 0.5 ? 'visible' : 'hidden';
    };
    update();
    const onResize = () => {
      refreshBars();
      update();
    };
    // The wrapper drives horizontal offset; the page/main scroll drives the
    // position + show/hide. capture:true catches whichever ancestor scrolls.
    wrapper.addEventListener('scroll', update, { passive: true });
    window.addEventListener('scroll', update, { passive: true, capture: true });
    window.addEventListener('resize', onResize, { passive: true });
    return () => {
      wrapper.removeEventListener('scroll', update);
      window.removeEventListener('scroll', update, { capture: true });
      window.removeEventListener('resize', onResize);
    };
  }, [scrollableRef, realHeaderRowRef, columns]);

  return (
    // Zero-height sticky container: consumes no layout space, so the real
    // table below is not pushed down. The clip box has real height but
    // overflows the container downward (container overflow is visible).
    <div ref={containerRef} className="sticky z-10 h-0" style={{ top: 0 }} aria-hidden="true">
      <div ref={clipRef} className="overflow-hidden bg-white" style={{ visibility: 'hidden' }}>
        <table ref={tableRef} className="border-collapse" style={{ tableLayout: 'fixed' }}>
          <colgroup ref={colgroupRef}>
            {columns.map((c) => (
              <col key={c.accessor} />
            ))}
          </colgroup>
          <thead>
            <DataTableHeader
              columns={columns}
              activeSort={activeSort}
              filters={filters}
              onSort={onSort}
              onHideColumn={onHideColumn}
              scrollableRef={scrollableRef}
            />
            {hasFilters && (
              <DataTableFilterRow
                columns={columns}
                filters={filters}
                onFilterChange={onFilterChange}
                table={graphqlTable}
                filterContext={filterContext}
                buildContextForColumn={buildContextForColumn}
                headerHeight={headerHeight}
                serverSide={serverSide}
                data={data}
              />
            )}
          </thead>
        </table>
      </div>
    </div>
  );
}
