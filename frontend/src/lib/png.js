/**
 * PNG generation and download utility.
 *
 * Uses html2canvas (dynamically imported to keep it out of the initial
 * bundle) to capture a DOM element as a 2× resolution PNG with a white
 * background, then triggers a browser download.
 */

/**
 * Capture the DOM element referenced by `ref` and download it as a PNG.
 *
 * @param {React.RefObject} ref      - React ref attached to the target element.
 * @param {string}          filename - Download filename (without extension).
 */
export async function downloadPNG(ref, filename) {
  if (!ref.current) return;
  try {
    const html2canvas = (await import('html2canvas')).default;

    // Temporarily expand overflow-hidden containers so html2canvas
    // captures the full scrollable content, not just the visible slice.
    const overflowEls = ref.current.querySelectorAll('.overflow-x-auto');
    const saved = [];
    for (const el of overflowEls) {
      saved.push({
        el,
        overflow: el.style.overflow,
        parentWidth: ref.current.style.width,
      });
      ref.current.style.width = `${el.scrollWidth}px`;
      el.style.overflow = 'visible';
    }

    const canvas = await html2canvas(ref.current, {
      backgroundColor: '#ffffff',
      scale: 2,
    });

    // Restore original styles so the layout snaps back after capture.
    for (const { el, overflow, parentWidth } of saved) {
      el.style.overflow = overflow;
      ref.current.style.width = parentWidth;
    }

    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.png`;
    a.click();
  } catch (error) {
    console.error('Error generating PNG:', error);
  }
}
