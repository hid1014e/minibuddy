import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'minibuddy',
  description: '7日チャレンジ — 仲間の気配を感じながらやり切ろう',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen" style={{ background: '#0a0a1a' }}>
        <div className="max-w-md mx-auto px-4 pb-24">
          {children}
        </div>
      </body>
    </html>
  );
}
