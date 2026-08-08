import Link from "next/link";

/**
 * Tab switcher between the Banners and Popups admin lists. Both share a single
 * "Banners & Popups" nav entry, so this lets you jump between the two without
 * leaving the section.
 */
export function ContentTabs({ active }: { active: "banners" | "popups" }) {
  const tabs = [
    { key: "banners", label: "Banners", href: "/admin/banners" },
    { key: "popups", label: "Popups", href: "/admin/popups" },
  ] as const;

  return (
    <div className="mb-6 inline-flex items-center gap-1 rounded-lg bg-zinc-100 p-1">
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-white text-point-600 shadow-sm"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
