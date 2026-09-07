import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Nieuwe Woning',
};

export default function NieuwLayout({ children }: { children: React.ReactNode }) {
  return children;
}
