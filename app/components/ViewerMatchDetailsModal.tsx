import type { GolferScore } from '@/lib/types';

interface ViewerMatchDetailsModalProps {
  open: boolean;
  golfer: GolferScore | null;
  state: string;
  club: string;
  onClose: () => void;
}

export default function ViewerMatchDetailsModal({
  open,
  golfer,
  state,
  club,
  onClose,
}: ViewerMatchDetailsModalProps) {
  if (!open || !golfer) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
      <div className="w-full rounded-t-lg bg-white shadow-lg sm:mx-4 sm:max-w-[500px] sm:rounded-lg">
        <div className="border-b px-4 py-3 sm:px-6 sm:py-4">
          <h2 className="text-base font-semibold sm:text-lg">Match Details</h2>
        </div>
        <div className="space-y-4 p-4 sm:p-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Golfer</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{golfer.clubCaddieName}</p>
          </div>
          <section className="space-y-3 border-t border-slate-200 pt-4">
            <h3 className="text-sm font-semibold text-slate-900">GHIN</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Matched player</p>
                <p className="mt-1 text-sm text-slate-800">
                  {golfer.matchedFirstName && golfer.matchedLastName
                    ? `${golfer.matchedFirstName} ${golfer.matchedLastName}`
                    : 'No match assigned'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">GHIN</p>
                <p className="mt-1 text-sm text-slate-800">{golfer.ghinNumber ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">State</p>
                <p className="mt-1 text-sm text-slate-800">{state || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Club</p>
                <p className="mt-1 text-sm text-slate-800">{club || '—'}</p>
              </div>
            </div>
          </section>
          <section className="space-y-3 border-t border-slate-200 pt-4">
            <h3 className="text-sm font-semibold text-slate-900">Sweeps</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Matched player</p>
                <p className="mt-1 text-sm text-slate-800">{golfer.sweepsPlayerName || 'No match assigned'}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Player ID</p>
                <p className="mt-1 text-sm text-slate-800">{golfer.sweepsPlayerId ?? '—'}</p>
              </div>
            </div>
          </section>
        </div>
        <div className="flex justify-end border-t px-4 py-3 sm:px-6 sm:py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
