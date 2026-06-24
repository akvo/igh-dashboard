import { STAT_CARD_COLORS } from './primitives';
import { displayHealthArea } from '@/lib/transformations/constants';

export function buildGhaStatCards(ghaSummaries, { total, totalLabel, countFn, tooltips }) {
  const ghaCards = (ghaSummaries || [])
    .map((g) => {
      const count = countFn(g);
      const pct = total > 0 ? Math.round((count / total) * 1000) / 10 : 0;
      const title = displayHealthArea(g.global_health_area ?? g.name);
      return { title, value: count, percentage: pct, tooltip: tooltips[title] };
    })
    .sort((a, b) => b.value - a.value)
    .map((card, i) => ({
      ...card,
      color: STAT_CARD_COLORS[i % STAT_CARD_COLORS.length],
    }));

  return [
    { title: totalLabel, value: total, percentage: null, tooltip: tooltips.total },
    ...ghaCards,
  ];
}
