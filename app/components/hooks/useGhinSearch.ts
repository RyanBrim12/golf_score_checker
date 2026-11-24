'use client';

import { useEffect, useRef, useState } from 'react';
import type { GhinMatchData } from '@/lib/dashboardApi';
import { searchGhin } from '@/lib/dashboardApi';
import type { GhinGolfer } from '@/lib/types';

const SEARCH_DEBOUNCE_MS = 500;
const RESULTS_PER_PAGE = 5;
const REMOTE_PAGE_SIZE = 100;
const JUMP_SIZE = 20;

interface UseGhinSearchOptions {
  open: boolean;
  enabled: boolean;
  initialValues: GhinMatchData | null;
}

export function useGhinSearch({ open, enabled, initialValues }: UseGhinSearchOptions) {
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
  const activeControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

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
      activeControllerRef.current?.abort();
      activeControllerRef.current = null;
      requestIdRef.current += 1;
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
      setIsSearching(false);
      setIsFetchingMore(false);
    }
  }, [
    open,
    initialValues?.firstName,
    initialValues?.lastName,
    initialValues?.ghinNumber,
    initialValues?.state,
    initialValues?.club,
  ]);

  useEffect(() => {
    if (!enabled) {
      activeControllerRef.current?.abort();
      activeControllerRef.current = null;
      requestIdRef.current += 1;
      setIsSearching(false);
      setIsFetchingMore(false);
      return;
    }

    const search = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      ghinNumber: ghinNumber.trim(),
      state: state.trim(),
      club: club.trim(),
    };
    const hasSearchTerms = Boolean(search.firstName || search.lastName || search.ghinNumber);

    if (!hasSearchTerms) {
      activeControllerRef.current?.abort();
      activeControllerRef.current = null;
      requestIdRef.current += 1;
      setResults([]);
      setError(null);
      setCurrentPage(0);
      setRemotePage(1);
      setHasMoreRemotePages(false);
      setIsSearching(false);
      setIsFetchingMore(false);
      return;
    }

    const controller = new AbortController();
    const requestId = ++requestIdRef.current;
    activeControllerRef.current?.abort();
    activeControllerRef.current = controller;

    const timeoutId = setTimeout(() => {
      setIsSearching(true);
      setIsFetchingMore(false);
      setError(null);
      setResults([]);
      setCurrentPage(0);
      setRemotePage(1);
      setHasMoreRemotePages(false);

      void (async () => {
        try {
          const golfers = await searchGhin(
            {
              ...search,
              page: 1,
              perPage: REMOTE_PAGE_SIZE,
            },
            controller.signal,
          );

          if (requestId !== requestIdRef.current) return;
          setResults(golfers);

          if (golfers.length === REMOTE_PAGE_SIZE) {
            try {
              const lookahead = await searchGhin(
                {
                  ...search,
                  page: REMOTE_PAGE_SIZE + 1,
                  perPage: 1,
                },
                controller.signal,
              );
              if (requestId === requestIdRef.current) {
                setHasMoreRemotePages(lookahead.length > 0);
              }
            } catch (lookaheadError) {
              if (controller.signal.aborted || requestId !== requestIdRef.current) return;
              setError(
                lookaheadError instanceof Error
                  ? lookaheadError.message
                  : 'Unknown error occurred.',
              );
            }
          }
        } catch (searchError) {
          if (controller.signal.aborted || requestId !== requestIdRef.current) return;
          setError(searchError instanceof Error ? searchError.message : 'Unknown error occurred.');
          setResults([]);
        } finally {
          if (requestId === requestIdRef.current) setIsSearching(false);
        }
      })();
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
      if (activeControllerRef.current === controller) {
        activeControllerRef.current = null;
      }
    };
  }, [enabled, firstName, lastName, ghinNumber, state, club]);

  const fetchNextRemotePage = async (skipPageIncrement = false): Promise<GhinGolfer[]> => {
    const controller = activeControllerRef.current;
    if (!controller || controller.signal.aborted || isFetchingMore) return [];

    const nextRemotePage = remotePage + 1;
    const search = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      ghinNumber: ghinNumber.trim(),
      state: state.trim(),
      club: club.trim(),
    };
    const requestId = requestIdRef.current;
    setIsFetchingMore(true);

    try {
      const golfers = await searchGhin(
        {
          ...search,
          page: nextRemotePage,
          perPage: REMOTE_PAGE_SIZE,
        },
        controller.signal,
      );

      if (requestId !== requestIdRef.current) return [];
      if (golfers.length === 0) {
        setHasMoreRemotePages(false);
        return [];
      }

      setResults((previous) => [...previous, ...golfers]);
      setRemotePage(nextRemotePage);

      if (golfers.length === REMOTE_PAGE_SIZE) {
        const lookahead = await searchGhin(
          {
            ...search,
            page: nextRemotePage * REMOTE_PAGE_SIZE + 1,
            perPage: 1,
          },
          controller.signal,
        );
        if (requestId === requestIdRef.current) {
          setHasMoreRemotePages(lookahead.length > 0);
        }
      } else {
        setHasMoreRemotePages(false);
      }

      if (!skipPageIncrement) setCurrentPage((page) => page + 1);
      return golfers;
    } catch (searchError) {
      if (controller.signal.aborted || requestId !== requestIdRef.current) return [];
      setError(searchError instanceof Error ? searchError.message : 'Unknown error occurred.');
      setHasMoreRemotePages(false);
      return [];
    } finally {
      if (requestId === requestIdRef.current) setIsFetchingMore(false);
    }
  };

  const totalPages = Math.ceil(results.length / RESULTS_PER_PAGE);
  const isLastLocalPage = currentPage >= totalPages - 1;
  const jumpForward = async () => {
    const targetPage = currentPage + JUMP_SIZE;

    if (targetPage < totalPages) {
      setCurrentPage(targetPage);
    } else if (hasMoreRemotePages && !isFetchingMore) {
      const newGolfers = await fetchNextRemotePage(true);
      if (newGolfers.length === 0) {
        setCurrentPage(Math.max(0, totalPages - 1));
        return;
      }
      const newTotalPages = Math.ceil((results.length + newGolfers.length) / RESULTS_PER_PAGE);
      setCurrentPage(Math.min(targetPage, newTotalPages - 1));
    } else {
      setCurrentPage(Math.max(0, totalPages - 1));
    }
  };

  return {
    firstName,
    setFirstName,
    lastName,
    setLastName,
    ghinNumber,
    setGhinNumber,
    state,
    setState,
    club,
    setClub,
    results,
    visibleResults: results.slice(
      currentPage * RESULTS_PER_PAGE,
      (currentPage + 1) * RESULTS_PER_PAGE,
    ),
    isSearching,
    isFetchingMore,
    error,
    currentPage,
    totalPages,
    hasMoreRemotePages,
    showPagination: totalPages > 1 || hasMoreRemotePages,
    isLastLocalPage,
    previousPage: (amount = 1) => setCurrentPage((page) => Math.max(0, page - amount)),
    nextPage: () => setCurrentPage((page) => Math.min(totalPages - 1, page + 1)),
    fetchNextRemotePage,
    jumpForward,
    canGoBack: currentPage > 0 && !isFetchingMore,
    canGoForward: (!isLastLocalPage || hasMoreRemotePages) && !isFetchingMore,
  };
}
