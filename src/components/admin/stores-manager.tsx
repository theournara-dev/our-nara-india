"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronUp, MapPin, Plus, Trash2 } from "lucide-react";
import { deleteStore, moveStore, saveStore } from "@/app/admin/stores/actions";
import {
  DEFAULT_CLOSE,
  DEFAULT_OPEN,
  parseStoreHours,
  storeHoursLines,
  WEEKDAYS,
  type StoreHours,
} from "@/lib/store-hours";
import { isCoordinateQuery, parseMapInput } from "@/lib/store-location";
import { resolveStoreMapQuery, storeMapEmbedUrl } from "@/lib/store-map";
import { notify } from "@/lib/toast";
import type { SiteVersion } from "@/lib/site-version";

export interface AdminStore {
  id: string;
  version: SiteVersion;
  name: string;
  address: string;
  phone: string;
  email: string;
  hours: StoreHours;
  mapQuery: string;
  isActive: boolean;
}

const DAY_LABEL: Record<(typeof WEEKDAYS)[number], string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

const inputCls =
  "h-9 w-full rounded border border-zinc-200 bg-white px-2 text-sm text-zinc-900 outline-none focus:border-point-500";
const labelCls = "mb-1 block text-xs font-medium text-zinc-500";

/**
 * Store list editor: one tab per storefront version, a sortable list, and a
 * form with the map picker (paste a Google Maps link or type an address, with a
 * live preview) and a per-day hours grid. New stores start empty.
 */
export function StoresManager({ stores }: { stores: AdminStore[] }) {
  const [tab, setTab] = useState<SiteVersion>("local");
  const [editing, setEditing] = useState<AdminStore | "new" | null>(null);
  const [pending, startTransition] = useTransition();

  const list = stores
    .filter((s) => s.version === tab)
    .sort((a, b) => a.name.localeCompare(b.name));

  function run(fn: () => Promise<unknown>, loading: string, message: string) {
    startTransition(async () => {
      const id = notify.loading(loading);
      try {
        await fn();
        notify.success(id, message);
      } catch (err) {
        notify.error(
          id,
          "Something went wrong",
          err instanceof Error ? err.message : undefined,
        );
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {(["local", "global"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => {
              setTab(v);
              setEditing(null);
            }}
            className={`cursor-pointer rounded-full border px-4 py-1.5 text-sm transition-colors ${
              tab === v
                ? "border-point-500 bg-point-500 text-white"
                : "border-zinc-200 text-zinc-600 hover:border-point-500 hover:text-point-500"
            }`}
          >
            {v === "local" ? "India (local)" : "Global (KDrop)"}
          </button>
        ))}
      </div>

      <section className="rounded-2xl border border-zinc-100 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">
              Stores on this storefront
            </h2>
            <p className="mt-0.5 text-xs text-zinc-400">
              Shown on /stores. Each store keeps its own address, phone, email,
              hours and map location. New stores start empty.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditing("new")}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded bg-point-500 px-3 text-sm font-medium text-white hover:bg-point-600"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add store
          </button>
        </div>

        {list.length === 0 && (
          <div className="rounded-xl border border-dashed border-zinc-200 p-8 text-center text-sm text-zinc-400">
            No stores yet for this storefront. Add one to show it on /stores.
          </div>
        )}

        <ul className="divide-y divide-zinc-100">
          {list.map((store, index) => (
            <li key={store.id} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-900">
                  {store.name || "(untitled store)"}
                  {!store.isActive && (
                    <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-zinc-500">
                      Hidden
                    </span>
                  )}
                </p>
                <p className="truncate text-xs text-zinc-500">
                  {store.address || "No address yet"}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Move up"
                  disabled={index === 0 || pending}
                  onClick={() =>
                    run(
                      () => moveStore({ id: store.id, direction: "up" }),
                      "Reordering…",
                      "Reordered",
                    )
                  }
                  className="grid h-8 w-8 cursor-pointer place-items-center rounded hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronUp className="h-4 w-4" aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label="Move down"
                  disabled={index === list.length - 1 || pending}
                  onClick={() =>
                    run(
                      () => moveStore({ id: store.id, direction: "down" }),
                      "Reordering…",
                      "Reordered",
                    )
                  }
                  className="grid h-8 w-8 cursor-pointer place-items-center rounded hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronDown className="h-4 w-4" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(store)}
                  className="h-8 cursor-pointer rounded border border-zinc-200 px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Edit
                </button>
                <button
                  type="button"
                  aria-label="Delete store"
                  onClick={() => {
                    if (
                      !window.confirm(
                        `Delete "${store.name || "this store"}"? This cannot be undone.`,
                      )
                    ) {
                      return;
                    }
                    run(
                      () => deleteStore({ id: store.id }),
                      "Deleting…",
                      "Store deleted",
                    );
                  }}
                  className="grid h-8 w-8 cursor-pointer place-items-center rounded text-zinc-400 hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {editing && (
        <StoreEditor
          key={editing === "new" ? "new" : editing.id}
          version={tab}
          store={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function StoreEditor({
  version,
  store,
  onClose,
}: {
  version: SiteVersion;
  store: AdminStore | null;
  onClose: () => void;
}) {
  const [name, setName] = useState(store?.name ?? "");
  const [address, setAddress] = useState(store?.address ?? "");
  const [phone, setPhone] = useState(store?.phone ?? "");
  const [email, setEmail] = useState(store?.email ?? "");
  const [mapQuery, setMapQuery] = useState(store?.mapQuery ?? "");
  const [mapInput, setMapInput] = useState("");
  const [isActive, setIsActive] = useState(store?.isActive ?? true);
  const hours = store?.hours ?? {};
  const [days, setDays] = useState<
    Record<string, { closed: boolean; open: string; close: string }>
  >(() => {
    const out: Record<
      string,
      { closed: boolean; open: string; close: string }
    > = {};
    for (const day of WEEKDAYS) {
      const value = hours[day];
      out[day] = {
        closed: value?.closed ?? true,
        open: value?.open ?? DEFAULT_OPEN,
        close: value?.close ?? DEFAULT_CLOSE,
      };
    }
    return out;
  });
  const [pending, startTransition] = useTransition();

  const previewQuery = resolveStoreMapQuery(mapQuery, address);
  const summary = storeHoursLines(parseStoreHours(days));

  function save() {
    startTransition(async () => {
      const id = notify.loading(store ? "Saving…" : "Adding…");
      try {
        await saveStore({
          ...(store ? { id: store.id } : {}),
          version,
          name,
          address,
          phone,
          email,
          mapQuery,
          hours: days,
          isActive,
        });
        notify.success(id, store ? "Store saved" : "Store added");
        onClose();
      } catch (err) {
        notify.error(
          id,
          "Could not save the store",
          err instanceof Error ? err.message : undefined,
        );
      }
    });
  }

  return (
    <section className="rounded-2xl border border-zinc-100 bg-white p-5">
      <h2 className="mb-4 text-sm font-semibold text-zinc-900">
        {store ? `Edit “${store.name || "store"}”` : "New store"}
      </h2>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <label className="block">
            <span className={labelCls}>Store name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="OURNARA"
              className={inputCls}
            />
          </label>

          <label className="block">
            <span className={labelCls}>Address</span>
            <textarea
              rows={3}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded border border-zinc-200 bg-white px-2 py-2 text-sm text-zinc-900 outline-none focus:border-point-500"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={labelCls}>Phone</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91-88283-38323"
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className={labelCls}>Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="store@example.com"
                className={inputCls}
              />
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 accent-point-500"
            />
            Show this store on /stores
          </label>
        </div>

        {/* Map */}
        <div className="space-y-3">
          <label className="block">
            <span className={labelCls}>Map location</span>
            <input
              value={mapQuery}
              onChange={(e) => setMapQuery(e.target.value)}
              placeholder="Address, place name, or 19.185,72.849"
              className={inputCls}
            />
            <span className="mt-1 block text-[11px] text-zinc-400">
              {isCoordinateQuery(mapQuery)
                ? "Pinned to coordinates"
                : "Google Maps resolves the name or address"}
            </span>
          </label>

          <div className="flex items-end gap-2">
            <label className="block min-w-0 flex-1">
              <span className={labelCls}>
                Paste a Google Maps link to fill it in
              </span>
              <input
                value={mapInput}
                onChange={(e) => setMapInput(e.target.value)}
                placeholder="https://maps.app.goo.gl/…"
                className={inputCls}
              />
            </label>
            <button
              type="button"
              onClick={() => {
                const parsed = parseMapInput(mapInput);
                if (!parsed) {
                  notify.error(
                    notify.loading("Reading the link…"),
                    "Nothing to read from that link",
                  );
                  return;
                }
                setMapQuery(parsed);
                setMapInput("");
                notify.success(
                  notify.loading("Reading the link…"),
                  `Map location set to “${parsed}”`,
                );
              }}
              className="h-9 shrink-0 cursor-pointer rounded border border-zinc-200 px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Use link
            </button>
          </div>

          <div className="relative h-[240px] overflow-hidden rounded-xl border border-zinc-100 bg-zinc-50">
            {previewQuery ? (
              <iframe
                src={storeMapEmbedUrl(previewQuery)}
                title="Map preview"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="absolute inset-0 h-full w-full border-0"
              />
            ) : (
              <p className="grid h-full place-items-center text-xs text-zinc-400">
                <MapPin className="mr-1 inline h-4 w-4" aria-hidden /> Add an
                address or coordinates to preview the map
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Business hours */}
      <div className="mt-5">
        <p className="mb-2 text-sm font-semibold text-zinc-900">
          Business hours
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="rounded-lg border border-zinc-100 px-3 py-2.5"
            >
              <label className="flex items-center gap-2 text-xs font-medium text-zinc-700">
                <input
                  type="checkbox"
                  checked={!days[day].closed}
                  onChange={(e) =>
                    setDays((prev) => ({
                      ...prev,
                      [day]: { ...prev[day], closed: !e.target.checked },
                    }))
                  }
                  className="h-3.5 w-3.5 accent-point-500"
                />
                {DAY_LABEL[day]}
              </label>
              <div className="mt-2 flex items-center gap-1.5">
                <input
                  type="time"
                  value={days[day].open}
                  disabled={days[day].closed}
                  onChange={(e) =>
                    setDays((prev) => ({
                      ...prev,
                      [day]: { ...prev[day], open: e.target.value },
                    }))
                  }
                  className="h-8 w-full rounded border border-zinc-200 px-1.5 text-xs disabled:bg-zinc-50 disabled:text-zinc-300"
                />
                <span className="text-zinc-300">–</span>
                <input
                  type="time"
                  value={days[day].close}
                  disabled={days[day].closed}
                  onChange={(e) =>
                    setDays((prev) => ({
                      ...prev,
                      [day]: { ...prev[day], close: e.target.value },
                    }))
                  }
                  className="h-8 w-full rounded border border-zinc-200 px-1.5 text-xs disabled:bg-zinc-50 disabled:text-zinc-300"
                />
              </div>
            </div>
          ))}
        </div>
        {summary.length > 0 && (
          <p className="mt-2 text-xs text-zinc-500">
            On the store page: {summary.join(" · ")}
          </p>
        )}
      </div>

      <div className="mt-5 flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="h-9 cursor-pointer rounded bg-point-500 px-4 text-sm font-medium text-white hover:bg-point-600 disabled:opacity-60"
        >
          {pending ? "Saving…" : store ? "Save store" : "Add store"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="h-9 cursor-pointer rounded border border-zinc-200 px-4 text-sm text-zinc-600 hover:bg-zinc-50"
        >
          Cancel
        </button>
      </div>
    </section>
  );
}
