'use client';

import { useEffect, useRef, useState } from 'react';
import type { GhinGolfer } from '@/lib/types';

interface ManualMatchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ManualMatchData | null) => void;
  isLoading?: boolean;
  initialValues?: ManualMatchData | null;
}

export interface ManualMatchData {
  firstName: string;
  lastName: string;
  ghinNumber: string;
  state: string;
  club: string;
}

const SEARCH_DEBOUNCE_MS = 500;
const PAGE_SIZE = 5;
const JUMP_SIZE = 20;

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
  const [state, setState] = useState('');
  const [club, setClub] = useState('');
  const [results, setResults] = useState<GhinGolfer[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [remotePage, setRemotePage] = useState(1);
  const [hasMoreRemotePages, setHasMoreRemotePages] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  // Holds the AbortController for the most recent search. Aborted when a new
  // search fires so stale responses never pollute the current result set.
  const abortControllerRef = useRef<AbortController | null>(null);

  const totalPages = Math.ceil(results.length / PAGE_SIZE);
  const showPagination = totalPages > 1 || hasMoreRemotePages;

  const buildSearchBody = (
    fName: string,
    lName: string,
    ghin: string,
    st: string,
    cl: string,
    page: number,
    perPage: number,
  ) => ({
    firstName: fName,
    lastName: lName,
    ghinNumber: ghin,
    state: st,
    club: cl,
    page,
    per_page: perPage,
  });

  const performSearch = async (
    searchFirstName: string,
    searchLastName: string,
    searchGhinNumber: string,
    searchState: string,
    searchClub: string,
  ) => {
    const fName = searchFirstName.trim();
    const lName = searchLastName.trim();
    const ghin  = searchGhinNumber.trim();
    const st    = searchState.trim();
    const cl    = searchClub.trim();

    if (!fName && !lName && !ghin) {
      setResults([]);
      setError(null);
      setCurrentPage(0);
      setRemotePage(1);
      setHasMoreRemotePages(false);
      return;
    }

    // Abort any in-flight fetch and issue a fresh controller for this search.
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsSearching(true);
    setError(null);
    setResults([]);
    setCurrentPage(0);
    setRemotePage(1);
    setHasMoreRemotePages(false);

    try {
      const response = await fetch('/api/ghin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify(buildSearchBody(fName, lName, ghin, st, cl, 1, 100)),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message || 'Failed to fetch GHIN golfers.');
      }

      const golfers: GhinGolfer[] = payload?.golfers ?? [];
      setResults(golfers);

      // Look-ahead: if exactly 100 results came back, query item #101 (page 101 with per_page 1)
      // to definitively check whether a 2nd batch exists before showing '+'.
      if (golfers.length === 100) {
        const lookaheadRes = await fetch('/api/ghin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify(buildSearchBody(fName, lName, ghin, st, cl, 101, 1)),
        });
        if (lookaheadRes.ok) {
          const lookaheadPayload = await lookaheadRes.json();
          setHasMoreRemotePages((lookaheadPayload?.golfers ?? []).length > 0);
        }
      }
    } catch (err) {
      // Silently discard aborted fetches — the user has already started a new search.
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Unknown error occurred.');
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  /**
   * Fetch the next remote page (100 results) and append to `results`.
   *
   * @param skipPageIncrement - When true the automatic currentPage+1 advance is
   *   suppressed. Pass true when calling from jumpForward so the jump can set
   *   its own target page.
   * @returns The newly fetched golfers, so callers can compute a fresh totalPages
   *   without relying on stale React state.
   */
  const fetchNextRemotePage = async (skipPageIncrement = false): Promise<GhinGolfer[]> => {
    setIsFetchingMore(true);
    const nextRemotePage = remotePage + 1;
    const fName = firstName.trim();
    const lName = lastName.trim();
    const ghin  = ghinNumber.trim();
    const st    = state.trim();
    const cl    = club.trim();

    try {
      const response = await fetch('/api/ghin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortControllerRef.current?.signal,
        body: JSON.stringify(buildSearchBody(fName, lName, ghin, st, cl, nextRemotePage, 100)),
      });

      if (!response.ok) {
        setHasMoreRemotePages(false);
        return [];
      }

      const payload = await response.json();
      const golfers: GhinGolfer[] = payload?.golfers ?? [];

      if (golfers.length === 0) {
        setHasMoreRemotePages(false);
        return [];
      }

      setResults(prev => [...prev, ...golfers]);
      setRemotePage(nextRemotePage);

      // Look-ahead: check item #(nextRemotePage * 100 + 1) with per_page 1
      // to accurately verify if yet another remote page exists.
      if (golfers.length === 100) {
        const lookaheadPage = nextRemotePage * 100 + 1;
        const lookaheadRes = await fetch('/api/ghin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: abortControllerRef.current?.signal,
          body: JSON.stringify(buildSearchBody(fName, lName, ghin, st, cl, lookaheadPage, 1)),
        });
        if (lookaheadRes.ok) {
          const lookaheadPayload = await lookaheadRes.json();
          setHasMoreRemotePages((lookaheadPayload?.golfers ?? []).length > 0);
        } else {
          setHasMoreRemotePages(false);
        }
      } else {
        setHasMoreRemotePages(false);
      }

      if (!skipPageIncrement) {
        setCurrentPage(prev => prev + 1);
      }

      return golfers;
    } catch (err) {
      // Silently discard aborted fetches (triggered by a new search).
      if (err instanceof DOMException && err.name === 'AbortError') return [];
      setHasMoreRemotePages(false);
      return [];
    } finally {
      setIsFetchingMore(false);
    }
  };

  const jumpForward = async () => {
    const target = currentPage + JUMP_SIZE;

    if (target < totalPages) {
      setCurrentPage(target);
    } else if (hasMoreRemotePages && !isFetchingMore) {
      const newGolfers = await fetchNextRemotePage(true);
      if (newGolfers.length === 0) {
        setCurrentPage(totalPages - 1);
        return;
      }
      const newTotalPages = Math.ceil((results.length + newGolfers.length) / PAGE_SIZE);
      setCurrentPage(Math.min(target, newTotalPages - 1));
    } else {
      setCurrentPage(totalPages - 1);
    }
  };

  useEffect(() => {
    if (open) {
      setFirstName(initialValues?.firstName ?? '');
      setLastName(initialValues?.lastName ?? '');
      setGhinNumber(initialValues?.ghinNumber ?? '');
      setState(initialValues?.state ?? '');
      setClub(initialValues?.club ?? '');
      setError(null);
      setResults([]);
      setCurrentPage(0);
      setRemotePage(1);
      setHasMoreRemotePages(false);
      setIsFetchingMore(false);
    } else {
      setFirstName('');
      setLastName('');
      setGhinNumber('');
      setState('');
      setClub('');
      setError(null);
      setResults([]);
      setCurrentPage(0);
      setRemotePage(1);
      setHasMoreRemotePages(false);
      setIsFetchingMore(false);
    }
  }, [open, initialValues?.firstName, initialValues?.lastName, initialValues?.ghinNumber, initialValues?.state, initialValues?.club]);

  useEffect(() => {
    if (!open) return;

    const timeoutId = setTimeout(() => {
      void performSearch(firstName, lastName, ghinNumber, state, club);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
  }, [open, firstName, lastName, ghinNumber, state, club]);

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
  };

  const handleSelectResult = (golfer: GhinGolfer | null) => {
    if (golfer === null) {
      onSubmit(null);
    } else {
      onSubmit({
        firstName: golfer.first_name,
        lastName: golfer.last_name,
        ghinNumber: String(golfer.ghin),
        state,
        club,
      });
    }
    handleOpenChange(false);
  };

  if (!open) return null;

  const btnClass =
    'rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40';

  const isLastLocalPage = currentPage >= totalPages - 1;
  const nextDisabled    = (isLastLocalPage && !hasMoreRemotePages) || isFetchingMore;
  const jumpFwdDisabled = (isLastLocalPage && !hasMoreRemotePages) || isFetchingMore;
  const jumpBkDisabled  = currentPage === 0 || isFetchingMore;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-[500px] mx-4">
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
              type="number"
              placeholder="Enter your GHIN number"
              value={ghinNumber}
              onChange={(e) => setGhinNumber(e.target.value)}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          <div className='flex gap-5 mb-5'>
            <div className='w-20'>
              <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                State
              </label>
              <input
                id="state"
                type="text"
                placeholder="State"
                value={state}
                onChange={(e) => setState(e.target.value)}
                disabled={isLoading}
                maxLength={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
            <div className='flex-1'>
              <label htmlFor="club" className="block text-sm font-medium text-gray-700 mb-1">
                Club
              </label>
              <input
                id="club"
                type="text"
                placeholder="Enter club name"
                value={club}
                onChange={(e) => setClub(e.target.value)}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {error ? <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}

          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Select the correct golfer account</p>
            <ul className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3 pr-1 text-sm text-slate-600">
              <li>
                <button
                  type="button"
                  onClick={() => handleSelectResult(null)}
                  className="w-full rounded border border-slate-200 bg-white px-3 py-2 text-left transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                >
                  No Match
                </button>
              </li>
              {!isSearching
                ? results.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE).map((golfer, index) => (
                    <li key={`${golfer.ghin}-${index}`}>
                      <button
                        type="button"
                        onClick={() => handleSelectResult(golfer)}
                        className="w-full rounded border border-slate-200 bg-white px-3 py-2 text-left transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                      >
                        {golfer.first_name} {golfer.last_name} ({golfer.ghin}) {golfer.club_name}
                      </button>
                    </li>
                  ))
                : <li className='text-sm text-slate-500'>Searching...</li>
              }
            </ul>

            {showPagination && (
              <div className="flex items-center justify-between pt-1 gap-1">
                {/* Jump back 20 */}
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.max(0, p - JUMP_SIZE))}
                  disabled={jumpBkDisabled}
                  className={btnClass}
                >
                  ⟨⟨ -{JUMP_SIZE}
                </button>

                {/* Prev */}
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                  disabled={jumpBkDisabled}
                  className={btnClass}
                >
                  ← Prev
                </button>

                {/* Page counter */}
                <span className="text-xs text-slate-500 shrink-0">
                  Page {currentPage + 1} of {totalPages}{hasMoreRemotePages ? '+' : ''}
                </span>

                {/* Next — shows spinner while fetching the next remote batch */}
                <button
                  type="button"
                  onClick={() => {
                    if (isLastLocalPage && hasMoreRemotePages && !isFetchingMore) {
                      void fetchNextRemotePage();
                    } else {
                      setCurrentPage(p => Math.min(totalPages - 1, p + 1));
                    }
                  }}
                  disabled={nextDisabled}
                  className={btnClass}
                >
                  {isFetchingMore ? (
                    <span className="inline-flex items-center gap-1">
                      <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      Loading
                    </span>
                  ) : 'Next →'}
                </button>

                {/* Jump forward 20 */}
                <button
                  type="button"
                  onClick={() => void jumpForward()}
                  disabled={jumpFwdDisabled}
                  className={btnClass}
                >
                  +{JUMP_SIZE} ⟩⟩
                </button>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-6">
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
