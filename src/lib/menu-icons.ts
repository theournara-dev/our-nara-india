import {
  BadgeCheck,
  Bell,
  Brush,
  Briefcase,
  CalendarDays,
  Clock,
  Crown,
  Droplets,
  Flame,
  Gift,
  Heart,
  Home,
  LayoutGrid,
  MapPin,
  Megaphone,
  Package,
  Percent,
  Scissors,
  ShoppingBag,
  Sparkles,
  Star,
  Tags,
  Ticket,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";

/**
 * The storefront menu's icons, shared by the header (which draws them) and the
 * admin's Site settings (which chooses them).
 *
 * Admins pick from this fixed set rather than uploading anything: a menu icon is
 * a 15px glyph, so a curated name is both safer and visually consistent. The
 * stored value is the key (`"sparkles"`), never a component, so the shape that
 * travels through the site config is plain JSON.
 */
export const MENU_ICONS = {
  home: Home,
  grid: LayoutGrid,
  sparkles: Sparkles,
  brush: Brush,
  scissors: Scissors,
  droplets: Droplets,
  clock: Clock,
  tags: Tags,
  star: Star,
  heart: Heart,
  calendar: CalendarDays,
  pin: MapPin,
  briefcase: Briefcase,
  megaphone: Megaphone,
  users: Users,
  user: User,
  ticket: Ticket,
  gift: Gift,
  badge: BadgeCheck,
  bell: Bell,
  flame: Flame,
  crown: Crown,
  bag: ShoppingBag,
  package: Package,
  percent: Percent,
} as const;

export type MenuIconKey = keyof typeof MENU_ICONS;

/** What each icon is called in the admin's picker. */
export const MENU_ICON_LABELS: Record<MenuIconKey, string> = {
  home: "Home",
  grid: "Grid",
  sparkles: "Sparkles",
  brush: "Brush",
  scissors: "Scissors",
  droplets: "Droplets",
  clock: "Clock",
  tags: "Tags",
  star: "Star",
  heart: "Heart",
  calendar: "Calendar",
  pin: "Pin",
  briefcase: "Briefcase",
  megaphone: "Megaphone",
  users: "People",
  user: "Person",
  ticket: "Ticket",
  gift: "Gift",
  badge: "Badge",
  bell: "Bell",
  flame: "Flame",
  crown: "Crown",
  bag: "Shopping bag",
  package: "Package",
  percent: "Percent",
};

/**
 * The menu's fixed rows (the category roots come from the admin's tree and are
 * keyed `category-<slug>`). The header builds its static groups from this list
 * and the admin's icon picker lists the same rows, so the two can't drift.
 */
export const MENU_STATIC_ROWS: {
  id: string;
  label: string;
  defaultIcon: MenuIconKey;
}[] = [
  { id: "brand", label: "Brand", defaultIcon: "tags" },
  { id: "review", label: "Review", defaultIcon: "star" },
  { id: "event", label: "Event", defaultIcon: "calendar" },
  { id: "stores", label: "Stores", defaultIcon: "pin" },
  { id: "b2b", label: "B2B", defaultIcon: "briefcase" },
  { id: "ambassador", label: "Ambassador", defaultIcon: "megaphone" },
  { id: "community", label: "Community", defaultIcon: "users" },
  { id: "account", label: "My page", defaultIcon: "user" },
  { id: "coupons", label: "Couponzone", defaultIcon: "ticket" },
];

/** Icons for the category roots, by slug; anything else falls back to the grid. */
const CATEGORY_DEFAULT_ICONS: Record<string, MenuIconKey> = {
  "skin-care": "sparkles",
  makeup: "brush",
  "hair-care": "scissors",
  "pre-order": "clock",
};

/** The icon a row gets when an admin has not chosen one. */
export function defaultMenuIcon(key: string): MenuIconKey {
  if (key === "home") return "home";
  if (key.startsWith("category-")) {
    return CATEGORY_DEFAULT_ICONS[key.slice("category-".length)] ?? "grid";
  }
  return (
    MENU_STATIC_ROWS.find((row) => row.id === key)?.defaultIcon ?? "grid"
  );
}

/**
 * The icon key a row should draw: the admin's choice when it is a known icon,
 * otherwise the row's default.
 */
export function menuIconKey(
  key: string,
  custom?: Record<string, unknown> | null,
): MenuIconKey {
  const stored = custom?.[key];
  if (typeof stored === "string" && stored in MENU_ICONS) {
    return stored as MenuIconKey;
  }
  return defaultMenuIcon(key);
}

/** The component a row should draw. */
export function menuIcon(
  key: string,
  custom?: Record<string, unknown> | null,
): LucideIcon {
  return MENU_ICONS[menuIconKey(key, custom)];
}
