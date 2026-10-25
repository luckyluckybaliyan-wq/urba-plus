import type {Metadata} from 'next';
import './globals.css'; // Global styles
import { LanguageProvider } from '@/lib/LanguageContext';

export const metadata: Metadata = {
  title: 'Crowd Civic AI Verification',
  description: 'Crowd Civic AI Verification and Resolution System with role-based dashboards.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}

