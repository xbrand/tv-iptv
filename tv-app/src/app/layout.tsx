import type { Metadata } from 'next';
import '../styles/globals.css';
import { SpatialNavProvider } from '../lib/spatial-nav-providers';

export const metadata: Metadata = {
  title: 'Cosmos IPTV',
  description: 'Premium IPTV Streaming Experience',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@0..1,C grad@0..-25,opsz@0..24&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-background text-on-surface font-body-md overflow-hidden min-h-screen">
        <SpatialNavProvider>
          {children}
        </SpatialNavProvider>
      </body>
    </html>
  );
}
