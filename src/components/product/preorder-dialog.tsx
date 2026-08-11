"use client";

import { useState, useTransition } from "react";
import { authClient } from "@/lib/auth-client";
import { notify } from "@/lib/toast";
import { createPreorder } from "@/app/actions/preorders";

/**
 * Pre-order modal shown from the product page. Collects contact + shipping
 * address + quantity and saves the pre-order to the database. Fields are
 * prefilled from the signed-in account when available.
 */
export function PreorderDialog({
  open,
  productId,
  productName,
  priceLabel,
  defaultQty,
  onClose,
}: {
  open: boolean;
  productId: string;
  productName: string;
  priceLabel: string;
  defaultQty: number;
  onClose: () => void;
}) {
  const { data: session } = authClient.useSession();
  const user = session?.user;
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.telephone ?? user?.mobile ?? "");
  const [addressLine1, setAddressLine1] = useState(user?.addressLine1 ?? "");
  const [addressLine2, setAddressLine2] = useState(user?.addressLine2 ?? "");
  const [city, setCity] = useState(user?.city ?? "");
  const [state, setState] = useState(user?.state ?? "");
  const [postal, setPostal] = useState(user?.postal ?? "");
  const [country, setCountry] = useState(user?.country ?? "IN");
  const [qty, setQty] = useState(defaultQty);
  const [submitting, setSubmitting] = useState(false);
  const [pending, startTransition] = useTransition();

  // Prefill from the account once the session loads (adjust state during render
  // so it also works when the session resolves after mount).
  const [prevUser, setPrevUser] = useState(user);
  if (prevUser !== user) {
    setPrevUser(user);
    if (user) {
      setName(user.name ?? "");
      setEmail(user.email ?? "");
      setPhone(user.telephone ?? user.mobile ?? "");
      setAddressLine1(user.addressLine1 ?? "");
      setAddressLine2(user.addressLine2 ?? "");
      setCity(user.city ?? "");
      setState(user.state ?? "");
      setPostal(user.postal ?? "");
      setCountry(user.country ?? "IN");
    }
  }

  if (!open) return null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const id = notify.loading("Placing pre-order…");
    startTransition(async () => {
      try {
        await createPreorder({
          productId,
          name,
          email,
          phone,
          addressLine1,
          addressLine2,
          city,
          state,
          postal,
          country,
          quantity: qty,
        });
        notify.success(
          id,
          "Pre-order received!",
          `We'll contact ${email || "you"} when it ships.`,
        );
        onClose();
      } catch (err) {
        notify.error(
          id,
          "Pre-order failed",
          err instanceof Error ? err.message : "Try again.",
        );
      } finally {
        setSubmitting(false);
      }
    });
  }

  const inputCls =
    "h-10 w-full rounded border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-point-500";
  const labelCls = "mb-1 block text-xs font-medium text-zinc-500";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-zinc-900/50 backdrop-blur-sm"
        onClick={submitting ? undefined : onClose}
        aria-hidden
      />
      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Pre-order"
        className="relative flex max-h-[90vh] w-full max-w-md flex-col rounded-2xl bg-white p-6 shadow-2xl"
      >
        <h3 className="text-lg font-semibold text-zinc-900">Pre-order</h3>
        <p className="mt-1 text-sm text-zinc-500">{productName}</p>
        <p className="mt-1 text-sm font-semibold text-point-500">
          {priceLabel}
        </p>

        <form onSubmit={submit} className="mt-4 space-y-3 overflow-y-auto pr-1">
          {/* Contact */}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={labelCls}>Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className={labelCls}>Phone</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                className={inputCls}
              />
            </label>
          </div>
          <label className="block">
            <span className={labelCls}>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className={inputCls}
            />
          </label>

          {/* Shipping address */}
          <div className="pt-1">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Shipping address
            </p>
            <div className="space-y-3">
              <label className="block">
                <span className={labelCls}>Address line 1</span>
                <input
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  required
                  autoComplete="address-line1"
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className={labelCls}>Address line 2 (optional)</span>
                <input
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  autoComplete="address-line2"
                  className={inputCls}
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className={labelCls}>City</span>
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                    autoComplete="address-level2"
                    className={inputCls}
                  />
                </label>
                <label className="block">
                  <span className={labelCls}>State</span>
                  <input
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    autoComplete="address-level1"
                    className={inputCls}
                  />
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className={labelCls}>Postal code</span>
                  <input
                    value={postal}
                    onChange={(e) => setPostal(e.target.value)}
                    required
                    autoComplete="postal-code"
                    className={inputCls}
                  />
                </label>
                <label className="block">
                  <span className={labelCls}>Country</span>
                  <input
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    required
                    autoComplete="country"
                    className={inputCls}
                  />
                </label>
              </div>
            </div>
          </div>

          <label className="block">
            <span className={labelCls}>Quantity</span>
            <input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
              className={inputCls}
            />
          </label>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting || pending}
              className="h-10 rounded border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || pending}
              className="h-10 flex-1 rounded bg-point-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-point-600 disabled:opacity-60"
            >
              {submitting || pending ? "Placing…" : "Place pre-order"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
