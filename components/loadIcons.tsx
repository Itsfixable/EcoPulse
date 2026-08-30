import {
  Stethoscope,
  Droplets,
  RadioTower,
  House,
  School,
  Filter,
  Snowflake,
  Zap,
  type LucideIcon,
} from "lucide-react";

/**
 * One icon per load, shared by the priority list and anywhere else a load is
 * named, so a reader learns the symbol once.
 */
const ICONS: Record<string, LucideIcon> = {
  clinic: Stethoscope,
  pumps: Droplets,
  comms: RadioTower,
  homes: House,
  school: School,
  desal: Filter,
  ice: Snowflake,
};

/** Tier colours: critical, essential, deferrable. */
const TIER_ACCENT: Record<number, string> = {
  1: "var(--color-diesel)",
  2: "var(--color-solar)",
  3: "var(--color-water)",
};

export function LoadIcon({
  id,
  size = 16,
}: {
  id: string;
  size?: number;
}) {
  const Icon = ICONS[id] ?? Zap;
  return <Icon size={size} strokeWidth={1.8} aria-hidden="true" />;
}

export function loadAccent(tier: number) {
  return TIER_ACCENT[tier] ?? "var(--color-brand-500)";
}
