import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Vergelijking',
};

export default function VergelijkingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
