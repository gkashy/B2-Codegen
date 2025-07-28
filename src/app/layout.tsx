import React from 'react';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AI LeetCode Agent - Watch AI Learn to Code',
  description: 'Experience the future of algorithmic problem-solving with AI that learns from failures and improves in real-time.',
};

export default function RootLayout({
  children,
}: {
  children: any;
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <Providers>
          <div id="root">{children}</div>
        </Providers>
      </body>
    </html>
  );
}