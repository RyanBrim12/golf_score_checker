'use client';

import { useMemo, useState } from 'react';
import { ManualMatchModal, type ManualMatchData } from './ManualMatchModal';
import ScoreboardControls from './ScoreboardControls';
import ScoreboardResults from './ScoreboardResults';
import ScoreboardSkeleton from './ScoreboardSkeleton';
import ScoreboardToolbar from './ScoreboardToolbar';
import ViewerMatchDetailsModal from './ViewerMatchDetailsModal';
import { useMatchModal } from './hooks/useMatchModal';
import { useScoreboard } from './hooks/useScoreboard';
import {
  countGolfersWithScores,
  countMatchedGolfers,
  filterGolfers,
  getInitialScoreboardDate,
  sortGolfers,
} from '@/lib/scoreboardView';

interface DashboardProps {
  userRole?: 'viewer' | 'admin' | null;
}

export default function Dashboard({ userRole = null }: DashboardProps) {
  const isViewer = userRole === 'viewer';
  const [date, setDate] = useState(() => getInitialScoreboardDate());
  const [search, setSearch] = useState('');
  const scoreboard = useScoreboard();
  const modal = useMatchModal(isViewer, scoreboard.state, scoreboard.club);

  const filteredScores = useMemo(
    () => filterGolfers(scoreboard.scores ?? [], search),
    [scoreboard.scores, search],
  );
  const sortedScores = useMemo(() => sortGolfers(filteredScores), [filteredScores]);
  const matchedCount = useMemo(
    () => countMatchedGolfers(filteredScores),
    [filteredScores],
  );
  const scoreCount = useMemo(
    () => countGolfersWithScores(filteredScores),
    [filteredScores],
  );

  const handleMatchSubmit = async (data: ManualMatchData | null) => {
    if (!modal.activeGolfer || !date) return;

    const targetName = modal.activeGolfer.clubCaddieName;
    modal.close();
    await scoreboard.submitGhinMatch(targetName, date, data);
  };

  const handleSweepsMatchSubmit = async (sweepsId: number | null) => {
    if (!modal.activeGolfer) return;
    await scoreboard.submitSweepsMatch(modal.activeGolfer.clubCaddieName, date, sweepsId);
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <ScoreboardControls
        date={date}
        loading={scoreboard.loading}
        onDateChange={setDate}
        onFetch={() => void scoreboard.load(date)}
      />

      {scoreboard.error ? (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {scoreboard.error}
        </div>
      ) : null}

      {scoreboard.loading ? (
        <ScoreboardSkeleton />
      ) : scoreboard.scores ? (
        <div className="mt-6">
          <ScoreboardToolbar
            shownCount={filteredScores.length}
            totalCount={scoreboard.scores.length}
            matchedCount={matchedCount}
            scoreCount={scoreCount}
            search={search}
            onSearchChange={setSearch}
          />
          <ScoreboardResults
            golfers={sortedScores}
            date={date}
            updatingGolferName={scoreboard.updatingGolferName}
            onMatchClick={modal.openGolfer}
          />
        </div>
      ) : (
        <p className="mt-6 text-sm text-slate-600">
          Select a date and click Fetch Scores to load the scoreboard.
        </p>
      )}

      <ViewerMatchDetailsModal
        open={modal.open && Boolean(modal.viewerMatchDetail) && isViewer}
        golfer={modal.viewerMatchDetail}
        state={scoreboard.state}
        club={scoreboard.club}
        onClose={modal.close}
      />

      {!isViewer ? (
        <ManualMatchModal
          open={modal.open}
          onOpenChange={(open) => {
            if (!open) modal.close();
          }}
          onSubmit={(data) => void handleMatchSubmit(data)}
          initialValues={modal.initialValues}
          clubCaddieName={modal.activeGolfer?.clubCaddieName}
          sweepsGolfers={scoreboard.sweepsGolfers}
          initialSweepsId={modal.activeGolfer?.sweepsPlayerId}
          onSweepsSubmit={handleSweepsMatchSubmit}
        />
      ) : null}
    </div>
  );
}
