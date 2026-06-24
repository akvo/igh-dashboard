import { GHA_COLORS } from './primitives';
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
    .map((card) => ({
      ...card,
      color: GHA_COLORS[card.title] || '#B28FC9',
    }));

  return [
    { title: totalLabel, value: total, percentage: null, tooltip: tooltips.total },
    ...ghaCards,
  ];
}
