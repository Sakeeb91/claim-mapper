import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Toaster } from 'react-hot-toast';

// Use system fonts for better CI compatibility and faster loading
// Google Fonts can be added via CSS if needed
const fontClassName = 'font-sans';

export const metadata: Metadata = {
  title: 'Claim Mapper - Interactive Knowledge Graph Visualization',
  description: 'Visualize and analyze claims, evidence, and reasoning chains through interactive knowledge graphs.',
  keywords: ['claims', 'knowledge graph', 'visualization', 'reasoning', 'evidence'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={fontClassName}>
        <Providers>
          <div className="flex h-screen bg-background">
            <Sidebar />
            <div className="flex flex-1 flex-col">
              <Header />
              <main className="flex-1 overflow-hidden">
                {children}
              </main>
            </div>
          </div>
          <Toaster position="top-right" />
        </Providers>
      </body>
    </html>
  );
}