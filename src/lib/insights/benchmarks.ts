// Static industry reference points. These are not computed from our own
// data and not targets/expectations -- just external benchmarks each
// insight or funnel stage compares actual performance against. Edit
// directly as better reference data becomes available; there's no UI for
// this either.

// CTR by average position, per commonly published organic CTR studies.
// Positions between these anchors are linearly interpolated; positions
// beyond 10 continue the final segment's slope, floored just above zero so
// a very low position never implies a negative expected CTR.
const CTR_BENCHMARK_POINTS: readonly (readonly [position: number, ctr: number])[] = [
  [1, 0.27],
  [2, 0.15],
  [3, 0.09],
  [5, 0.06],
  [10, 0.02],
];

export function expectedCtrForPosition(position: number): number {
  const points = CTR_BENCHMARK_POINTS;
  if (position <= points[0][0]) return points[0][1];
  for (let i = 0; i < points.length - 1; i++) {
    const [p0, c0] = points[i];
    const [p1, c1] = points[i + 1];
    if (position <= p1) {
      const t = (position - p0) / (p1 - p0);
      return c0 + (c1 - c0) * t;
    }
  }
  const [pPrev, cPrev] = points[points.length - 2];
  const [pLast, cLast] = points[points.length - 1];
  const slope = (cLast - cPrev) / (pLast - pPrev);
  return Math.max(cLast + slope * (position - pLast), 0.003);
}

// Organic conversion rate benchmark for B2B services -- the funnel's
// Conversions stage is compared against this fixed figure, not a computed
// one.
export const ORGANIC_CVR_BENCHMARK = 0.029;

// Healthy branded-search share for a B2B services company. Within/below
// this range reads as healthy organic discovery; meaningfully above it
// reads as over-reliance on people who already know the brand.
export const BRANDED_SHARE_HEALTHY_RANGE = { min: 0.3, max: 0.4 };
