'use client';

import { useEffect, useState } from 'react';
import type { GhinMatchData } from '@/lib/dashboardApi';
import type { GhinGolfer, SweepsPlayerOption } from '@/lib/types';
import GhinMatchPanel from './GhinMatchPanel';
import SweepsMatchPanel from './SweepsMatchPanel';
import { useGhinSearch } from './hooks/useGhinSearch';

export type ManualMatchData = GhinMatchData;

interface ManualMatchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ManualMatchData | null) => void;
  isLoading?: boolean;
  initialValues?: ManualMatchData | null;
  clubCaddieName?: string;
  sweepsGolfers?: SweepsPlayerOption[];
  initialSweepsId?: number | null;
  onSweepsSubmit?: (sweepsId: number | null) => void;
}

export function ManualMatchModal({
  open,
  onOpenChange,
  onSubmit,
  isLoading = false,
  initialValues = null,
  clubCaddieName = '',
  sweepsGolfers = [],
  initialSweepsId = null,
  onSweepsSubmit,
}: ManualMatchModalProps) {
  const [mode, setMode] = useState<'ghin' | 'sweeps'>('ghin');
  const ghinSearch = useGhinSearch({
    open,
    enabled: open && mode === 'ghin',
    initialValues,
  });

  useEffect(() => {
    if (open) setMode('ghin');
  }, [open]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setMode('ghin');
    onOpenChange(nextOpen);
  };

  const handleGhinSelect = (golfer: GhinGolfer | null) => {
    if (golfer === null) {
      onSubmit(null);
    } else {
      onSubmit({
        firstName: golfer.first_name,
        lastName: golfer.last_name,
        ghinNumber: String(golfer.ghin),
        state: ghinSearch.state,
        club: ghinSearch.club,
      });
    }
    handleOpenChange(false);
  };

  const handleSweepsSelect = (sweepsId: number | null) => {
    onSweepsSubmit?.(sweepsId);
    handleOpenChange(false);
  };

  if (!open) return null;

  const initialSweepsGolfer = sweepsGolfers.find((golfer) => golfer.playerId === initialSweepsId);
  const initialSweepsSearch = initialSweepsGolfer?.playerName ?? clubCaddieName;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black bg-opacity-50 sm:items-center">
      <div className="flex h-[92vh] w-full flex-col rounded-t-lg bg-white shadow-lg sm:mx-4 sm:h-auto sm:max-h-[85vh] sm:max-w-[500px] sm:rounded-lg">
        <div className="shrink-0 border-b px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold sm:text-lg">
              {mode === 'ghin' ? 'Match GHIN Account' : 'Match Sweeps Account'}
            </h2>
            {onSweepsSubmit ? (
              <button
                type="button"
                onClick={() => setMode((current) => current === 'ghin' ? 'sweeps' : 'ghin')}
                className="shrink-0 rounded border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
              >
                {mode === 'ghin' ? '→ Sweeps' : 'GHIN ←'}
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:space-y-4 sm:p-6">
          <div className={mode === 'ghin' ? 'space-y-3 sm:space-y-4' : 'hidden'}>
            <GhinMatchPanel
              search={ghinSearch}
              isLoading={isLoading}
              onSelect={handleGhinSelect}
            />
          </div>
          <div className={mode === 'sweeps' ? 'space-y-3 sm:space-y-4' : 'hidden'}>
            <SweepsMatchPanel
              golfers={sweepsGolfers}
              initialSearch={initialSweepsSearch}
              onSelect={handleSweepsSelect}
            />
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t px-4 py-3 sm:mt-0 sm:border-t-0 sm:px-6 sm:py-4">
          <button
            type="button"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
            className="w-full rounded-md border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 disabled:cursor-not-allowed disabled:bg-gray-100 sm:w-auto"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
