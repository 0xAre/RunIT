import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How RunIT Works — 7-Stage AI Event Execution',
  description:
    'Pelajari 7-stage workflow RunIT: dari Brief AI satu paragraf hingga Post-Event Report otomatis. Sistem komando event berbasis AI untuk panitia Indonesia.',
  openGraph: {
    title: 'How RunIT Works — AI Event Execution System',
    description:
      'From one paragraph brief to flawless event execution. See how RunIT\'s 7-stage AI workflow eliminates chaos.',
    type: 'website',
  },
};

export default function WorkflowLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
