import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AEGIS — Attack Simulator',
  description: 'Run non-destructive attack simulations against targets to verify vulnerability surface.',
};

export default function SimulateLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
