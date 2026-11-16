/** Shared UI constants — pure values (no components) so fast refresh stays happy. */

/** Linear-style expo-out easing used across entrances. */
export const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** Recharts tooltip surface — matches the glass popover language. */
export const CHART_TOOLTIP_STYLE: React.CSSProperties = {
  background: "var(--tooltip-bg)",
  border: "1px solid var(--tooltip-border)",
  borderRadius: 10,
  boxShadow: "0 16px 44px rgba(0,0,0,0.5)",
  color: "var(--tooltip-text)",
  fontSize: 12,
  padding: "8px 12px",
  backdropFilter: "blur(16px)",
};
