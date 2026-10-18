"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ChevronDown } from "lucide-react";
import { ImageField } from "@/components/admin/image-field";
import { MenuRowIcon } from "@/components/layout/menu-row-icon";
import { StoreNudge } from "@/components/layout/store-nudge";
import {
  StorePickerCards,
  STORE_PICKER_PANEL_CLASS,
} from "@/components/layout/store-picker-cards";
import {
  UploadQueueProvider,
  useUploadGate,
} from "@/components/upload/upload-queue";
import {
  saveSiteContent,
  saveStorePicker,
  saveMenuIcons,
} from "@/app/admin/site/actions";
import { notify } from "@/lib/toast";
import {
  defaultMenuIcon,
  MENU_ICONS,
  MENU_ICON_LABELS,
  menuIconSetting,
  type MenuIconKey,
} from "@/lib/menu-icons";
import {
  GLOBAL_STORE_GRADIENT,
  topBannerBackgroundCss,
  type SiteContent,
  type MenuIconRecord,
  type SwitcherBlock,
  type SwitcherContent,
  type SwitcherNudgeIcon,
  type TopBannerBlock,
  type TopBannerGradientStop,
} from "@/lib/site-content";
import type { SiteVersion } from "@/lib/site-version";

const inputCls =
  "h-9 w-full rounded border border-zinc-200 bg-white px-2 text-sm text-zinc-900 outline-none focus:border-point-500";

/** Basis points → the plain "18" an admin types (1800 → "18"). */
function bpsToPercent(bps: number): string {
  return String(bps / 100);
}

/** An admin's percent text → basis points, clamped to 0–50%, or the old value. */
function percentToBps(text: string | null, fallback: number): number {
  if (text == null || text.trim() === "") return fallback;
  const value = Number(text.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(value)) return fallback;
  return Math.min(5000, Math.max(0, Math.round(value * 100)));
}
const labelCls = "mb-1 block text-xs font-medium text-zinc-500";
const saveBtnCls =
  "h-9 rounded bg-point-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-point-600 disabled:opacity-60";

const VERSIONS: { key: SiteVersion; label: string; hint: string }[] = [
  {
    key: "local",
    label: "India (our-nara.com)",
    hint: "Shown to visitors shopping the India store.",
  },
  {
    key: "global",
    label: "International (our-nara.co.kr)",
    hint: "Shown to visitors shopping the international store.",
  },
];

/** Random-enough id for a freshly added block. */
function newId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Admin editor for the storefront's per-version content: contact details, the
 * rotating top banner and the store-picker popup. Each panel saves on its own
 * so a half-finished edit can't overwrite the rest.
 */
export function SiteSettingsForm({
  initial,
  initialSwitcher,
  initialMenuIcons,
  menuRows,
}: {
  initial: Record<SiteVersion, SiteContent>;
  initialSwitcher: SwitcherContent;
  initialMenuIcons: MenuIconRecord;
  /** Every row of the header menu, for the icon picker. */
  menuRows: { id: string; label: string }[];
}) {
  return (
    <UploadQueueProvider>
      <SiteSettingsInner
        initial={initial}
        initialSwitcher={initialSwitcher}
        initialMenuIcons={initialMenuIcons}
        menuRows={menuRows}
      />
    </UploadQueueProvider>
  );
}

function SiteSettingsInner({
  initial,
  initialSwitcher,
  initialMenuIcons,
  menuRows,
}: {
  initial: Record<SiteVersion, SiteContent>;
  initialSwitcher: SwitcherContent;
  initialMenuIcons: MenuIconRecord;
  menuRows: { id: string; label: string }[];
}) {
  const [tab, setTab] = useState<SiteVersion>("local");
  const [content, setContent] = useState(initial);
  const [switcher, setSwitcher] = useState(initialSwitcher);
  const [menuIcons, setMenuIcons] = useState(initialMenuIcons);
  const [saving, setSaving] = useState<string | null>(null);
  // Raw percent text while the admin types the GST rates (null = show stored).
  const [taxMhText, setTaxMhText] = useState<string | null>(null);
  const [taxOtherText, setTaxOtherText] = useState<string | null>(null);
  // The GST panel patches its rates and saves in the same click, but the
  // handler the gate calls still closes over the previous render — so the
  // just-typed rates ride in a ref that the payload reads at send time.
  const taxOverride = useRef<{ mhBps: number; otherBps: number } | null>(null);
  const [, startTransition] = useTransition();

  const current = content[tab];

  function patch(patchValue: Partial<SiteContent>) {
    setContent((prev) => ({ ...prev, [tab]: { ...prev[tab], ...patchValue } }));
  }

  function run(label: string, action: () => Promise<void>) {
    setSaving(label);
    startTransition(async () => {
      const toastId = notify.loading("Saving…");
      try {
        await action();
        notify.success(toastId, "Saved");
      } catch (err) {
        notify.error(
          toastId,
          "Save failed",
          err instanceof Error ? err.message : "Try again.",
        );
      } finally {
        setSaving(null);
      }
    });
  }

  // The contact, stores page and banner panels share one row-level save action,
  // so each sends the full current state of the store (never a stale half).
  // Each save goes through the gate: any image picked in the panel uploads
  // first, then the handler re-runs against the state holding its URL.
  const gate = useUploadGate();

  const saveStore = (label: string) => {
    const taxRates = taxOverride.current ?? current.taxRates;
    taxOverride.current = null;
    return run(label, () =>
      saveSiteContent({
        version: tab,
        email: current.email,
        phone: current.phone,
        address: current.address,
        topBanner: current.topBanner,
        taxRates,
        shippingCents: current.shippingCents,
        freeShippingOverCents: current.freeShippingOverCents,
        dispatchCutoffHour: current.dispatchCutoffHour,
        invoice: current.invoice,
      }),
    );
  };

  useEffect(() => {
    gate.registerHandler("contact", () => saveStore("contact"));
    gate.registerHandler("banner", () => saveStore("banner"));
    gate.registerHandler("tax", () => saveStore("tax"));
    gate.registerHandler("shipping", () => saveStore("shipping"));
    gate.registerHandler("invoice", () => saveStore("invoice"));
    gate.registerHandler("switcher", () =>
      run("switcher", () => saveStorePicker(switcher)),
    );
    gate.registerHandler("menu-icons", () =>
      run("menu-icons", () => saveMenuIcons(menuIcons)),
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-1 text-2xl font-semibold text-zinc-900">
          Site settings
        </h1>
        <p className="text-sm text-zinc-500">
          Storefront content for each store. Everything here appears on the live
          site immediately after saving.
        </p>
      </div>

      {/* Store tabs */}
      <div className="inline-flex items-center gap-1 rounded-lg bg-zinc-100 p-1">
        {VERSIONS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === key
                ? "bg-white text-point-600 shadow-sm"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="-mt-4 text-xs text-zinc-400">
        {VERSIONS.find((v) => v.key === tab)?.hint}
      </p>

      {/* ── Contact details ─────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-zinc-100 bg-white p-5">
        <h2 className="mb-1 text-sm font-semibold text-zinc-900">
          Contact details
        </h2>
        <p className="mb-4 text-xs text-zinc-400">
          Shown in the footer, the policies, the stores page and the order
          emails. The email is also the inbox that receives the store&apos;s
          new-order notifications.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>Email</span>
            <input
              type="email"
              value={current.email}
              onChange={(e) => patch({ email: e.target.value })}
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className={labelCls}>Phone</span>
            <input
              value={current.phone}
              onChange={(e) => patch({ phone: e.target.value })}
              placeholder="Leave empty to hide the phone"
              className={inputCls}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className={labelCls}>Address</span>
            <textarea
              rows={2}
              value={current.address}
              onChange={(e) => patch({ address: e.target.value })}
              className="w-full rounded border border-zinc-200 bg-white px-2 py-2 text-sm text-zinc-900 outline-none focus:border-point-500"
            />
          </label>
        </div>
        <div className="mt-4">
          <button
            type="button"
            onClick={() => void gate.save("contact")}
            disabled={saving !== null}
            className={saveBtnCls}
          >
            {saving === "contact" ? "Saving…" : "Save contact details"}
          </button>
        </div>
      </section>

      {/* ── Delivery ────────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-zinc-100 bg-white p-5">
        <h2 className="mb-1 text-sm font-semibold text-zinc-900">Delivery</h2>
        <p className="mb-4 text-xs text-zinc-400">
          The fee charged at checkout, and the order value above which delivery
          becomes free. Customers see a progress bar towards the threshold in
          the cart, the quick-buy sheet and on product pages. Leave the fee at 0
          to always ship free.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>Delivery fee (₹)</span>
            <MoneyInput
              key={`fee-${tab}`}
              valueCents={current.shippingCents}
              onChange={(cents) => patch({ shippingCents: cents ?? 0 })}
            />
          </label>
          <label className="block">
            <span className={labelCls}>Free delivery over (₹)</span>
            <MoneyInput
              key={`milestone-${tab}`}
              valueCents={current.freeShippingOverCents}
              onChange={(cents) => patch({ freeShippingOverCents: cents })}
              placeholder="Empty = no free-delivery threshold"
            />
            {current.shippingCents === 0 &&
              (current.freeShippingOverCents ?? 0) > 0 && (
                <span className="mt-1 block text-[11px] text-zinc-400">
                  With no delivery fee nothing is charged either way; this
                  threshold only drives the progress bar customers see.
                </span>
              )}
          </label>
          <label className="block">
            <span className={labelCls}>Dispatch cut-off (hour, 0–23)</span>
            <input
              type="number"
              min={0}
              max={23}
              value={current.dispatchCutoffHour}
              onChange={(e) =>
                patch({
                  dispatchCutoffHour: Math.min(
                    23,
                    Math.max(0, Number(e.target.value) || 0),
                  ),
                })
              }
              className={inputCls}
            />
            <span className="mt-1 block text-[11px] text-zinc-400">
              Orders placed after this hour join the next dispatch day. Shown in
              the cart as “Today&apos;s shipment closes at …”.
            </span>
          </label>
        </div>
        <div className="mt-4">
          <button
            type="button"
            onClick={() => void gate.save("shipping")}
            disabled={saving !== null}
            className={saveBtnCls}
          >
            {saving === "shipping" ? "Saving…" : "Save delivery"}
          </button>
        </div>
      </section>

      {/* ── Invoice ─────────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-zinc-100 bg-white p-5">
        <h2 className="mb-1 text-sm font-semibold text-zinc-900">Invoice</h2>
        <p className="mb-4 text-xs text-zinc-400">
          The &ldquo;from&rdquo; block printed on this store&apos;s order
          invoices. Each store bills as its own legal entity.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>Legal name</span>
            <input
              value={current.invoice.legalName}
              onChange={(e) =>
                patch({
                  invoice: { ...current.invoice, legalName: e.target.value },
                })
              }
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className={labelCls}>Tax / registration ID</span>
            <input
              value={current.invoice.taxId}
              onChange={(e) =>
                patch({
                  invoice: { ...current.invoice, taxId: e.target.value },
                })
              }
              placeholder="Optional"
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className={labelCls}>Email</span>
            <input
              type="email"
              value={current.invoice.email}
              onChange={(e) =>
                patch({
                  invoice: { ...current.invoice, email: e.target.value },
                })
              }
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className={labelCls}>Phone</span>
            <input
              value={current.invoice.phone}
              onChange={(e) =>
                patch({
                  invoice: { ...current.invoice, phone: e.target.value },
                })
              }
              className={inputCls}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className={labelCls}>Address</span>
            <textarea
              rows={2}
              value={current.invoice.address}
              onChange={(e) =>
                patch({
                  invoice: { ...current.invoice, address: e.target.value },
                })
              }
              className="w-full rounded border border-zinc-200 bg-white px-2 py-2 text-sm text-zinc-900 outline-none focus:border-point-500"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className={labelCls}>Footer note</span>
            <textarea
              rows={2}
              value={current.invoice.note}
              onChange={(e) =>
                patch({
                  invoice: { ...current.invoice, note: e.target.value },
                })
              }
              placeholder="Printed at the bottom of every invoice (e.g. payment terms). Optional."
              className="w-full rounded border border-zinc-200 bg-white px-2 py-2 text-sm text-zinc-900 outline-none focus:border-point-500"
            />
          </label>
        </div>
        <div className="mt-4">
          <button
            type="button"
            onClick={() => void gate.save("invoice")}
            disabled={saving !== null}
            className={saveBtnCls}
          >
            {saving === "invoice" ? "Saving…" : "Save invoice details"}
          </button>
        </div>
      </section>

      {/* ── Top banner ──────────────────────────────────────────────────── */}
      <TopBannerEditor
        blocks={current.topBanner}
        onChange={(topBanner) => patch({ topBanner })}
        onSave={() => void gate.save("banner")}
        saving={saving === "banner"}
        disabled={saving !== null}
      />

      {/* ── Header menu icons ───────────────────────────────────────────── */}
      <MenuIconsEditor
        rows={menuRows}
        value={menuIcons}
        onChange={setMenuIcons}
        onSave={() => void gate.save("menu-icons")}
        saving={saving === "menu-icons"}
        disabled={saving !== null}
      />

      {/* Store-picker editor */}
      {/* ── India GST (local store only) ────────────────────────────────── */}
      {tab === "local" && (
        <section className="rounded-2xl border border-zinc-100 bg-white p-5">
          <h2 className="mb-1 text-sm font-semibold text-zinc-900">
            Tax (India GST)
          </h2>
          <p className="mb-4 text-xs text-zinc-400">
            Storewide defaults for the India store&apos;s invoices. Prices are
            tax-inclusive, so the invoice works the tax back out of them: a
            Maharashtra delivery splits it into CGST + SGST, anywhere else
            charges it as IGST. A product with its own rates (Products → Tax %)
            overrides these. The International storefront shows no tax.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={labelCls}>Maharashtra (intra-State) %</span>
              <input
                value={taxMhText ?? bpsToPercent(current.taxRates.mhBps)}
                onChange={(e) => setTaxMhText(e.target.value)}
                inputMode="decimal"
                placeholder="18"
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className={labelCls}>Other states (inter-State) %</span>
              <input
                value={taxOtherText ?? bpsToPercent(current.taxRates.otherBps)}
                onChange={(e) => setTaxOtherText(e.target.value)}
                inputMode="decimal"
                placeholder="18"
                className={inputCls}
              />
            </label>
          </div>
          <div className="mt-4">
            <button
              type="button"
              onClick={() => {
                const taxRates = {
                  mhBps: percentToBps(taxMhText, current.taxRates.mhBps),
                  otherBps: percentToBps(
                    taxOtherText,
                    current.taxRates.otherBps,
                  ),
                };
                taxOverride.current = taxRates;
                patch({ taxRates });
                void gate.save("tax");
              }}
              disabled={saving !== null}
              className={saveBtnCls}
            >
              {saving === "tax" ? "Saving…" : "Save tax rates"}
            </button>
          </div>
        </section>
      )}

      {/* ── Store picker ────────────────────────────────────────────────── */}
      <StorePickerEditor
        content={switcher}
        onChange={setSwitcher}
        onSave={() => void gate.save("switcher")}
        saving={saving === "switcher"}
        disabled={saving !== null}
      />
    </div>
  );
}

/**
 * Rupee text input that keeps the raw text while typing, so a partially typed
 * amount ("12.") isn't reformatted under the cursor. Emits minor units; an
 * empty box emits null so an unset milestone can be cleared.
 */
function MoneyInput({
  valueCents,
  onChange,
  placeholder,
}: {
  valueCents: number | null;
  onChange: (cents: number | null) => void;
  placeholder?: string;
}) {
  const [text, setText] = useState(() =>
    valueCents == null ? "" : String(valueCents / 100),
  );

  return (
    <input
      inputMode="decimal"
      value={text}
      placeholder={placeholder}
      onChange={(e) => {
        const raw = e.target.value;
        setText(raw);
        if (raw.trim() === "") {
          onChange(null);
          return;
        }
        const parsed = Number.parseFloat(raw);
        onChange(
          Number.isFinite(parsed) ? Math.max(0, Math.round(parsed * 100)) : 0,
        );
      }}
      className={inputCls}
    />
  );
}

/** Solid colour or gradient background for one top-banner block. */
function BackgroundField({
  id,
  block,
  onTypeChange,
  onColorChange,
  onStopsChange,
}: {
  id: string;
  block: TopBannerBlock;
  onTypeChange: (type: "solid" | "gradient") => void;
  onColorChange: (color: string) => void;
  onStopsChange: (stops: TopBannerGradientStop[]) => void;
}) {
  const gradient = block.backgroundType === "gradient";
  const stops = block.gradientStops ?? [];

  function patchStop(index: number, patch: Partial<TopBannerGradientStop>) {
    onStopsChange(stops.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium text-zinc-500">Background</span>
        <div className="flex gap-1">
          {(["solid", "gradient"] as const).map((type) => {
            const active = gradient ? type === "gradient" : type === "solid";
            return (
              <button
                key={type}
                type="button"
                onClick={() => onTypeChange(type)}
                aria-pressed={active}
                className={`h-7 rounded px-2 text-xs font-medium transition-colors ${
                  active
                    ? "bg-point-500 text-white"
                    : "border border-zinc-200 bg-white text-zinc-600 hover:border-point-500 hover:text-point-500"
                }`}
              >
                {type === "solid" ? "Solid colour" : "Gradient"}
              </button>
            );
          })}
        </div>
      </div>

      {gradient ? (
        <div className="mt-2 space-y-2">
          {stops.map((stop, index) => (
            <div
              key={`${id}-stop-${index}`}
              className="flex items-center gap-2"
            >
              <input
                type="color"
                aria-label={`Gradient stop ${index + 1} colour`}
                value={
                  /^#[0-9a-f]{6}$/i.test(stop.color) ? stop.color : "#000000"
                }
                onChange={(e) => patchStop(index, { color: e.target.value })}
                className="h-8 w-10 shrink-0 cursor-pointer rounded border border-zinc-200 bg-white p-0.5"
              />
              <input
                aria-label={`Gradient stop ${index + 1} hex`}
                value={stop.color}
                onChange={(e) => patchStop(index, { color: e.target.value })}
                className={`${inputCls} w-28`}
              />
              <label className="flex items-center gap-1 text-xs text-zinc-500">
                <input
                  type="number"
                  min={0}
                  max={100}
                  aria-label={`Gradient stop ${index + 1} position`}
                  value={stop.position}
                  onChange={(e) =>
                    patchStop(index, {
                      position: Math.max(
                        0,
                        Math.min(100, Number(e.target.value) || 0),
                      ),
                    })
                  }
                  className={`${inputCls} w-16`}
                />
                %
              </label>
              <button
                type="button"
                onClick={() =>
                  onStopsChange(stops.filter((_, i) => i !== index))
                }
                disabled={stops.length <= 2}
                className="rounded px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 disabled:opacity-30"
              >
                Remove
              </button>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                onStopsChange([...stops, { color: "#ffffff", position: 100 }])
              }
              disabled={stops.length >= 6}
              className="h-8 rounded border border-dashed border-zinc-300 px-2 text-xs font-medium text-zinc-600 hover:border-point-500 hover:text-point-500 disabled:opacity-40"
            >
              + Add stop
            </button>
            <span
              aria-hidden
              className="h-7 min-w-24 flex-1 rounded border border-zinc-200"
              style={{ background: topBannerBackgroundCss(block) }}
            />
          </div>
          <p className="text-xs text-zinc-400">
            Left to right: 0% is the strip&apos;s left edge, 100% its right.
          </p>
        </div>
      ) : (
        <div className="mt-2">
          <ColorInput
            label="Colour"
            value={block.background}
            onChange={onColorChange}
          />
        </div>
      )}
    </div>
  );
}

/**
 * The header menu's icons: pick a row, then an icon or any uploaded image. The
 * preview in the row is the shared `MenuRowIcon`, i.e. exactly what the header
 * draws.
 */
function MenuIconsEditor({
  rows,
  value,
  onChange,
  onSave,
  saving,
  disabled,
}: {
  rows: { id: string; label: string }[];
  value: MenuIconRecord;
  onChange: (next: MenuIconRecord) => void;
  onSave: () => void;
  saving: boolean;
  disabled: boolean;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  function patchRow(id: string, icon: string, image?: string) {
    onChange({ ...value, [id]: { icon, image } });
  }

  return (
    <section className="rounded-2xl border border-zinc-100 bg-white p-5">
      <h2 className="mb-1 text-sm font-semibold text-zinc-900">Menu icons</h2>
      <p className="mb-4 text-xs text-zinc-400">
        Pick a menu item, then use one of the icons below or upload any image to
        replace it. The preview beside each row is exactly what the header
        draws. Shared by both stores.
      </p>

      <div className="space-y-2">
        {rows.map((row) => {
          const setting = menuIconSetting(row.id, value);
          const fallback = defaultMenuIcon(row.id);
          const open = openId === row.id;
          return (
            <div
              key={row.id}
              className="overflow-hidden rounded-lg border border-zinc-100 bg-zinc-50/60"
            >
              <button
                type="button"
                onClick={() => setOpenId(open ? null : row.id)}
                aria-expanded={open}
                className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-zinc-100/60"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-zinc-500 shadow-sm">
                  <MenuRowIcon setting={setting} />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-zinc-700">
                  {row.label}
                </span>
                <span className="shrink-0 text-xs text-zinc-400">
                  {setting.image
                    ? "Custom image"
                    : MENU_ICON_LABELS[setting.icon]}
                </span>
                <ChevronDown
                  size={16}
                  aria-hidden
                  className={`shrink-0 text-zinc-400 transition-transform ${
                    open ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Hidden rather than unmounted, so a picked-but-unsaved image
                  survives collapsing the row. */}
              <div
                className={
                  open ? "space-y-3 border-t border-zinc-100 p-3" : "hidden"
                }
              >
                <p className="flex items-center gap-2 text-xs text-zinc-500">
                  <span>Default icon</span>
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-zinc-500 shadow-sm">
                    <MenuRowIcon setting={{ icon: fallback, image: null }} />
                  </span>
                  <span className="font-medium text-zinc-600">
                    {MENU_ICON_LABELS[fallback]}
                  </span>
                </p>

                <label className="block">
                  <span className={labelCls}>Icon</span>
                  <select
                    value={setting.icon}
                    onChange={(e) =>
                      patchRow(
                        row.id,
                        e.target.value,
                        setting.image ?? undefined,
                      )
                    }
                    aria-label={`Icon for ${row.label}`}
                    className={inputCls}
                  >
                    {(Object.keys(MENU_ICONS) as MenuIconKey[]).map((key) => (
                      <option key={key} value={key}>
                        {MENU_ICON_LABELS[key]}
                      </option>
                    ))}
                  </select>
                </label>

                <ImageField
                  label="Custom image (optional)"
                  value={setting.image ?? ""}
                  onChange={(image) =>
                    patchRow(row.id, setting.icon, image || undefined)
                  }
                  hint="Replaces the icon for this row. Any image works; it is drawn 15px square, so a simple mark reads best."
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={onSave}
          disabled={disabled}
          className={saveBtnCls}
        >
          {saving ? "Saving…" : "Save menu icons"}
        </button>
      </div>
    </section>
  );
}

/** Editor + live preview for the strips pinned above the header. */
function TopBannerEditor({
  blocks,
  onChange,
  onSave,
  saving,
  disabled,
}: {
  blocks: TopBannerBlock[];
  onChange: (blocks: TopBannerBlock[]) => void;
  onSave: () => void;
  saving: boolean;
  disabled: boolean;
}) {
  function update(index: number, next: TopBannerBlock) {
    onChange(blocks.map((b, i) => (i === index ? next : b)));
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function add() {
    onChange([
      ...blocks,
      {
        id: newId("b"),
        kind: "text",
        text: "",
        background: "#18181b",
        textColor: "#ffffff",
      },
    ]);
  }

  /** The fields that survive a block's type switch (text ⇄ image). */
  function backgroundOf(block: TopBannerBlock) {
    return {
      background: block.background,
      backgroundType: block.backgroundType,
      gradientStops: block.gradientStops,
    };
  }

  function setBackgroundType(
    index: number,
    block: TopBannerBlock,
    backgroundType: "solid" | "gradient",
  ) {
    // Switching to a gradient with nothing to draw seeds the brand gradient, so
    // the control never opens on an invisible background.
    const gradientStops =
      backgroundType === "gradient" && (block.gradientStops?.length ?? 0) < 2
        ? GLOBAL_STORE_GRADIENT
        : block.gradientStops;
    update(index, { ...block, backgroundType, gradientStops });
  }

  function updateStops(
    index: number,
    block: TopBannerBlock,
    gradientStops: TopBannerGradientStop[],
  ) {
    update(index, { ...block, gradientStops });
  }

  return (
    <section className="rounded-2xl border border-zinc-100 bg-white p-5">
      <div className="mb-1 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">Top banner</h2>
          <p className="mt-1 text-xs text-zinc-400">
            The strip above the header. It rotates through these blocks every
            2.5s; visitors can close it. Each block is text or an image with its
            own coloured background.
          </p>
        </div>
        <button
          type="button"
          onClick={add}
          className="h-8 shrink-0 rounded border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
        >
          + Add block
        </button>
      </div>

      {blocks.length === 0 && (
        <p className="mt-3 text-sm text-zinc-500">
          No blocks — the banner is hidden.
        </p>
      )}

      <div className="mt-3 space-y-3">
        {blocks.map((block, i) => (
          <div
            key={block.id}
            className="space-y-3 rounded-lg border border-zinc-100 bg-zinc-50/60 p-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label={`Block ${i + 1} type`}
                value={block.kind}
                onChange={(e) =>
                  update(
                    i,
                    e.target.value === "image"
                      ? {
                          id: block.id,
                          kind: "image",
                          image: "",
                          ...backgroundOf(block),
                        }
                      : {
                          id: block.id,
                          kind: "text",
                          text: "",
                          textColor: "#ffffff",
                          ...backgroundOf(block),
                        },
                  )
                }
                className={`${inputCls} w-auto`}
              >
                <option value="text">Text</option>
                <option value="image">Image</option>
              </select>
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                aria-label="Move block up"
                className="h-8 rounded px-2 text-xs text-zinc-500 hover:bg-zinc-100 disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === blocks.length - 1}
                aria-label="Move block down"
                className="h-8 rounded px-2 text-xs text-zinc-500 hover:bg-zinc-100 disabled:opacity-30"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() =>
                  onChange(blocks.filter((_, index) => index !== i))
                }
                className="h-8 rounded px-2 text-xs text-rose-600 hover:bg-rose-50"
              >
                Remove
              </button>
            </div>

            {block.kind === "text" ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className="block">
                  <span className={labelCls}>Text</span>
                  <input
                    value={block.text}
                    onChange={(e) =>
                      update(i, { ...block, text: e.target.value })
                    }
                    className={inputCls}
                  />
                </label>
                <ColorInput
                  label="Text colour"
                  value={block.textColor}
                  onChange={(textColor) => update(i, { ...block, textColor })}
                />
                <label className="block">
                  <span className={labelCls}>Link (optional)</span>
                  <input
                    value={block.href ?? ""}
                    onChange={(e) =>
                      update(i, { ...block, href: e.target.value || undefined })
                    }
                    placeholder="/category/skin-care"
                    className={inputCls}
                  />
                </label>
                <div className="sm:col-span-2 lg:col-span-4">
                  <BackgroundField
                    id={`block-${block.id}`}
                    block={block}
                    onTypeChange={(type) => setBackgroundType(i, block, type)}
                    onColorChange={(background) =>
                      update(i, { ...block, background })
                    }
                    onStopsChange={(stops) => updateStops(i, block, stops)}
                  />
                </div>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <ImageField
                    label="Image"
                    value={block.image}
                    onChange={(image) => update(i, { ...block, image })}
                    hint="Shown at the strip's height, centered."
                  />
                </div>
                <label className="block">
                  <span className={labelCls}>Link (optional)</span>
                  <input
                    value={block.href ?? ""}
                    onChange={(e) =>
                      update(i, { ...block, href: e.target.value || undefined })
                    }
                    placeholder="/category/skin-care"
                    className={inputCls}
                  />
                </label>
                <BackgroundField
                  id={`block-${block.id}`}
                  block={block}
                  onTypeChange={(type) => setBackgroundType(i, block, type)}
                  onColorChange={(background) =>
                    update(i, { ...block, background })
                  }
                  onStopsChange={(stops) => updateStops(i, block, stops)}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {blocks.length > 0 && (
        <div className="mt-4">
          <span className={labelCls}>Preview</span>
          <div className="overflow-hidden rounded-lg border border-zinc-200">
            {blocks.map((block) => (
              <div
                key={block.id}
                className="flex h-[34px] items-center justify-center text-center text-xs font-medium"
                style={{
                  background: topBannerBackgroundCss(block),
                  color: block.kind === "text" ? block.textColor : "#ffffff",
                }}
              >
                {block.kind === "text" ? (
                  <span>{block.text || "(empty)"}</span>
                ) : block.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={block.image}
                    alt=""
                    className="h-[34px] w-auto object-contain"
                  />
                ) : (
                  <span>(no image yet)</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4">
        <button
          type="button"
          onClick={onSave}
          disabled={disabled}
          className={saveBtnCls}
        >
          {saving ? "Saving…" : "Save top banner"}
        </button>
      </div>
    </section>
  );
}

/** Editor + live preview for the store-picker popup (shared by both stores). */
function StorePickerEditor({
  content,
  onChange,
  onSave,
  saving,
  disabled,
}: {
  content: SwitcherContent;
  onChange: (c: SwitcherContent) => void;
  onSave: () => void;
  saving: boolean;
  disabled: boolean;
}) {
  function updateBlock(index: number, patchBlock: Partial<SwitcherBlock>) {
    onChange({
      ...content,
      blocks: content.blocks.map((b, i) =>
        i === index ? { ...b, ...patchBlock } : b,
      ),
    });
  }

  return (
    <section className="rounded-2xl border border-zinc-100 bg-white p-5">
      <h2 className="mb-1 text-sm font-semibold text-zinc-900">Store picker</h2>
      <p className="mb-4 text-xs text-zinc-400">
        The popup shown when a visitor opens the store switcher. It describes
        both stores, so this one editor applies to both sites.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={labelCls}>Title</span>
          <input
            value={content.title}
            onChange={(e) => onChange({ ...content, title: e.target.value })}
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className={labelCls}>Subtitle (optional)</span>
          <input
            value={content.subtitle ?? ""}
            onChange={(e) =>
              onChange({ ...content, subtitle: e.target.value || undefined })
            }
            className={inputCls}
          />
        </label>
      </div>

      <div className="mt-4 space-y-3">
        {/* The long logo that leads product titles on the International store. */}
        <ImageField
          label="Product-title logo (International store)"
          value={content.brandLogo}
          onChange={(brandLogo) => onChange({ ...content, brandLogo })}
          hint="Shown before the names of products also available on the K-Drop store. Upload the wide K-Drop logo (1034×196). Empty falls back to the bundled file."
        />
        {content.blocks.map((block, i) => (
          <div
            key={block.id}
            className="space-y-3 rounded-lg border border-zinc-100 bg-zinc-50/60 p-3"
          >
            <div className="flex items-center gap-2">
              <span className="rounded bg-white px-2 py-0.5 text-xs font-semibold text-zinc-600">
                {block.store === "local" ? "India card" : "International card"}
              </span>
              <span className="text-xs text-zinc-400">
                switches the visitor to the{" "}
                {block.store === "local" ? "India" : "international"} store
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className={labelCls}>Title</span>
                <input
                  value={block.title}
                  onChange={(e) => updateBlock(i, { title: e.target.value })}
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className={labelCls}>Description</span>
                <input
                  value={block.description}
                  onChange={(e) =>
                    updateBlock(i, { description: e.target.value })
                  }
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className={labelCls}>Currency</span>
                <input
                  value={block.currency}
                  onChange={(e) => updateBlock(i, { currency: e.target.value })}
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className={labelCls}>Badge (optional)</span>
                <input
                  value={block.badge ?? ""}
                  onChange={(e) =>
                    updateBlock(i, { badge: e.target.value || undefined })
                  }
                  placeholder="Recommended"
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className={labelCls}>Button label</span>
                <input
                  value={block.ctaLabel}
                  onChange={(e) => updateBlock(i, { ctaLabel: e.target.value })}
                  className={inputCls}
                />
              </label>
              <ColorInput
                label="Accent colour"
                value={block.accent}
                onChange={(accent) => updateBlock(i, { accent })}
              />
            </div>
            <ImageField
              label="Store flag / logo (optional)"
              value={block.icon ?? ""}
              onChange={(icon) => updateBlock(i, { icon: icon || undefined })}
              hint="Small flag or brand mark shown beside the store name (e.g. the India flag)."
            />
            <ImageField
              label="Title image (optional)"
              value={block.titleImage ?? ""}
              onChange={(titleImage) =>
                updateBlock(i, { titleImage: titleImage || undefined })
              }
              hint="Shown instead of the store name — e.g. the KDrop wordmark on the international card."
            />
            <ImageField
              label="Card image (optional)"
              value={block.image ?? ""}
              onChange={(image) =>
                updateBlock(i, { image: image || undefined })
              }
              hint="Wide banner image shown at the top of the card."
            />
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-lg border border-zinc-100 bg-zinc-50/60 p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-zinc-700">Store hint</p>
            <p className="text-xs text-zinc-400">
              The bobbing badge above the store control on the storefront.
            </p>
          </div>
          <label className="flex shrink-0 items-center gap-2 text-xs font-medium text-zinc-600">
            <input
              type="checkbox"
              checked={content.nudge.enabled}
              onChange={(e) =>
                onChange({
                  ...content,
                  nudge: { ...content.nudge, enabled: e.target.checked },
                })
              }
              className="h-4 w-4 accent-point-500"
            />
            Show
          </label>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>Arrow icon</span>
            <select
              value={content.nudge.icon}
              disabled={Boolean(content.nudge.image)}
              onChange={(e) =>
                onChange({
                  ...content,
                  nudge: {
                    ...content.nudge,
                    icon: e.target.value as SwitcherNudgeIcon,
                  },
                })
              }
              className={`${inputCls} disabled:bg-zinc-100 disabled:text-zinc-400`}
            >
              <option value="chevron">Chevron down</option>
              <option value="arrow">Arrow down</option>
              <option value="pointer">Click pointer</option>
              <option value="sparkle">Sparkle</option>
            </select>
          </label>
          <label className="block">
            <span className={labelCls}>Text (optional)</span>
            <input
              value={content.nudge.text}
              onChange={(e) =>
                onChange({
                  ...content,
                  nudge: { ...content.nudge, text: e.target.value },
                })
              }
              placeholder="Choose your store"
              className={inputCls}
            />
          </label>
        </div>

        <div className="mt-3">
          <ImageField
            label="Custom image (optional)"
            value={content.nudge.image}
            onChange={(image) =>
              onChange({ ...content, nudge: { ...content.nudge, image } })
            }
            hint="Shown instead of the arrow icon — a small PNG or SVG works best."
          />
        </div>

        <div className="mt-3 flex items-center gap-3 rounded border border-zinc-100 bg-white px-3 py-3">
          <span className="text-xs text-zinc-400">Preview</span>
          <StoreNudge
            nudge={{ ...content.nudge, enabled: true }}
            animated={false}
            className="text-zinc-700"
          />
        </div>
      </div>

      <div className="mt-4">
        <span className={labelCls}>Preview</span>
        {/* Same panel class as the storefront dropdown, so the preview is the
            exact size of the real thing. */}
        <div className={`${STORE_PICKER_PANEL_CLASS} bg-zinc-50`}>
          <div className="mb-3 px-1 text-center">
            <p className="text-sm font-semibold text-ink">{content.title}</p>
            {content.subtitle && (
              <p className="mt-0.5 text-xs text-[#888]">{content.subtitle}</p>
            )}
          </div>
          <StorePickerCards content={content} activeStore="local" />
        </div>
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={onSave}
          disabled={disabled}
          className={saveBtnCls}
        >
          {saving ? "Saving…" : "Save store picker"}
        </button>
      </div>
    </section>
  );
}

/** Colour swatch + hex input pair, matching the variant editor's control. */
function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      <span className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} swatch`}
          value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#ffffff"}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-10 shrink-0 cursor-pointer rounded border border-zinc-200 bg-white p-1"
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#18181b"
          className={`${inputCls} w-28`}
        />
      </span>
    </label>
  );
}
