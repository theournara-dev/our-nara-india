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
import {
  FaAward,
  FaBagShopping,
  FaBell,
  FaBolt,
  FaBox,
  FaBriefcase,
  FaCalendarDays,
  FaCrown,
  FaDroplet,
  FaFire,
  FaGift,
  FaHeart,
  FaHouse,
  FaLocationDot,
  FaMagnifyingGlass,
  FaPaintbrush,
  FaPercent,
  FaScissors,
  FaSeedling,
  FaStar,
  FaStore,
  FaTag,
  FaTags,
  FaTicket,
  FaUser,
  FaUsers,
} from "react-icons/fa6";
import {
  BsAward,
  BsBag,
  BsBell,
  BsBoxSeam,
  BsBriefcase,
  BsBrush,
  BsCalendarEvent,
  BsDroplet,
  BsFire,
  BsFlower1,
  BsGem,
  BsGeoAlt,
  BsGift,
  BsGrid,
  BsHeart,
  BsHouse,
  BsLightningCharge,
  BsPeople,
  BsPercent,
  BsPerson,
  BsScissors,
  BsShop,
  BsStar,
  BsTag,
  BsTags,
  BsTicketPerforated,
} from "react-icons/bs";
import {
  IoBag,
  IoBriefcase,
  IoBrush,
  IoCalendar,
  IoCube,
  IoCut,
  IoFlash,
  IoFlame,
  IoGift,
  IoGrid,
  IoHeart,
  IoHome,
  IoLeaf,
  IoLocation,
  IoNotifications,
  IoPeople,
  IoPerson,
  IoPricetag,
  IoPricetags,
  IoRibbon,
  IoSparkles,
  IoStar,
  IoStatsChart,
  IoStorefront,
  IoTicket,
  IoWater,
} from "react-icons/io5";
import {
  FiAward,
  FiBell,
  FiBookmark,
  FiBox,
  FiBriefcase,
  FiCalendar,
  FiDroplet,
  FiGift,
  FiGrid,
  FiHeart,
  FiHome,
  FiMapPin,
  FiPercent,
  FiScissors,
  FiShoppingBag,
  FiShoppingCart,
  FiStar,
  FiSun,
  FiTag,
  FiUser,
  FiUsers,
  FiZap,
} from "react-icons/fi";
import {
  TbBell,
  TbBriefcase,
  TbBrush,
  TbCalendarEvent,
  TbClock,
  TbCrown,
  TbDiscount,
  TbDroplet,
  TbFlame,
  TbGift,
  TbHeart,
  TbHome,
  TbLayoutGrid,
  TbMapPin,
  TbPackage,
  TbRosette,
  TbScissors,
  TbShoppingBag,
  TbSpeakerphone,
  TbSparkles,
  TbStar,
  TbTags,
  TbTicket,
  TbUser,
  TbUsers,
} from "react-icons/tb";
import {
  RiAwardLine,
  RiBox3Line,
  RiBriefcaseLine,
  RiBrushLine,
  RiCalendarEventLine,
  RiCouponLine,
  RiDropLine,
  RiFireLine,
  RiGiftLine,
  RiGridLine,
  RiHeartLine,
  RiHomeLine,
  RiMapPinLine,
  RiMegaphoneLine,
  RiNotificationLine,
  RiPercentLine,
  RiPriceTag3Line,
  RiScissorsLine,
  RiShoppingBagLine,
  RiSparklingLine,
  RiStarLine,
  RiTeamLine,
  RiTimeLine,
  RiUserLine,
  RiVipCrownLine,
} from "react-icons/ri";
import {
  PiBell,
  PiBriefcase,
  PiCalendarDots,
  PiClock,
  PiCrown,
  PiDrop,
  PiFire,
  PiGift,
  PiHeart,
  PiHouse,
  PiMapPin,
  PiMedal,
  PiMegaphone,
  PiPackage,
  PiPaintBrush,
  PiPercent,
  PiScissors,
  PiShoppingBag,
  PiSparkle,
  PiSquaresFour,
  PiStar,
  PiTag,
  PiTicket,
  PiUser,
  PiUsers,
} from "react-icons/pi";
import {
  BiAlarm,
  BiAward,
  BiBadge,
  BiBell,
  BiBriefcase,
  BiBrush,
  BiCalendarEvent,
  BiCut,
  BiGift,
  BiGridAlt,
  BiGroup,
  BiHeart,
  BiHome,
  BiMapPin,
  BiPackage,
  BiPieChart,
  BiPurchaseTag,
  BiShoppingBag,
  BiSolidFlame,
  BiSolidOffer,
  BiStar,
  BiStore,
  BiUser,
  BiWater,
} from "react-icons/bi";

/**
 * The storefront menu's icons, shared by the header (which draws them) and the
 * admin's Site settings (which chooses them).
 *
 * Ten libraries are on offer — the **Lucide** set the site already uses, the
 * **Material Design** set from `react-icons/md`, and the other popular
 * general-purpose sets from `react-icons` — or the admin can upload any image
 * instead. A stored value is a flat key (`lucide:sparkles`, `material:brush`,
 * `fa6:house`), never a component, so the shape that travels through the site
 * config is plain JSON.
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
  /** Short name for the picker's crowded library tabs. */
  shortLabel: string;
  icons: MenuIconChoice[];
}

/** Everything an admin can pick, grouped by the library it comes from. */
export const MENU_ICON_GROUPS: MenuIconGroup[] = [
  {
    id: "lucide",
    label: "Lucide",
    shortLabel: "Lucide",
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
    label: "Material Design",
    shortLabel: "Material",
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
  {
    id: "fa6",
    label: "Font Awesome 6",
    shortLabel: "FA6",
    icons: [
      { key: "fa6:house", label: "Home", Icon: FaHouse },
      { key: "fa6:search", label: "Search", Icon: FaMagnifyingGlass },
      { key: "fa6:bag", label: "Shopping bag", Icon: FaBagShopping },
      { key: "fa6:star", label: "Star", Icon: FaStar },
      { key: "fa6:heart", label: "Heart", Icon: FaHeart },
      { key: "fa6:tags", label: "Tags", Icon: FaTags },
      { key: "fa6:tag", label: "Tag", Icon: FaTag },
      { key: "fa6:gift", label: "Gift", Icon: FaGift },
      { key: "fa6:crown", label: "Crown", Icon: FaCrown },
      { key: "fa6:fire", label: "Flame", Icon: FaFire },
      { key: "fa6:bell", label: "Bell", Icon: FaBell },
      { key: "fa6:user", label: "Person", Icon: FaUser },
      { key: "fa6:users", label: "People", Icon: FaUsers },
      { key: "fa6:briefcase", label: "Briefcase", Icon: FaBriefcase },
      { key: "fa6:store", label: "Store", Icon: FaStore },
      { key: "fa6:pin", label: "Location", Icon: FaLocationDot },
      { key: "fa6:calendar", label: "Calendar", Icon: FaCalendarDays },
      { key: "fa6:ticket", label: "Ticket", Icon: FaTicket },
      { key: "fa6:percent", label: "Percent", Icon: FaPercent },
      { key: "fa6:scissors", label: "Scissors", Icon: FaScissors },
      { key: "fa6:brush", label: "Brush", Icon: FaPaintbrush },
      { key: "fa6:droplet", label: "Droplet", Icon: FaDroplet },
      { key: "fa6:box", label: "Package", Icon: FaBox },
      { key: "fa6:award", label: "Award", Icon: FaAward },
      { key: "fa6:bolt", label: "Bolt", Icon: FaBolt },
      { key: "fa6:seedling", label: "Seedling", Icon: FaSeedling },
    ],
  },
  {
    id: "bs",
    label: "Bootstrap Icons",
    shortLabel: "Bootstrap",
    icons: [
      { key: "bs:house", label: "Home", Icon: BsHouse },
      { key: "bs:grid", label: "Grid", Icon: BsGrid },
      { key: "bs:star", label: "Star", Icon: BsStar },
      { key: "bs:heart", label: "Heart", Icon: BsHeart },
      { key: "bs:bag", label: "Shopping bag", Icon: BsBag },
      { key: "bs:tags", label: "Tags", Icon: BsTags },
      { key: "bs:tag", label: "Tag", Icon: BsTag },
      { key: "bs:gift", label: "Gift", Icon: BsGift },
      { key: "bs:gem", label: "Gem", Icon: BsGem },
      { key: "bs:fire", label: "Flame", Icon: BsFire },
      { key: "bs:bell", label: "Bell", Icon: BsBell },
      { key: "bs:person", label: "Person", Icon: BsPerson },
      { key: "bs:people", label: "People", Icon: BsPeople },
      { key: "bs:briefcase", label: "Briefcase", Icon: BsBriefcase },
      { key: "bs:shop", label: "Store", Icon: BsShop },
      { key: "bs:location", label: "Location", Icon: BsGeoAlt },
      { key: "bs:calendar", label: "Calendar", Icon: BsCalendarEvent },
      { key: "bs:ticket", label: "Ticket", Icon: BsTicketPerforated },
      { key: "bs:percent", label: "Percent", Icon: BsPercent },
      { key: "bs:scissors", label: "Scissors", Icon: BsScissors },
      { key: "bs:brush", label: "Brush", Icon: BsBrush },
      { key: "bs:droplet", label: "Droplet", Icon: BsDroplet },
      { key: "bs:box", label: "Package", Icon: BsBoxSeam },
      { key: "bs:award", label: "Award", Icon: BsAward },
      { key: "bs:bolt", label: "Bolt", Icon: BsLightningCharge },
      { key: "bs:flower", label: "Flower", Icon: BsFlower1 },
    ],
  },
  {
    id: "io5",
    label: "Ionicons 5",
    shortLabel: "Ionicons",
    icons: [
      { key: "io5:home", label: "Home", Icon: IoHome },
      { key: "io5:grid", label: "Grid", Icon: IoGrid },
      { key: "io5:star", label: "Star", Icon: IoStar },
      { key: "io5:heart", label: "Heart", Icon: IoHeart },
      { key: "io5:bag", label: "Shopping bag", Icon: IoBag },
      { key: "io5:tag", label: "Tag", Icon: IoPricetag },
      { key: "io5:tags", label: "Tags", Icon: IoPricetags },
      { key: "io5:gift", label: "Gift", Icon: IoGift },
      { key: "io5:flame", label: "Flame", Icon: IoFlame },
      { key: "io5:bell", label: "Notifications", Icon: IoNotifications },
      { key: "io5:person", label: "Person", Icon: IoPerson },
      { key: "io5:people", label: "People", Icon: IoPeople },
      { key: "io5:briefcase", label: "Briefcase", Icon: IoBriefcase },
      { key: "io5:store", label: "Store", Icon: IoStorefront },
      { key: "io5:location", label: "Location", Icon: IoLocation },
      { key: "io5:calendar", label: "Calendar", Icon: IoCalendar },
      { key: "io5:ticket", label: "Ticket", Icon: IoTicket },
      { key: "io5:stats", label: "Stats", Icon: IoStatsChart },
      { key: "io5:scissors", label: "Scissors", Icon: IoCut },
      { key: "io5:brush", label: "Brush", Icon: IoBrush },
      { key: "io5:water", label: "Droplet", Icon: IoWater },
      { key: "io5:cube", label: "Package", Icon: IoCube },
      { key: "io5:ribbon", label: "Award", Icon: IoRibbon },
      { key: "io5:flash", label: "Bolt", Icon: IoFlash },
      { key: "io5:leaf", label: "Leaf", Icon: IoLeaf },
      { key: "io5:sparkles", label: "Sparkles", Icon: IoSparkles },
    ],
  },
  {
    id: "fi",
    label: "Feather",
    shortLabel: "Feather",
    icons: [
      { key: "fi:home", label: "Home", Icon: FiHome },
      { key: "fi:grid", label: "Grid", Icon: FiGrid },
      { key: "fi:star", label: "Star", Icon: FiStar },
      { key: "fi:heart", label: "Heart", Icon: FiHeart },
      { key: "fi:bag", label: "Shopping bag", Icon: FiShoppingBag },
      { key: "fi:tag", label: "Tag", Icon: FiTag },
      { key: "fi:gift", label: "Gift", Icon: FiGift },
      { key: "fi:bell", label: "Bell", Icon: FiBell },
      { key: "fi:user", label: "Person", Icon: FiUser },
      { key: "fi:users", label: "People", Icon: FiUsers },
      { key: "fi:briefcase", label: "Briefcase", Icon: FiBriefcase },
      { key: "fi:pin", label: "Location", Icon: FiMapPin },
      { key: "fi:calendar", label: "Calendar", Icon: FiCalendar },
      { key: "fi:scissors", label: "Scissors", Icon: FiScissors },
      { key: "fi:droplet", label: "Droplet", Icon: FiDroplet },
      { key: "fi:box", label: "Package", Icon: FiBox },
      { key: "fi:award", label: "Award", Icon: FiAward },
      { key: "fi:zap", label: "Bolt", Icon: FiZap },
      { key: "fi:sun", label: "Sun", Icon: FiSun },
      { key: "fi:percent", label: "Percent", Icon: FiPercent },
      { key: "fi:cart", label: "Cart", Icon: FiShoppingCart },
      { key: "fi:bookmark", label: "Bookmark", Icon: FiBookmark },
    ],
  },
  {
    id: "tb",
    label: "Tabler",
    shortLabel: "Tabler",
    icons: [
      { key: "tb:home", label: "Home", Icon: TbHome },
      { key: "tb:grid", label: "Grid", Icon: TbLayoutGrid },
      { key: "tb:sparkles", label: "Sparkles", Icon: TbSparkles },
      { key: "tb:brush", label: "Brush", Icon: TbBrush },
      { key: "tb:scissors", label: "Scissors", Icon: TbScissors },
      { key: "tb:droplet", label: "Droplet", Icon: TbDroplet },
      { key: "tb:clock", label: "Clock", Icon: TbClock },
      { key: "tb:tags", label: "Tags", Icon: TbTags },
      { key: "tb:star", label: "Star", Icon: TbStar },
      { key: "tb:heart", label: "Heart", Icon: TbHeart },
      { key: "tb:calendar", label: "Calendar", Icon: TbCalendarEvent },
      { key: "tb:pin", label: "Location", Icon: TbMapPin },
      { key: "tb:briefcase", label: "Briefcase", Icon: TbBriefcase },
      { key: "tb:speakerphone", label: "Speakerphone", Icon: TbSpeakerphone },
      { key: "tb:users", label: "People", Icon: TbUsers },
      { key: "tb:user", label: "Person", Icon: TbUser },
      { key: "tb:ticket", label: "Ticket", Icon: TbTicket },
      { key: "tb:gift", label: "Gift", Icon: TbGift },
      { key: "tb:award", label: "Award", Icon: TbRosette },
      { key: "tb:bell", label: "Bell", Icon: TbBell },
      { key: "tb:flame", label: "Flame", Icon: TbFlame },
      { key: "tb:crown", label: "Crown", Icon: TbCrown },
      { key: "tb:bag", label: "Shopping bag", Icon: TbShoppingBag },
      { key: "tb:package", label: "Package", Icon: TbPackage },
      { key: "tb:discount", label: "Discount", Icon: TbDiscount },
    ],
  },
  {
    id: "ri",
    label: "Remix Icon",
    shortLabel: "Remix",
    icons: [
      { key: "ri:home", label: "Home", Icon: RiHomeLine },
      { key: "ri:grid", label: "Grid", Icon: RiGridLine },
      { key: "ri:sparkles", label: "Sparkles", Icon: RiSparklingLine },
      { key: "ri:brush", label: "Brush", Icon: RiBrushLine },
      { key: "ri:scissors", label: "Scissors", Icon: RiScissorsLine },
      { key: "ri:droplet", label: "Droplet", Icon: RiDropLine },
      { key: "ri:clock", label: "Clock", Icon: RiTimeLine },
      { key: "ri:tag", label: "Tag", Icon: RiPriceTag3Line },
      { key: "ri:star", label: "Star", Icon: RiStarLine },
      { key: "ri:heart", label: "Heart", Icon: RiHeartLine },
      { key: "ri:calendar", label: "Calendar", Icon: RiCalendarEventLine },
      { key: "ri:pin", label: "Location", Icon: RiMapPinLine },
      { key: "ri:briefcase", label: "Briefcase", Icon: RiBriefcaseLine },
      { key: "ri:megaphone", label: "Megaphone", Icon: RiMegaphoneLine },
      { key: "ri:team", label: "People", Icon: RiTeamLine },
      { key: "ri:user", label: "Person", Icon: RiUserLine },
      { key: "ri:coupon", label: "Coupon", Icon: RiCouponLine },
      { key: "ri:gift", label: "Gift", Icon: RiGiftLine },
      { key: "ri:award", label: "Award", Icon: RiAwardLine },
      { key: "ri:bell", label: "Notification", Icon: RiNotificationLine },
      { key: "ri:flame", label: "Flame", Icon: RiFireLine },
      { key: "ri:crown", label: "Crown", Icon: RiVipCrownLine },
      { key: "ri:bag", label: "Shopping bag", Icon: RiShoppingBagLine },
      { key: "ri:box", label: "Package", Icon: RiBox3Line },
      { key: "ri:percent", label: "Percent", Icon: RiPercentLine },
    ],
  },
  {
    id: "pi",
    label: "Phosphor",
    shortLabel: "Phosphor",
    icons: [
      { key: "pi:house", label: "Home", Icon: PiHouse },
      { key: "pi:grid", label: "Grid", Icon: PiSquaresFour },
      { key: "pi:sparkle", label: "Sparkle", Icon: PiSparkle },
      { key: "pi:brush", label: "Brush", Icon: PiPaintBrush },
      { key: "pi:scissors", label: "Scissors", Icon: PiScissors },
      { key: "pi:drop", label: "Droplet", Icon: PiDrop },
      { key: "pi:clock", label: "Clock", Icon: PiClock },
      { key: "pi:tag", label: "Tag", Icon: PiTag },
      { key: "pi:star", label: "Star", Icon: PiStar },
      { key: "pi:heart", label: "Heart", Icon: PiHeart },
      { key: "pi:calendar", label: "Calendar", Icon: PiCalendarDots },
      { key: "pi:pin", label: "Location", Icon: PiMapPin },
      { key: "pi:briefcase", label: "Briefcase", Icon: PiBriefcase },
      { key: "pi:megaphone", label: "Megaphone", Icon: PiMegaphone },
      { key: "pi:users", label: "People", Icon: PiUsers },
      { key: "pi:user", label: "Person", Icon: PiUser },
      { key: "pi:ticket", label: "Ticket", Icon: PiTicket },
      { key: "pi:gift", label: "Gift", Icon: PiGift },
      { key: "pi:medal", label: "Award", Icon: PiMedal },
      { key: "pi:bell", label: "Bell", Icon: PiBell },
      { key: "pi:fire", label: "Flame", Icon: PiFire },
      { key: "pi:crown", label: "Crown", Icon: PiCrown },
      { key: "pi:bag", label: "Shopping bag", Icon: PiShoppingBag },
      { key: "pi:package", label: "Package", Icon: PiPackage },
      { key: "pi:percent", label: "Percent", Icon: PiPercent },
    ],
  },
  {
    id: "bi",
    label: "Boxicons",
    shortLabel: "Boxicons",
    icons: [
      { key: "bi:home", label: "Home", Icon: BiHome },
      { key: "bi:grid", label: "Grid", Icon: BiGridAlt },
      { key: "bi:star", label: "Star", Icon: BiStar },
      { key: "bi:heart", label: "Heart", Icon: BiHeart },
      { key: "bi:bag", label: "Shopping bag", Icon: BiShoppingBag },
      { key: "bi:tag", label: "Tag", Icon: BiPurchaseTag },
      { key: "bi:gift", label: "Gift", Icon: BiGift },
      { key: "bi:flame", label: "Flame", Icon: BiSolidFlame },
      { key: "bi:bell", label: "Bell", Icon: BiBell },
      { key: "bi:user", label: "Person", Icon: BiUser },
      { key: "bi:group", label: "People", Icon: BiGroup },
      { key: "bi:briefcase", label: "Briefcase", Icon: BiBriefcase },
      { key: "bi:store", label: "Store", Icon: BiStore },
      { key: "bi:pin", label: "Location", Icon: BiMapPin },
      { key: "bi:calendar", label: "Calendar", Icon: BiCalendarEvent },
      { key: "bi:offer", label: "Offer", Icon: BiSolidOffer },
      { key: "bi:chart", label: "Chart", Icon: BiPieChart },
      { key: "bi:scissors", label: "Scissors", Icon: BiCut },
      { key: "bi:brush", label: "Brush", Icon: BiBrush },
      { key: "bi:water", label: "Droplet", Icon: BiWater },
      { key: "bi:package", label: "Package", Icon: BiPackage },
      { key: "bi:award", label: "Award", Icon: BiAward },
      { key: "bi:alarm", label: "Alarm", Icon: BiAlarm },
      { key: "bi:badge", label: "Badge", Icon: BiBadge },
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

/**
 * Filter the picker's icons by a free-text query, matching labels, keys and
 * library names case-insensitively. Groups with no match are dropped, so the
 * picker can render the result without a second pass.
 */
export function filterMenuIcons(
  groups: MenuIconGroup[],
  query: string,
): { group: MenuIconGroup; icons: MenuIconChoice[] }[] {
  const needle = query.trim().toLowerCase();
  return groups
    .map((group) => ({
      group,
      icons: needle
        ? group.icons.filter((icon) =>
            `${icon.label} ${icon.key} ${group.label}`
              .toLowerCase()
              .includes(needle),
          )
        : group.icons,
    }))
    .filter((entry) => entry.icons.length > 0);
}

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
