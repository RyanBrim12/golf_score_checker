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
      return;
    }

    setIsSearching(true);
    setError(null);
    setResults([]);

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
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (open) {
      const nextFirstName = initialValues?.firstName ?? '';
      const nextLastName = initialValues?.lastName ?? '';
      const nextGhinNumber = initialValues?.ghinNumber ?? '';

      setFirstName(nextFirstName);
      setLastName(nextLastName);
      setGhinNumber(nextGhinNumber);
      setError(null);
      setResults([]);

      if (nextFirstName.trim() || nextLastName.trim() || nextGhinNumber.trim()) {
        void performSearch(nextFirstName, nextLastName, nextGhinNumber);
      }
    } else {
      setFirstName('');
      setLastName('');
      setGhinNumber('');
      setError(null);
      setResults([]);
    }
  }, [open, initialValues?.firstName, initialValues?.lastName, initialValues?.ghinNumber]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim() && !lastName.trim() && !ghinNumber.trim()) {
      alert('Please enter GHIN number, first name, or last name');
      return;
    }

    await performSearch(firstName, lastName, ghinNumber);
  };

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
        {/* Header */}
        <div className="border-b px-6 py-4">
          <h2 className="text-lg font-semibold">Match GHIN Account</h2>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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

          <div className="pt-5 mt-5 border-t-2 border-slate-400">
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

          {results.length > 0 ? (
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
              disabled={isLoading || isSearching}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || isSearching}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed font-medium"
            >
              {isSearching ? 'Searching...' : isLoading ? 'Matching...' : 'Match Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
