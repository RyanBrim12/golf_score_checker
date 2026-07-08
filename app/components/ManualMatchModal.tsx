'use client';

import { useEffect, useState } from 'react';
import type { GhinGolfer } from '@/lib/types';

interface ManualMatchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ManualMatchData) => void;
  isLoading?: boolean;
  initialValues?: ManualMatchData | null;
}

export interface ManualMatchData {
  firstName: string;
  lastName: string;
  ghinNumber: string;
}

const SEARCH_DEBOUNCE_MS = 400;

export function ManualMatchModal({
  open,
  onOpenChange,
  onSubmit,
  isLoading = false,
  initialValues = null,
}: ManualMatchModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [ghinNumber, setGhinNumber] = useState('');
  const [results, setResults] = useState<GhinGolfer[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const performSearch = async (searchFirstName: string, searchLastName: string, searchGhinNumber: string) => {
    const trimmedFirstName = searchFirstName.trim();
    const trimmedLastName = searchLastName.trim();
    const trimmedGhinNumber = searchGhinNumber.trim();

    if (!trimmedFirstName && !trimmedLastName && !trimmedGhinNumber) {
      setResults([]);
      setError(null);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const response = await fetch('/api/ghin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: trimmedFirstName,
          lastName: trimmedLastName,
          ghinNumber: trimmedGhinNumber,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message || 'Failed to fetch GHIN golfers.');
      }

      setResults(payload?.golfers || []);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unknown error occurred.');
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (open) {
      setFirstName(initialValues?.firstName ?? '');
      setLastName(initialValues?.lastName ?? '');
      setGhinNumber(initialValues?.ghinNumber ?? '');
      setError(null);
      setResults([]);
    } else {
      setFirstName('');
      setLastName('');
      setGhinNumber('');
      setError(null);
      setResults([]);
    }
  }, [open, initialValues?.firstName, initialValues?.lastName, initialValues?.ghinNumber]);

  useEffect(() => {
    if (!open) return;

    const timeoutId = setTimeout(() => {
      void performSearch(firstName, lastName, ghinNumber);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, firstName, lastName, ghinNumber]);

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
  };

  const handleSelectResult = (golfer: GhinGolfer) => {
    onSubmit({
      firstName: golfer.first_name,
      lastName: golfer.last_name,
      ghinNumber: String(golfer.ghin),
    });
    handleOpenChange(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-[425px] mx-4">
        <div className="border-b px-6 py-4">
          <h2 className="text-lg font-semibold">Match GHIN Account</h2>
        </div>

        <div className="p-6 space-y-4">
          <div className='flex gap-5 mb-5'>
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                First Name
              </label>
              <input
                id="firstName"
                type="text"
                placeholder="John"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                Last Name
              </label>
              <input
                id="lastName"
                type="text"
                placeholder="Doe"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label htmlFor="ghinNumber" className="block text-sm font-medium text-gray-700 mb-1">
              GHIN Number
            </label>
            <input
              id="ghinNumber"
              type="text"
              placeholder="Enter your GHIN number"
              value={ghinNumber}
              onChange={(e) => setGhinNumber(e.target.value)}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          {error ? <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}

          {isSearching ? (
            <p className="text-sm text-slate-500">Searching...</p>
          ) : results.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">Select the correct golfer account</p>
              <ul className="max-h-56 space-y-2 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 p-3 pr-1 text-sm text-slate-600">
                {results.map((golfer, index) => (
                  <li key={`${golfer.ghin}-${index}`}>
                    <button
                      type="button"
                      onClick={() => handleSelectResult(golfer)}
                      className="w-full rounded border border-slate-200 bg-white px-3 py-2 text-left transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                    >
                      {golfer.first_name} {golfer.last_name} ({golfer.ghin}) {golfer.club_name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-4 border-t mt-6">
            <button
              type="button"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
