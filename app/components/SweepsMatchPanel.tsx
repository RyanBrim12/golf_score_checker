'use client';

import { useEffect, useMemo, useState } from 'react';
import type { SweepsPlayerOption } from '@/lib/types';

interface SweepsMatchPanelProps {
  golfers: SweepsPlayerOption[];
  initialSearch: string;
  onSelect: (sweepsId: number | null) => void;
}

const PAGE_SIZE = 5;
const buttonClass =
  'rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40';

export default function SweepsMatchPanel({ golfers, initialSearch, onSelect }: SweepsMatchPanelProps) {
  const [search, setSearch] = useState(initialSearch);
  const [page, setPage] = useState(0);

  useEffect(() => {
    setSearch(initialSearch);
    setPage(0);
  }, [initialSearch]);

  const filteredGolfers = useMemo(
    () => golfers.filter((golfer) => golfer.playerName.toLowerCase().includes(search.trim().toLowerCase())),
    [golfers, search],
  );
  const totalPages = Math.ceil(filteredGolfers.length / PAGE_SIZE);
  const visibleGolfers = filteredGolfers.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <>
      <label htmlFor="sweepsSearch" className="block text-sm font-medium text-slate-700">
        Search sweeps golfers
      </label>
      <input
        id="sweepsSearch"
        type="search"
        placeholder="John Smith"
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setPage(0);
        }}
        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <ul className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-2 text-sm text-slate-600">
        <li>
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-left hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
          >
            No Match
          </button>
        </li>
        {visibleGolfers.map((golfer) => (
          <li key={golfer.playerId}>
            <button
              type="button"
              onClick={() => onSelect(golfer.playerId)}
              className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-left hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
            >
              {golfer.playerName}{golfer.handicap !== null ? ` (Handicap: ${golfer.handicap})` : ''}
            </button>
          </li>
        ))}
        {filteredGolfers.length === 0 ? (
          <li className="px-2 py-2 text-slate-500">No sweeps golfers found.</li>
        ) : null}
      </ul>
      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-2 pt-1">
          <button type="button" disabled={page === 0} onClick={() => setPage((current) => current - 1)} className={buttonClass}>
            Prev
          </button>
          <span className="text-xs text-slate-500">{page + 1}/{totalPages}</span>
          <button
            type="button"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((current) => current + 1)}
            className={buttonClass}
          >
            Next
          </button>
        </div>
      ) : null}
    </>
  );
}
