import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Hagrit',
  description: '7日チャレンジ — 仲間の魔力を感じながらやり切ろう',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body style={{ background: '#1a0a2e', minHeight: '100vh' }}>
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 16px 100px' }}>
          {children}
        </div>
      </body>
    </html>
  );
}
