'use client';

import { Header } from '@/components/Header';
import { use, useState } from 'react';
import { useReadContracts, useWriteContract, useAccount, useWaitForTransactionReceipt } from 'wagmi';
import { contracts, abis } from '@/lib/contracts/addresses';
import { parseUnits, formatUnits } from 'viem';

export default function MarketPage({ params }: { params: Promise<{ address: string }> }) {
  const { address: marketAddress } = use(params);
  const { address: userAddress } = useAccount();
  const [buyAmount, setBuyAmount] = useState('');
  const [buyYes, setBuyYes] = useState(true);
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  // Read market data
  const { data, refetch } = useReadContracts({
    contracts: [
      {
        address: marketAddress as `0x${string}`,
        abi: abis.binaryMarket,
        functionName: 'question',
      },
      {
        address: marketAddress as `0x${string}`,
        abi: abis.binaryMarket,
        functionName: 'endTime',
      },
      {
        address: marketAddress as `0x${string}`,
        abi: abis.binaryMarket,
        functionName: 'getPrice',
        args: [true],
      },
      {
        address: marketAddress as `0x${string}`,
        abi: abis.binaryMarket,
        functionName: 'getPrice',
        args: [false],
      },
      {
        address: marketAddress as `0x${string}`,
        abi: abis.binaryMarket,
        functionName: 'yesReserve',
      },
      {
        address: marketAddress as `0x${string}`,
        abi: abis.binaryMarket,
        functionName: 'noReserve',
      },
      {
        address: marketAddress as `0x${string}`,
        abi: abis.binaryMarket,
        functionName: 'calcBuyAmount',
        args: [buyYes, buyAmount ? parseUnits(buyAmount, 6) : BigInt(0)],
      },
    ],
  });

  const question = data?.[0]?.result as string || '';
  const endTime = Number(data?.[1]?.result || 0);
  const yesPrice = Number(data?.[2]?.result || 0);
  const noPrice = Number(data?.[3]?.result || 0);
  const yesReserve = Number(data?.[4]?.result || 0);
  const noReserve = Number(data?.[5]?.result || 0);
  const expectedTokens = data?.[6]?.result as bigint || BigInt(0);

  const yesProbability = yesPrice > 0 ? (yesPrice / 1e18 * 100).toFixed(2) : '50.00';
  const noProbability = noPrice > 0 ? (noPrice / 1e18 * 100).toFixed(2) : '50.00';
  const totalLiquidity = (yesReserve + noReserve) / 1e6;

  const handleTrade = async () => {
    if (!buyAmount || Number(buyAmount) <= 0) return;

    try {
      // First approve USDC
      writeContract({
        address: contracts.usdc,
        abi: abis.mockUSDC,
        functionName: 'approve',
        args: [marketAddress, parseUnits(buyAmount, 6)],
      });

      // Wait a bit then execute buy
      setTimeout(() => {
        writeContract({
          address: marketAddress as `0x${string}`,
          abi: abis.binaryMarket,
          functionName: 'buy',
          args: [buyYes, parseUnits(buyAmount, 6), BigInt(0)], // 0 min tokens for now
        });
      }, 2000);

      setTimeout(() => refetch(), 4000);
    } catch (error) {
      console.error('Trade failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <Header />
      <main className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Market Header */}
          <div className="rounded-2xl border border-gray-800 bg-gray-800 p-8 shadow-2xl mb-8">
            <h1 className="mb-6 text-3xl font-bold text-white leading-tight">{question}</h1>
            
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-6">
                <div className="text-sm font-medium text-green-400 mb-2">YES</div>
                <div className="text-4xl font-bold text-green-400">{yesProbability}%</div>
              </div>
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-6">
                <div className="text-sm font-medium text-red-400 mb-2">NO</div>
                <div className="text-4xl font-bold text-red-400">{noProbability}%</div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-gray-800 pt-6">
              <div>
                <span className="text-gray-500 text-sm">Total Liquidity</span>
                <div className="text-xl font-bold text-white">${totalLiquidity.toFixed(2)}</div>
              </div>
              <div className="text-right">
                <span className="text-gray-500 text-sm">Ends</span>
                <div className="text-xl font-bold text-white">
                  {new Date(endTime * 1000).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>

          {/* Trading Form */}
          <div className="rounded-2xl border border-gray-800 bg-gray-800 p-8 shadow-2xl">
            <h2 className="mb-6 text-2xl font-bold text-white">Trade</h2>
            
            {!userAddress ? (
              <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-6 text-center">
                <p className="text-yellow-400 font-medium">Please connect your wallet to trade</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Buy/Sell Toggle */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setBuyYes(true)}
                    className={`flex-1 rounded-xl px-6 py-4 font-bold transition-all ${
                      buyYes
                        ? 'bg-green-600 text-white shadow-lg scale-105'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700'
                    }`}
                  >
                    Buy YES
                  </button>
                  <button
                    onClick={() => setBuyYes(false)}
                    className={`flex-1 rounded-xl px-6 py-4 font-bold transition-all ${
                      !buyYes
                        ? 'bg-red-600 text-white shadow-lg scale-105'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700'
                    }`}
                  >
                    Buy NO
                  </button>
                </div>

                {/* Amount Input */}
                <div>
                  <label className="mb-3 block text-sm font-semibold text-gray-300">
                    Amount (USDC)
                  </label>
                  <input
                    type="number"
                    value={buyAmount}
                    onChange={(e) => setBuyAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-gray-700 bg-gray-900 px-6 py-4 text-white text-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>

                {/* Expected Tokens */}
                {buyAmount && Number(buyAmount) > 0 && (
                  <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-blue-400">You will receive</span>
                      <span className="font-bold text-white text-lg">
                        {formatUnits(expectedTokens, 18)} tokens
                      </span>
                    </div>
                  </div>
                )}

                {/* Trade Button */}
                <button
                  onClick={handleTrade}
                  disabled={!buyAmount || Number(buyAmount) <= 0 || isPending || isConfirming}
                  className="w-full rounded-xl px-6 py-4 font-bold text-white text-lg transition-all hover:scale-[1.02] disabled:cursor-not-allowed disabled:shadow-none disabled:scale-100 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700"
                >
                  {isPending || isConfirming ? 'Trading...' : 'Execute Trade'}
                </button>

                {hash && (
                  <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-5 text-center">
                    <p className="text-sm font-medium text-green-400">
                      Transaction submitted! Hash: {hash.slice(0, 10)}...
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
