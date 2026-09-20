import type {Metadata, Viewport} from 'next';
import { Inter } from 'next/font/google';
import './globals.css'; // Global styles

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: 'Travel Care Tours - Itinerary Planner',
  description: 'Professional multi-page PDF itinerary generator with customizable activities, accommodation tables, and Kerala travel design.',
  openGraph: {
    title: 'Travel Care Tours - Itinerary Planner',
    description: 'Professional multi-page PDF itinerary generator with customizable activities, accommodation tables, and Kerala travel design.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Travel Care Tours - Itinerary Planner',
    description: 'Professional multi-page PDF itinerary generator with customizable activities, accommodation tables, and Kerala travel design.',
  },
};

import {GlobalErrorHandler} from '@/components/GlobalErrorHandler';

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={inter.className}>
      <body className={`${inter.className} bg-slate-50 text-slate-800 antialiased min-h-screen selection:bg-emerald-100 selection:text-emerald-900`} suppressHydrationWarning>
        <GlobalErrorHandler />
        {children}
      </body>
    </html>
  );
}
