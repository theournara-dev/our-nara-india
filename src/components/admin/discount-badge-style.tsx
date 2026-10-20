"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveDiscountBadgeStyle } from "@/app/admin/discounts/actions";
import { inputCls, labelCls } from "@/components/admin/field-styles";
import {
  DEFAULT_DISCOUNT_BADGE_STYLE,
  discountBadgeVars,
  normalizeDiscountBadgeStyle,
  type DiscountBadgeStyle,
} from "@/lib/discount-badge-style";
import { notify } from "@/lib/toast";

/**
 * The sale badge's look: colours, size, weight, radius and padding, with a live
 * preview of the price row it sits in. One style for every badge on the site.
 */
export function DiscountBadgeStyleEditor({
  initial,
  onClose,
}: {
  initial: DiscountBadgeStyle;
  onClose: () => void;
}) {
  const router = useRouter();
  const [style, setStyle] = useState(initial);
  const [pending, startTransition] = useTransition();

  // Normalizing only for the preview keeps every field typeable: an
  // out-of-range number shows at its clamped size, and saving stores that.
  const preview = normalizeDiscountBadgeStyle(style);

  function patch(next: Partial<DiscountBadgeStyle>) {
    setStyle((prev) => ({ ...prev, ...next }));
  }

  /** A field mid-edit can be empty; `type="number"` wants "" not NaN. */
  function numberValue(value: number): string | number {
    return Number.isFinite(value) ? value : "";
  }

  function save(value: DiscountBadgeStyle) {
    startTransition(async () => {
      const toastId = notify.loading("Saving badge style…");
      const res = await saveDiscountBadgeStyle(value);
      if (!res.ok) {
        notify.error(toastId, "Could not save", res.message);
        return;
      }
      notify.success(toastId, "Badge style saved");
      router.refresh();
      onClose();
    });
  }

  return (
    <section className="rounded-2xl border border-zinc-100 bg-white p-5">
      <h2 className="text-sm font-semibold text-zinc-900">Badge style</h2>
      <p className="mt-1 text-xs text-zinc-500">
        One look for every discount badge, on both stores. It sits next to the
        sale price on product cards and product pages.
      </p>

      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>Background</span>
            <span className="flex items-center gap-2">
              <input
                type="color"
                value={style.background}
                onChange={(e) => patch({ background: e.target.value })}
                className="h-9 w-12 rounded border border-zinc-200 bg-white p-1"
              />
              <span className="font-mono text-xs text-zinc-500">
                {style.background}
              </span>
            </span>
          </label>
          <label className="block">
            <span className={labelCls}>Text colour</span>
            <span className="flex items-center gap-2">
              <input
                type="color"
                value={style.color}
                onChange={(e) => patch({ color: e.target.value })}
                className="h-9 w-12 rounded border border-zinc-200 bg-white p-1"
              />
              <span className="font-mono text-xs text-zinc-500">
                {style.color}
              </span>
            </span>
          </label>

          <label className="block">
            <span className={labelCls}>Font size (px)</span>
            <input
              type="number"
              min={8}
              max={24}
              value={numberValue(style.fontSize)}
              onChange={(e) =>
                patch({ fontSize: Number.parseFloat(e.target.value) })
              }
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className={labelCls}>Weight</span>
            <select
              value={style.fontWeight}
              onChange={(e) =>
                patch({ fontWeight: Number.parseInt(e.target.value, 10) })
              }
              className={inputCls}
            >
              <option value={400}>Regular</option>
              <option value={500}>Medium</option>
              <option value={600}>Semibold</option>
              <option value={700}>Bold</option>
              <option value={800}>Extrabold</option>
            </select>
          </label>

          <label className="block">
            <span className={labelCls}>Corner radius (px)</span>
            <input
              type="number"
              min={0}
              max={24}
              value={numberValue(style.radius)}
              onChange={(e) =>
                patch({ radius: Number.parseFloat(e.target.value) })
              }
              className={inputCls}
            />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className={labelCls}>Padding X (px)</span>
              <input
                type="number"
                min={0}
                max={16}
                value={numberValue(style.paddingX)}
                onChange={(e) =>
                  patch({ paddingX: Number.parseFloat(e.target.value) })
                }
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className={labelCls}>Padding Y (px)</span>
              <input
                type="number"
                min={0}
                max={16}
                value={numberValue(style.paddingY)}
                onChange={(e) =>
                  patch({ paddingY: Number.parseFloat(e.target.value) })
                }
                className={inputCls}
              />
            </label>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-4">
          <p className="text-xs font-medium text-zinc-500">Preview</p>
          <div
            style={discountBadgeVars(preview)}
            className="mt-3 rounded-lg bg-white px-4 py-6 text-center"
          >
            <p className="text-[13px] leading-[18.2px] text-[#888]">
              Hydrating serum · 30 ml
            </p>
            <span className="mt-1 inline-flex items-center gap-1.5">
              <span className="text-[18px] font-bold leading-[25.2px] text-black">
                ₩59,000
              </span>
              <span className="discount-badge">−20%</span>
            </span>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => save(style)}
          disabled={pending}
          className="h-9 rounded bg-point-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-point-600 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save style"}
        </button>
        <button
          type="button"
          onClick={() => setStyle(DEFAULT_DISCOUNT_BADGE_STYLE)}
          disabled={pending}
          className="h-9 rounded border border-zinc-200 px-4 text-sm text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-60"
        >
          Reset to default
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={pending}
          className="h-9 rounded border border-zinc-200 px-4 text-sm text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-60"
        >
          Close
        </button>
      </div>
    </section>
  );
}
