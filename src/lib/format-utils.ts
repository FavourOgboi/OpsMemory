export function formatNaira(amount: number, compact = false) {
  if (compact && Math.abs(amount) >= 1000000) {
    return `N${(amount / 1000000).toFixed(amount % 1000000 === 0 ? 0 : 1)}M`;
  }
  if (compact && Math.abs(amount) >= 1000) {
    return `N${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}K`;
  }
  return `N${amount.toLocaleString('en-NG')}`;
}
