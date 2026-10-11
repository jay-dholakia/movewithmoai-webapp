"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, RefreshCw } from "lucide-react";
import { AdminService } from "@/lib/services/adminService";
import type { FocusSlugStat } from "@/lib/types/admin";
import { cn } from "@/lib/utils";

type RangeKey = "7d" | "30d" | "90d" | "all";
type ViewKey = "moai" | "coach";

const RANGES: { key: RangeKey; label: string; days: number | null }[] = [
  { key: "7d", label: "7 days", days: 7 },
  { key: "30d", label: "30 days", days: 30 },
  { key: "90d", label: "90 days", days: 90 },
  { key: "all", label: "All time", days: null },
];

/** Shared metric shape for both the per-moai and per-coach views. */
interface Row {
  key: string;
  title: string;
  subtitle: string | null;
  inactive: boolean;
  moaiCount: number;
  uses: number;
  linkOpens: number;
  codesEntered: number;
  appStoreClicks: number;
  playStoreClicks: number;
  joinTaps: number;
  joins: number;
  usersLeft: number;
  lastEventAt: string | null;
}

type SortKey =
  | "title"
  | "uses"
  | "linkOpens"
  | "codesEntered"
  | "storeClicks"
  | "joinTaps"
  | "joins"
  | "conversion"
  | "usersLeft"
  | "lastEventAt";

function conversion(row: Pick<Row, "joins" | "uses">): number | null {
  return row.uses > 0 ? row.joins / row.uses : null;
}

function formatPct(value: number | null): string {
  return value === null ? "—" : `${(value * 100).toFixed(value >= 0.1 ? 0 : 1)}%`;
}

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 60) return `${Math.max(mins, 1)}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function toMoaiRow(s: FocusSlugStat): Row {
  return {
    key: s.focus_moai_id,
    title: s.focus_moai_name,
    subtitle: s.join_slug,
    inactive: s.focus_moai_status !== "active",
    moaiCount: 1,
    uses: s.link_opens + s.codes_entered,
    linkOpens: s.link_opens,
    codesEntered: s.codes_entered,
    appStoreClicks: s.app_store_clicks,
    playStoreClicks: s.play_store_clicks,
    joinTaps: s.join_taps,
    joins: s.joins,
    usersLeft: s.users_left,
    lastEventAt: s.last_event_at,
  };
}

function toCoachRows(stats: FocusSlugStat[]): Row[] {
  const byCoach = new Map<string, Row>();
  for (const s of stats) {
    const key = s.coach_id ?? "unassigned";
    const moai = toMoaiRow(s);
    const existing = byCoach.get(key);
    if (!existing) {
      byCoach.set(key, {
        ...moai,
        key,
        title: s.coach_name ?? "Unassigned",
        subtitle: null,
        inactive: false,
      });
      continue;
    }
    existing.moaiCount += 1;
    existing.uses += moai.uses;
    existing.linkOpens += moai.linkOpens;
    existing.codesEntered += moai.codesEntered;
    existing.appStoreClicks += moai.appStoreClicks;
    existing.playStoreClicks += moai.playStoreClicks;
    existing.joinTaps += moai.joinTaps;
    existing.joins += moai.joins;
    existing.usersLeft += moai.usersLeft;
    if (moai.lastEventAt && (!existing.lastEventAt || moai.lastEventAt > existing.lastEventAt)) {
      existing.lastEventAt = moai.lastEventAt;
    }
  }
  return [...byCoach.values()];
}

function sortValue(row: Row, key: SortKey): number | string {
  switch (key) {
    case "title":
      return row.title.toLowerCase();
    case "storeClicks":
      return row.appStoreClicks + row.playStoreClicks;
    case "conversion":
      return conversion(row) ?? -1;
    case "lastEventAt":
      return row.lastEventAt ?? "";
    default:
      return row[key];
  }
}

export default function FocusReferrals() {
  const [range, setRange] = useState<RangeKey>("30d");
  const [view, setView] = useState<ViewKey>("coach");
  const [sortKey, setSortKey] = useState<SortKey>("uses");
  const [sortDesc, setSortDesc] = useState(true);
  const [stats, setStats] = useState<FocusSlugStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const days = RANGES.find((r) => r.key === range)?.days ?? null;
      const from = days === null ? undefined : new Date(Date.now() - days * 86400000);
      setStats(await AdminService.getFocusSlugStats(from));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load stats");
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => {
    const base = view === "coach" ? toCoachRows(stats) : stats.map(toMoaiRow);
    return [...base].sort((a, b) => {
      const av = sortValue(a, sortKey);
      const bv = sortValue(b, sortKey);
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDesc ? -cmp : cmp;
    });
  }, [stats, view, sortKey, sortDesc]);

  const totals = useMemo(() => {
    const t = stats.reduce(
      (acc, s) => {
        acc.uses += s.link_opens + s.codes_entered;
        acc.storeClicks += s.app_store_clicks + s.play_store_clicks;
        acc.joinTaps += s.join_taps;
        acc.joins += s.joins;
        acc.usersLeft += s.users_left;
        return acc;
      },
      { uses: 0, storeClicks: 0, joinTaps: 0, joins: 0, usersLeft: 0 },
    );
    return { ...t, conversion: conversion(t) };
  }, [stats]);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDesc((d) => !d);
    } else {
      setSortKey(key);
      setSortDesc(key !== "title");
    }
  };

  const columns: { key: SortKey; label: string; hint?: string; align?: "left" }[] = [
    { key: "title", label: view === "coach" ? "Coach" : "Focus moai", align: "left" },
    { key: "uses", label: "Uses", hint: "Link opens + codes entered" },
    { key: "linkOpens", label: "Link opens" },
    { key: "codesEntered", label: "Codes" },
    { key: "storeClicks", label: "Store clicks", hint: "App Store / Play Store taps on the web page" },
    { key: "joinTaps", label: "Join taps", hint: "Opened payment" },
    { key: "joins", label: "Joins", hint: "Subscribed via the slug" },
    { key: "conversion", label: "Conversion", hint: "Joins ÷ uses" },
    { key: "usersLeft", label: "Left", hint: "Signed-in users who used the slug but didn't subscribe" },
    { key: "lastEventAt", label: "Last activity" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Focus referrals</h1>
          <p className="mt-1 text-sm text-slate-500">
            How coaches&apos; focus moai links and invite codes are used, and how many turn into joins.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            options={[
              { value: "coach", label: "By coach" },
              { value: "moai", label: "By focus moai" },
            ]}
            value={view}
            onChange={setView}
          />
          <SegmentedControl
            options={RANGES.map((r) => ({ value: r.key, label: r.label }))}
            value={range}
            onChange={setRange}
          />
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            aria-label="Refresh"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 mb-6">
        <SummaryCard label="Uses" value={totals.uses} hint="Link opens + codes" />
        <SummaryCard label="Store clicks" value={totals.storeClicks} hint="From the web page" />
        <SummaryCard label="Join taps" value={totals.joinTaps} hint="Opened payment" />
        <SummaryCard label="Joins" value={totals.joins} hint="Subscribed via slug" accent />
        <SummaryCard label="Conversion" value={formatPct(totals.conversion)} hint="Joins ÷ uses" />
        <SummaryCard label="Left" value={totals.usersLeft} hint="Known users, no join" />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {loading && stats.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e3a8a]" />
          </div>
        ) : error ? (
          <div className="text-center py-16 px-4">
            <p className="text-sm text-red-600">{error}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="mt-3 text-sm text-[#1e3a8a] hover:underline font-medium"
            >
              Try again
            </button>
          </div>
        ) : rows.length === 0 ? (
          <p className="text-center py-16 text-sm text-slate-500">
            No focus moais have a share slug yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {columns.map((col) => {
                    const active = sortKey === col.key;
                    return (
                      <th
                        key={col.key}
                        title={col.hint}
                        className={cn(
                          "px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap",
                          col.align === "left" ? "text-left" : "text-right",
                        )}
                        aria-sort={active ? (sortDesc ? "descending" : "ascending") : undefined}
                      >
                        <button
                          type="button"
                          onClick={() => handleSort(col.key)}
                          className={cn(
                            "inline-flex items-center gap-1 uppercase tracking-wider hover:text-slate-800",
                            active && "text-slate-900",
                          )}
                        >
                          {col.label}
                          {active &&
                            (sortDesc ? (
                              <ArrowDown className="h-3 w-3" />
                            ) : (
                              <ArrowUp className="h-3 w-3" />
                            ))}
                        </button>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => {
                  const idle = row.uses === 0 && row.joins === 0;
                  return (
                    <tr
                      key={row.key}
                      className={cn("hover:bg-slate-50 transition-colors", idle && "text-slate-400")}
                    >
                      <td className="px-4 py-3">
                        <div className={cn("font-medium", idle ? "text-slate-500" : "text-slate-900")}>
                          {row.title}
                          {row.inactive && (
                            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-500">
                              inactive
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 font-mono">
                          {view === "coach"
                            ? `${row.moaiCount} focus moai${row.moaiCount === 1 ? "" : "s"}`
                            : row.subtitle}
                        </div>
                      </td>
                      <NumCell value={row.uses} strong />
                      <NumCell value={row.linkOpens} />
                      <NumCell value={row.codesEntered} />
                      <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">
                        {row.appStoreClicks + row.playStoreClicks}
                        <span className="ml-1 text-xs text-slate-400">
                          ({row.appStoreClicks} iOS / {row.playStoreClicks} Android)
                        </span>
                      </td>
                      <NumCell value={row.joinTaps} />
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-emerald-700">
                        {row.joins || <span className="font-normal text-slate-400">0</span>}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatPct(conversion(row))}</td>
                      <td
                        className={cn(
                          "px-4 py-3 text-right tabular-nums",
                          row.usersLeft > 0 && "text-amber-700",
                        )}
                      >
                        {row.usersLeft}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-slate-500 whitespace-nowrap">
                        {formatRelative(row.lastEventAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="mt-4 text-xs text-slate-500 leading-relaxed">
        Clicks by the focus moai&apos;s own coach aren&apos;t recorded. Link opens and store clicks
        include signed-out visitors, so repeat taps count each time. &ldquo;Left&rdquo; only counts
        signed-in users who used the slug and never subscribed through it.
      </p>
    </div>
  );
}

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5" role="group">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          aria-pressed={opt.value === value}
          className={cn(
            "px-3 py-1.5 text-sm rounded-md transition-colors whitespace-nowrap",
            opt.value === value
              ? "bg-[#1e3a8a] text-white"
              : "text-slate-600 hover:bg-slate-50",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  accent = false,
}: {
  label: string;
  value: number | string;
  hint: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p
        className={cn(
          "mt-1 text-2xl font-semibold tabular-nums",
          accent ? "text-emerald-700" : "text-slate-900",
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 text-xs text-slate-400">{hint}</p>
    </div>
  );
}

function NumCell({ value, strong = false }: { value: number; strong?: boolean }) {
  return (
    <td className={cn("px-4 py-3 text-right tabular-nums", strong && "font-semibold")}>{value}</td>
  );
}
