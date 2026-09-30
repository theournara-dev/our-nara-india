import Link from "next/link";

/**
 * Tab switcher for the Products section: the product list and the storewide
 * INFO content that every product falls back to.
 */
export function ProductsTabs({ active }: { active: "products" | "info" }) {
  const tabs = [
    { key: "products", label: "Products", href: "/admin/products" },
    { key: "info", label: "INFO content", href: "/admin/products/info" },
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
