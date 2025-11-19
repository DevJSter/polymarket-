'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import Link from 'next/link';

export function Header() {
  return (
    <header className="border-b border-gray-800 bg-gray-900 backdrop-blur-xl">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-2xl font-bold">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-600">
              <span className="text-white text-lg">P</span>
            </div>
            <span className="text-blue-400">
              Polymarket
            </span>
          </Link>
          <nav className="flex items-center gap-8">
            <Link href="/" className="text-gray-300 hover:text-white transition-colors font-medium">
              Markets
            </Link>
            <Link href="/portfolio" className="text-gray-300 hover:text-white transition-colors font-medium">
              Portfolio
            </Link>
            <ConnectButton />
          </nav>
        </div>
      </div>
    </header>
  );
}
