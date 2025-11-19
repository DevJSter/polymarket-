import { Header } from '@/components/Header';

export default function PortfolioPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">Your Portfolio</h1>
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-600">
            Connect your wallet to view your positions and trading history
          </p>
        </div>
      </main>
    </div>
  );
}
