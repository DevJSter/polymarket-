'use client';

import { useReadContracts } from 'wagmi';
import { contracts, sampleMarkets, abis } from '@/lib/contracts/addresses';
import Link from 'next/link';

export function MarketsList() {
  // Read market count from factory
  const { data: marketCountData } = useReadContracts({
    contracts: [{
      address: contracts.marketFactory,
      abi: abis.marketFactory,
      functionName: 'marketCount',
    }],
  });

  // Read market data for sample markets
  const { data: marketsData } = useReadContracts({
    contracts: sampleMarkets.flatMap((marketAddress) => [
      {
        address: marketAddress,
        abi: abis.binaryMarket,
        functionName: 'question',
      },
      {
        address: marketAddress,
        abi: abis.binaryMarket,
        functionName: 'endTime',
      },
      {
        address: marketAddress,
        abi: abis.binaryMarket,
        functionName: 'getPrice',
        args: [true], // YES price
      },
      {
        address: marketAddress,
        abi: abis.binaryMarket,
        functionName: 'yesReserve',
      },
      {
        address: marketAddress,
        abi: abis.binaryMarket,
        functionName: 'noReserve',
      },
    ]),
  });

  if (!marketsData) {
    return <div className="text-center py-12">Loading markets...</div>;
  }

  // Group data by market (5 fields per market)
  const markets = sampleMarkets.map((address, index) => {
    const baseIndex = index * 5;
    return {
      address,
      question: marketsData[baseIndex]?.result as string || 'Loading...',
      endTime: Number(marketsData[baseIndex + 1]?.result || 0),
      yesPrice: Number(marketsData[baseIndex + 2]?.result || 0),
      yesReserve: Number(marketsData[baseIndex + 3]?.result || 0),
      noReserve: Number(marketsData[baseIndex + 4]?.result || 0),
    };
  });

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {markets.map((market) => {
        const yesProbability = market.yesPrice > 0 
          ? (Number(market.yesPrice) / 1e18 * 100).toFixed(1)
          : '50.0';
        const totalLiquidity = (Number(market.yesReserve) + Number(market.noReserve)) / 1e6;
        const endDate = new Date(market.endTime * 1000);
        
        return (
          <Link
            key={market.address}
            href={`/market/${market.address}`}
            className="group block rounded-2xl border border-gray-800 bg-gray-800 p-6 shadow-xl transition-all hover:border-gray-700 hover:shadow-2xl hover:scale-[1.02]"
          >
            <h3 className="mb-6 text-lg font-semibold text-white leading-tight min-h-14 line-clamp-2">
              {market.question}
            </h3>
            
            <div className="mb-6 space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-green-500/10 border border-green-500/20 p-3">
                <span className="text-sm font-medium text-green-400">YES</span>
                <span className="text-2xl font-bold text-green-400">
                  {yesProbability}%
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-red-500/10 border border-red-500/20 p-3">
                <span className="text-sm font-medium text-red-400">NO</span>
                <span className="text-2xl font-bold text-red-400">
                  {(100 - parseFloat(yesProbability)).toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-gray-800 pt-4">
              <div>
                <div className="text-xs text-gray-500 mb-1">Liquidity</div>
                <div className="font-semibold text-gray-300">${totalLiquidity.toFixed(0)}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500 mb-1">Ends</div>
                <div className="font-semibold text-gray-300">
                  {endDate.toLocaleDateString()}
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
