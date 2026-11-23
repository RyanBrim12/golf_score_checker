import type { GolferScore } from '@/lib/types';
import GolferScoreCard from './GolferScoreCard';

interface ScoreboardResultsProps {
  golfers: GolferScore[];
  date: string;
  updatingGolferName: string | null;
  onMatchClick: (golfer: GolferScore) => void;
}

export default function ScoreboardResults({
  golfers,
  date,
  updatingGolferName,
  onMatchClick,
}: ScoreboardResultsProps) {
  if (golfers.length === 0) {
    return <p className="mt-6 text-sm text-slate-600">No golfers match your search.</p>;
  }

  return (
    <div className="grid gap-3">
      {golfers.map((golfer) => (
        <GolferScoreCard
          key={golfer.clubCaddieName}
          golfer={golfer}
          date={date}
          isUpdating={golfer.clubCaddieName === updatingGolferName}
          onMatchClick={onMatchClick}
        />
      ))}
    </div>
  );
}
