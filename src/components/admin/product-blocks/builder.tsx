"use client";

import { useState } from "react";
import {
  BLOCK_TYPE_META,
  BLOCK_TYPE_META_BY_TYPE,
  type BlockType,
} from "@/lib/product-blocks/types";
import { BlockConfigForm } from "./block-forms";

export interface BlockDraftState {
  /** Stable client key (new blocks) or the DB id (existing blocks). */
  key: string;
  id?: string;
  type: string;
  title?: string;
  config: Record<string, unknown>;
  isActive: boolean;
}

function metaFor(type: string) {
  return BLOCK_TYPE_META_BY_TYPE[type as BlockType];
}

function newKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `b${Math.random().toString(36).slice(2)}`;
}

/**
 * Ordered builder for a product's DETAIL content blocks. Controlled — the
 * parent product form owns the array and serializes it on submit.
 */
export function BlockBuilder({
  blocks,
  onChange,
}: {
  blocks: BlockDraftState[];
  onChange: (blocks: BlockDraftState[]) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const update = (key: string, patch: Partial<BlockDraftState>) =>
    onChange(blocks.map((b) => (b.key === key ? { ...b, ...patch } : b)));

  const move = (index: number, dir: -1 | 1) => {
    const next = [...blocks];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const remove = (key: string) => onChange(blocks.filter((b) => b.key !== key));

  const add = (type: string) => {
    const meta = metaFor(type);
    if (!meta) return;
    const key = newKey();
    onChange([
      ...blocks,
      {
        key,
        type,
        config: meta.defaultConfig(),
        isActive: true,
      },
    ]);
    setEditing(key);
    setShowAdd(false);
  };

  return (
    <div className="space-y-3">
      {blocks.length === 0 && (
        <p className="rounded border border-dashed border-zinc-200 px-3 py-6 text-center text-sm text-zinc-400">
          No content blocks yet. Add one to build the DETAIL tab.
        </p>
      )}

      {blocks.map((block, i) => {
        const meta = metaFor(block.type);
        const isEditing = editing === block.key;
        return (
          <div
            key={block.key}
            className="rounded-lg border border-zinc-200 bg-white"
          >
            <div className="flex flex-wrap items-center gap-2 px-3 py-2">
              <span className="rounded bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-600">
                {meta?.label ?? block.type}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-zinc-500">
                {block.title || meta?.description}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Move up"
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                  className="h-7 w-7 rounded border border-zinc-200 text-xs text-zinc-600 hover:bg-zinc-100 disabled:opacity-40"
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label="Move down"
                  disabled={i === blocks.length - 1}
                  onClick={() => move(i, 1)}
                  className="h-7 w-7 rounded border border-zinc-200 text-xs text-zinc-600 hover:bg-zinc-100 disabled:opacity-40"
                >
                  ↓
                </button>
                <label className="ml-1 flex items-center gap-1 text-xs text-zinc-500">
                  <input
                    type="checkbox"
                    checked={block.isActive}
                    onChange={(e) =>
                      update(block.key, { isActive: e.target.checked })
                    }
                  />
                  On
                </label>
                <button
                  type="button"
                  onClick={() => setEditing(isEditing ? null : block.key)}
                  className="h-7 rounded border border-zinc-200 px-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
                >
                  {isEditing ? "Done" : "Edit"}
                </button>
                <button
                  type="button"
                  onClick={() => remove(block.key)}
                  className="h-7 rounded border border-zinc-200 px-2 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
            {isEditing && (
              <div className="border-t border-zinc-100 p-3">
                <label className="mb-3 block">
                  <span className="mb-1 block text-xs font-medium text-zinc-500">
                    Admin label (optional)
                  </span>
                  <input
                    value={block.title ?? ""}
                    onChange={(e) =>
                      update(block.key, { title: e.target.value })
                    }
                    placeholder={meta?.label}
                    className="h-9 w-full rounded border border-zinc-200 bg-white px-2 text-sm text-zinc-900 outline-none focus:border-point-500"
                  />
                </label>
                <BlockConfigForm
                  type={block.type}
                  config={block.config}
                  onChange={(config) => update(block.key, { config })}
                />
              </div>
            )}
          </div>
        );
      })}

      {showAdd ? (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-600">
              Choose a block type
            </span>
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="text-xs text-zinc-500 hover:text-zinc-800"
            >
              Cancel
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {BLOCK_TYPE_META.map((m) => (
              <button
                key={m.type}
                type="button"
                onClick={() => add(m.type)}
                className="rounded border border-zinc-200 bg-white px-3 py-2 text-left hover:border-point-500 hover:bg-white"
              >
                <span className="block text-sm font-medium text-zinc-800">
                  {m.label}
                </span>
                <span className="block text-[11px] text-zinc-400">
                  {m.description}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="h-9 rounded border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
        >
          + Add block
        </button>
      )}
    </div>
  );
}
