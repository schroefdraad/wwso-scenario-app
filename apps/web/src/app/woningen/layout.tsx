import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Woningen',
};

export default function WoningenLayout({ children }: { children: React.ReactNode }) {
  return children;
}
