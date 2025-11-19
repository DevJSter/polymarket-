import { Header } from '@/components/Header';
import { MarketsList } from '@/components/MarketsList';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-950">
      <Header />
      <main className="container mx-auto px-6 py-12">
        <div className="mb-12">
          <h1 className="text-5xl font-bold mb-4 text-blue-400">
            Prediction Markets
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl">
            Trade on the outcome of future events with decentralized prediction markets powered by smart contracts
          </p>
        </div>
        <MarketsList />
      </main>
    </div>
  );
}
