import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Vault Drive',
  description: 'Secure cloud storage mobile app MVP'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
