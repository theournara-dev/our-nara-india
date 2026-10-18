import Image from "next/image";
import { MENU_ICONS, type MenuIconSetting } from "@/lib/menu-icons";

/**
 * One menu row's icon: the admin's uploaded image when there is one, otherwise
 * the chosen (or default) glyph. Shared by the header's two-pane menu and the
 * Site settings preview, so what an admin sees is what the menu draws.
 */
export function MenuRowIcon({
  setting,
  className = "",
}: {
  setting: MenuIconSetting;
  className?: string;
}) {
  if (setting.image) {
    return (
      <Image
        src={setting.image}
        alt=""
        width={16}
        height={16}
        unoptimized
        className={`h-[15px] w-[15px] shrink-0 rounded-[3px] object-cover ${className}`}
      />
    );
  }
  const Icon = MENU_ICONS[setting.icon];
  return <Icon size={15} aria-hidden className={`shrink-0 ${className}`} />;
}
