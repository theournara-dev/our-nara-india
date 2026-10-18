import type { ComponentType } from "react";
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
} from "lucide-react";
import {
  MdBrush,
  MdBusinessCenter,
  MdCampaign,
  MdConfirmationNumber,
  MdContentCut,
  MdEvent,
  MdFaceRetouchingNatural,
  MdFavorite,
  MdGridView,
  MdHome,
  MdLocalFireDepartment,
  MdLocalOffer,
  MdLocationOn,
  MdNotifications,
  MdPeople,
  MdPercent,
  MdPerson,
  MdRedeem,
  MdSchedule,
  MdSell,
  MdShoppingBag,
  MdSpa,
  MdStar,
  MdStore,
  MdWaterDrop,
  MdWorkspacePremium,
} from "react-icons/md";

/**
 * The storefront menu's icons, shared by the header (which draws them) and the
 * admin's Site settings (which chooses them).
 *
 * Two libraries are on offer — the **Lucide** set the site already uses and the
 * **Material Design** set from `react-icons/md`, which the header also ships —
 * or the admin can upload any image instead. A stored value is a flat key
 * (`lucide:sparkles`, `material:brush`), never a component, so the shape that
 * travels through the site config is plain JSON.
 */

/** Props either library's components accept for our use. */
export type MenuIconComponent = ComponentType<{
  size?: number | string;
  className?: string;
  title?: string;
  "aria-hidden"?: boolean | "true" | "false";
}>;

export interface MenuIconChoice {
  /** Stored value: `<library>:<name>`. */
  key: string;
  label: string;
  Icon: MenuIconComponent;
}

export interface MenuIconGroup {
  id: string;
  label: string;
  icons: MenuIconChoice[];
}

/** Everything an admin can pick, grouped by the library it comes from. */
export const MENU_ICON_GROUPS: MenuIconGroup[] = [
  {
    id: "lucide",
    label: "Lucide",
    icons: [
      { key: "lucide:home", label: "Home", Icon: Home },
      { key: "lucide:grid", label: "Grid", Icon: LayoutGrid },
      { key: "lucide:sparkles", label: "Sparkles", Icon: Sparkles },
      { key: "lucide:brush", label: "Brush", Icon: Brush },
      { key: "lucide:scissors", label: "Scissors", Icon: Scissors },
      { key: "lucide:droplets", label: "Droplets", Icon: Droplets },
      { key: "lucide:clock", label: "Clock", Icon: Clock },
      { key: "lucide:tags", label: "Tags", Icon: Tags },
      { key: "lucide:star", label: "Star", Icon: Star },
      { key: "lucide:heart", label: "Heart", Icon: Heart },
      { key: "lucide:calendar", label: "Calendar", Icon: CalendarDays },
      { key: "lucide:pin", label: "Pin", Icon: MapPin },
      { key: "lucide:briefcase", label: "Briefcase", Icon: Briefcase },
      { key: "lucide:megaphone", label: "Megaphone", Icon: Megaphone },
      { key: "lucide:users", label: "People", Icon: Users },
      { key: "lucide:user", label: "Person", Icon: User },
      { key: "lucide:ticket", label: "Ticket", Icon: Ticket },
      { key: "lucide:gift", label: "Gift", Icon: Gift },
      { key: "lucide:badge", label: "Badge", Icon: BadgeCheck },
      { key: "lucide:bell", label: "Bell", Icon: Bell },
      { key: "lucide:flame", label: "Flame", Icon: Flame },
      { key: "lucide:crown", label: "Crown", Icon: Crown },
      { key: "lucide:bag", label: "Shopping bag", Icon: ShoppingBag },
      { key: "lucide:package", label: "Package", Icon: Package },
      { key: "lucide:percent", label: "Percent", Icon: Percent },
    ],
  },
  {
    id: "material",
    label: "Material Design (react-icons)",
    icons: [
      { key: "material:home", label: "Home", Icon: MdHome },
      { key: "material:grid", label: "Grid view", Icon: MdGridView },
      {
        key: "material:face",
        label: "Face retouching",
        Icon: MdFaceRetouchingNatural,
      },
      { key: "material:brush", label: "Brush", Icon: MdBrush },
      { key: "material:cut", label: "Scissors", Icon: MdContentCut },
      { key: "material:schedule", label: "Schedule", Icon: MdSchedule },
      { key: "material:sell", label: "Sell", Icon: MdSell },
      { key: "material:offer", label: "Local offer", Icon: MdLocalOffer },
      { key: "material:star", label: "Star", Icon: MdStar },
      { key: "material:event", label: "Event", Icon: MdEvent },
      { key: "material:store", label: "Store", Icon: MdStore },
      {
        key: "material:business",
        label: "Business",
        Icon: MdBusinessCenter,
      },
      { key: "material:campaign", label: "Campaign", Icon: MdCampaign },
      { key: "material:people", label: "People", Icon: MdPeople },
      { key: "material:person", label: "Person", Icon: MdPerson },
      {
        key: "material:coupon",
        label: "Coupon",
        Icon: MdConfirmationNumber,
      },
      { key: "material:redeem", label: "Redeem", Icon: MdRedeem },
      { key: "material:water", label: "Water drop", Icon: MdWaterDrop },
      { key: "material:spa", label: "Spa", Icon: MdSpa },
      {
        key: "material:favorite",
        label: "Favorite",
        Icon: MdFavorite,
      },
      {
        key: "material:bag",
        label: "Shopping bag",
        Icon: MdShoppingBag,
      },
      { key: "material:percent", label: "Percent", Icon: MdPercent },
      {
        key: "material:fire",
        label: "Fire",
        Icon: MdLocalFireDepartment,
      },
      {
        key: "material:premium",
        label: "Premium",
        Icon: MdWorkspacePremium,
      },
      {
        key: "material:bell",
        label: "Notifications",
        Icon: MdNotifications,
      },
      {
        key: "material:pin",
        label: "Location",
        Icon: MdLocationOn,
      },
    ],
  },
];

/** Flat lookup of every pickable icon, by stored key. */
export const MENU_ICONS: Record<string, MenuIconComponent> = Object.fromEntries(
  MENU_ICON_GROUPS.flatMap((group) =>
    group.icons.map((icon) => [icon.key, icon.Icon] as const),
  ),
);

/** Human labels, by stored key (the picker's tooltips and the row summary). */
export const MENU_ICON_LABELS: Record<string, string> = Object.fromEntries(
  MENU_ICON_GROUPS.flatMap((group) =>
    group.icons.map((icon) => [icon.key, icon.label] as const),
  ),
);

/** A stored choice: a library-qualified key such as `lucide:sparkles`. */
export type MenuIconKey = string;

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
  { id: "brand", label: "Brand", defaultIcon: "lucide:tags" },
  { id: "review", label: "Review", defaultIcon: "lucide:star" },
  { id: "event", label: "Event", defaultIcon: "lucide:calendar" },
  { id: "stores", label: "Stores", defaultIcon: "lucide:pin" },
  { id: "b2b", label: "B2B", defaultIcon: "lucide:briefcase" },
  { id: "ambassador", label: "Ambassador", defaultIcon: "lucide:megaphone" },
  { id: "community", label: "Community", defaultIcon: "lucide:users" },
  { id: "account", label: "My page", defaultIcon: "lucide:user" },
  { id: "coupons", label: "Couponzone", defaultIcon: "lucide:ticket" },
];

/** Icons for the category roots, by slug; anything else falls back to the grid. */
const CATEGORY_DEFAULT_ICONS: Record<string, MenuIconKey> = {
  "skin-care": "lucide:sparkles",
  makeup: "lucide:brush",
  "hair-care": "lucide:scissors",
  "pre-order": "lucide:clock",
};

/** The icon a row gets when an admin has not chosen one. */
export function defaultMenuIcon(key: string): MenuIconKey {
  if (key === "home") return "lucide:home";
  if (key.startsWith("category-")) {
    return (
      CATEGORY_DEFAULT_ICONS[key.slice("category-".length)] ?? "lucide:grid"
    );
  }
  return (
    MENU_STATIC_ROWS.find((row) => row.id === key)?.defaultIcon ?? "lucide:grid"
  );
}

/** One row's resolved icon: an uploaded image when there is one, else an icon. */
export interface MenuIconSetting {
  icon: MenuIconKey;
  image: string | null;
}

/** An uploaded image (a full URL or a path on this site), not an icon key. */
export function isMenuIconImage(value: unknown): value is string {
  return typeof value === "string" && /^(https?:\/\/|\/)/i.test(value.trim());
}

/**
 * Resolve a stored icon value. Current values are library-qualified
 * (`lucide:sparkles`); the first round stored bare Lucide names (`sparkles`), so
 * those are read as Lucide rather than dropped.
 */
function resolveIconKey(stored: string): MenuIconKey | null {
  if (stored in MENU_ICONS) return stored;
  const legacy = `lucide:${stored}`;
  return legacy in MENU_ICONS ? legacy : null;
}

/**
 * The icon key a row should draw: the admin's choice when it is a known icon,
 * otherwise the row's default. (Kept for the admin's picker, which shows the
 * fallback icon even while an image is set.)
 */
export function menuIconKey(
  key: string,
  custom?: Record<string, unknown> | null,
): MenuIconKey {
  return menuIconSetting(key, custom).icon;
}

/**
 * Resolve one row's setting. Stored values may be the current shape
 * (`{ icon?, image? }`) or the first round's flat string (an icon key or an
 * image path), so both keep working.
 */
export function menuIconSetting(
  key: string,
  custom?: Record<string, unknown> | null,
): MenuIconSetting {
  const raw = custom?.[key];
  const record =
    typeof raw === "object" && raw !== null
      ? (raw as { icon?: unknown; image?: unknown })
      : null;

  const iconRaw = record
    ? record.icon
    : typeof raw === "string" && !isMenuIconImage(raw)
      ? raw
      : undefined;
  const imageRaw = record
    ? record.image
    : isMenuIconImage(raw)
      ? raw
      : undefined;

  return {
    icon:
      resolveIconKey(typeof iconRaw === "string" ? iconRaw : "") ??
      defaultMenuIcon(key),
    image:
      typeof imageRaw === "string" && imageRaw.trim() ? imageRaw.trim() : null,
  };
}
