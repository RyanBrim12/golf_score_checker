'use client';

import { useState } from 'react';
import type { GolferScore } from '@/lib/types';
import type { ManualMatchData } from '../ManualMatchModal';

export function useMatchModal(isViewer: boolean, state: string, club: string) {
  const [open, setOpen] = useState(false);
  const [activeGolfer, setActiveGolfer] = useState<GolferScore | null>(null);
  const [initialValues, setInitialValues] = useState<ManualMatchData | null>(null);
  const [viewerMatchDetail, setViewerMatchDetail] = useState<GolferScore | null>(null);

  const openGolfer = (golfer: GolferScore) => {
    setActiveGolfer(golfer);
    setInitialValues({
      firstName: golfer.matchedFirstName ?? golfer.firstName ?? '',
      lastName: golfer.matchedLastName ?? golfer.lastName ?? '',
      ghinNumber: golfer.ghinNumber ? String(golfer.ghinNumber) : '',
      state: state ?? '',
      club: club ?? '',
    });

    if (isViewer) setViewerMatchDetail(golfer);
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setActiveGolfer(null);
    setInitialValues(null);
    setViewerMatchDetail(null);
  };

  return {
    open,
    activeGolfer,
    initialValues,
    viewerMatchDetail,
    openGolfer,
    close,
  };
}
