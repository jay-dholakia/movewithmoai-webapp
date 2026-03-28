"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { WorkoutProgram, PROGRAMS_PAGE_SIZE } from "./types";

interface ProgramSelectProps {
  value: string;
  onChange: (id: string) => void;
  supabase: any;
}

export function ProgramSelect({
  value,
  onChange,
  supabase,
}: ProgramSelectProps) {
  const [programs, setPrograms] = useState<WorkoutProgram[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedName, setSelectedName] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const loadedRef = useRef(false);

  const fetchPrograms = useCallback(
    async (reset = false) => {
      if (loading) return;
      setLoading(true);
      const currentPage = reset ? 0 : page;
      const from = currentPage * PROGRAMS_PAGE_SIZE;
      const to = from + PROGRAMS_PAGE_SIZE - 1;

      let query = supabase
        .from("workout_programs")
        .select("id, plan_name")
        .order("plan_name", { ascending: true })
        .range(from, to);

      if (search.trim()) {
        query = query.ilike("plan_name", `%${search.trim()}%`);
      }

      const { data, error } = await query;
      if (!error && data) {
        setPrograms((prev) => (reset ? data : [...prev, ...data]));
        setHasMore(data.length === PROGRAMS_PAGE_SIZE);
        if (!reset) setPage(currentPage + 1);
        else setPage(1);
      }
      setLoading(false);
    },
    [page, search, loading, supabase],
  );

  useEffect(() => {
    if (open && !loadedRef.current) {
      loadedRef.current = true;
      fetchPrograms(true);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    loadedRef.current = false;
    setPrograms([]);
    setPage(0);
    setHasMore(true);
    fetchPrograms(true);
  }, [search]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (p: WorkoutProgram) => {
    onChange(p.id);
    setSelectedName(p.plan_name);
    setOpen(false);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 40 && hasMore && !loading) {
      fetchPrograms();
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-left hover:border-[#1e3a8a] focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 transition-colors"
      >
        <span className={value ? "text-slate-800" : "text-slate-400"}>
          {value ? selectedName || "Selected program" : "Select a program..."}
        </span>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <input
              autoFocus
              type="text"
              placeholder="Search programs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20"
            />
          </div>
          <div className="max-h-48 overflow-y-auto" onScroll={handleScroll}>
            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setSelectedName("");
                  setOpen(false);
                }}
                className="w-full px-3 py-2 text-left text-sm text-slate-400 hover:bg-slate-50 border-b border-slate-100"
              >
                — None —
              </button>
            )}
            {programs.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelect(p)}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 transition-colors ${
                  value === p.id
                    ? "bg-blue-50 text-[#1e3a8a] font-medium"
                    : "text-slate-700"
                }`}
              >
                {p.plan_name}
              </button>
            ))}
            {loading && (
              <div className="px-3 py-2 text-xs text-slate-400 text-center">
                Loading...
              </div>
            )}
            {!loading && programs.length === 0 && (
              <div className="px-3 py-4 text-sm text-slate-400 text-center">
                No programs found
              </div>
            )}
            {!loading && hasMore && programs.length > 0 && (
              <div className="px-3 py-2 text-xs text-slate-400 text-center">
                Scroll for more
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
