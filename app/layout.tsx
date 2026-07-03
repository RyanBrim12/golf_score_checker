import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'Golf Score Checker',
  description: 'Club Caddie and GHIN scoreboard dashboard'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
