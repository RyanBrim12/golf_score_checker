import type { GhinGolfer } from '@/lib/types';
import type { useGhinSearch } from './hooks/useGhinSearch';

type GhinSearchState = ReturnType<typeof useGhinSearch>;

interface GhinMatchPanelProps {
  search: GhinSearchState;
  isLoading: boolean;
  onSelect: (golfer: GhinGolfer | null) => void;
}

const buttonClass =
  'rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40';

export default function GhinMatchPanel({ search, isLoading, onSelect }: GhinMatchPanelProps) {
  const jumpBackDisabled = !search.canGoBack || search.isFetchingMore;
  const jumpForwardDisabled = !search.canGoForward || search.isFetchingMore;

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:gap-5">
        <div className="flex-1">
          <label htmlFor="firstName" className="mb-1 block text-sm font-medium text-gray-700">
            First Name
          </label>
          <input
            id="firstName"
            type="text"
            placeholder="John"
            value={search.firstName}
            onChange={(event) => search.setFirstName(event.target.value)}
            disabled={isLoading}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100"
          />
        </div>
        <div className="flex-1">
          <label htmlFor="lastName" className="mb-1 block text-sm font-medium text-gray-700">
            Last Name
          </label>
          <input
            id="lastName"
            type="text"
            placeholder="Doe"
            value={search.lastName}
            onChange={(event) => search.setLastName(event.target.value)}
            disabled={isLoading}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100"
          />
        </div>
      </div>

      <div>
        <label htmlFor="ghinNumber" className="mb-1 block text-sm font-medium text-gray-700">
          GHIN Number
        </label>
        <input
          id="ghinNumber"
          type="number"
          placeholder="Enter your GHIN number"
          value={search.ghinNumber}
          onChange={(event) => search.setGhinNumber(event.target.value)}
          disabled={isLoading}
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100"
        />
      </div>

      <div className="flex gap-3 sm:gap-5">
        <div className="w-16 shrink-0 sm:w-20">
          <label htmlFor="state" className="mb-1 block text-sm font-medium text-gray-700">
            State
          </label>
          <input
            id="state"
            type="text"
            placeholder="ST"
            value={search.state}
            onChange={(event) => search.setState(event.target.value)}
            disabled={isLoading}
            maxLength={2}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100"
          />
        </div>
        <div className="min-w-0 flex-1">
          <label htmlFor="club" className="mb-1 block text-sm font-medium text-gray-700">
            Club
          </label>
          <input
            id="club"
            type="text"
            placeholder="Enter club name"
            value={search.club}
            onChange={(event) => search.setClub(event.target.value)}
            disabled={isLoading}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100"
          />
        </div>
      </div>

      {search.error ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {search.error}
        </p>
      ) : null}

      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-700">Select the correct golfer account</p>
        <ul className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-2 pr-1 text-sm text-slate-600 sm:p-3">
          <li>
            <button
              type="button"
              onClick={() => onSelect(null)}
              className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-left transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 active:bg-blue-50 sm:py-2"
            >
              No Match
            </button>
          </li>
          {!search.isSearching ? (
            search.visibleResults.map((golfer, index) => (
              <li key={`${golfer.ghin}-${index}`}>
                <button
                  type="button"
                  onClick={() => onSelect(golfer)}
                  className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-left transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 active:bg-blue-50 sm:py-2"
                >
                  <span className="block truncate">
                    {golfer.first_name} {golfer.last_name} ({golfer.ghin})
                  </span>
                  <span className="block truncate text-xs text-slate-400 sm:hidden">
                    {golfer.club_name}
                  </span>
                  <span className="hidden sm:inline"> {golfer.club_name}</span>
                </button>
              </li>
            ))
          ) : (
            <li className="text-sm text-slate-500">Searching...</li>
          )}
        </ul>

        {search.showPagination ? (
          <div className="flex items-center justify-between gap-1 pt-1">
            <button
              type="button"
              onClick={() => search.previousPage(20)}
              disabled={jumpBackDisabled}
              className={`hidden sm:inline-flex ${buttonClass}`}
            >
              ⟨⟨ -20
            </button>
            <button
              type="button"
              onClick={() => search.previousPage()}
              disabled={!search.canGoBack}
              className={buttonClass}
            >
              ← Prev
            </button>
            <span className="shrink-0 text-xs text-slate-500">
              {search.currentPage + 1}/{search.totalPages}
              {search.hasMoreRemotePages ? '+' : ''}
            </span>
            <button
              type="button"
              onClick={() => {
                if (search.isLastLocalPage && search.hasMoreRemotePages) {
                  void search.fetchNextRemotePage();
                } else {
                  search.nextPage();
                }
              }}
              disabled={!search.canGoForward}
              className={buttonClass}
            >
              {search.isFetchingMore ? (
                <span className="inline-flex items-center gap-1">
                  <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                  <span className="hidden sm:inline">Loading</span>
                </span>
              ) : (
                <>
                  <span className="sm:hidden">→</span>
                  <span className="hidden sm:inline">Next →</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => void search.jumpForward()}
              disabled={jumpForwardDisabled}
              className={`hidden sm:inline-flex ${buttonClass}`}
            >
              +20 ⟩⟩
            </button>
          </div>
        ) : null}
      </div>
    </>
  );
}
