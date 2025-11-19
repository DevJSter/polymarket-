import { createPublicClient, http, parseAbiItem, Log } from 'viem';
import { localhost } from 'viem/chains';
import { contracts, RPC_URL, MARKET_FACTORY_ABI, BINARY_MARKET_ABI } from '../config';

interface MarketData {
  address: string;
  question: string;
  endTime: number;
  oracle: string;
  yesReserve: string;
  noReserve: string;
  yesPrice: string;
  noPrice: string;
  totalLiquidity: string;
  volume24h: string;
  tradesCount: number;
  createdAt: number;
}

interface TradeEvent {
  id: string;
  marketAddress: string;
  trader: string;
  buyYes: boolean;
  amountIn: string;
  amountOut: string;
  yesReserve: string;
  noReserve: string;
  timestamp: number;
  blockNumber: bigint;
  transactionHash: string;
}

class Indexer {
  private client;
  private markets: Map<string, MarketData> = new Map();
  private trades: TradeEvent[] = [];
  private running = false;
  private lastBlock = 0n;

  constructor() {
    this.client = createPublicClient({
      chain: localhost,
      transport: http(RPC_URL),
    });
  }

  isRunning(): boolean {
    return this.running;
  }

  async start() {
    this.running = true;
    console.log('🔍 Starting blockchain indexer...');
    
    // Index existing markets
    await this.indexMarkets();
    
    // Start watching for new events
    this.watchEvents();
    
    console.log(`✅ Indexed ${this.markets.size} markets`);
  }

  async stop() {
    this.running = false;
    console.log('Indexer stopped');
  }

  private async indexMarkets() {
    try {
      // Get market count
      const marketCount = await this.client.readContract({
        address: contracts.marketFactory,
        abi: MARKET_FACTORY_ABI,
        functionName: 'marketCount',
      }) as bigint;

      // Fetch all markets
      for (let i = 0n; i < marketCount; i++) {
        const marketAddress = await this.client.readContract({
          address: contracts.marketFactory,
          abi: MARKET_FACTORY_ABI,
          functionName: 'getMarket',
          args: [i],
        }) as `0x${string}`;

        await this.indexMarket(marketAddress);
      }
    } catch (error) {
      console.error('Error indexing markets:', error);
    }
  }

  private async indexMarket(marketAddress: `0x${string}`) {
    try {
      const [question, endTime, oracle, yesReserve, noReserve, yesPrice, noPrice, totalLiquidity] = 
        await Promise.all([
          this.client.readContract({
            address: marketAddress,
            abi: BINARY_MARKET_ABI,
            functionName: 'question',
          }),
          this.client.readContract({
            address: marketAddress,
            abi: BINARY_MARKET_ABI,
            functionName: 'endTime',
          }),
          this.client.readContract({
            address: marketAddress,
            abi: BINARY_MARKET_ABI,
            functionName: 'oracle',
          }),
          this.client.readContract({
            address: marketAddress,
            abi: BINARY_MARKET_ABI,
            functionName: 'yesReserve',
          }),
          this.client.readContract({
            address: marketAddress,
            abi: BINARY_MARKET_ABI,
            functionName: 'noReserve',
          }),
          this.client.readContract({
            address: marketAddress,
            abi: BINARY_MARKET_ABI,
            functionName: 'getPrice',
            args: [true],
          }),
          this.client.readContract({
            address: marketAddress,
            abi: BINARY_MARKET_ABI,
            functionName: 'getPrice',
            args: [false],
          }),
          this.client.readContract({
            address: marketAddress,
            abi: BINARY_MARKET_ABI,
            functionName: 'totalLiquidity',
          }),
        ]);

      const marketData: MarketData = {
        address: marketAddress,
        question: question as string,
        endTime: Number(endTime),
        oracle: oracle as string,
        yesReserve: (yesReserve as bigint).toString(),
        noReserve: (noReserve as bigint).toString(),
        yesPrice: (yesPrice as bigint).toString(),
        noPrice: (noPrice as bigint).toString(),
        totalLiquidity: (totalLiquidity as bigint).toString(),
        volume24h: '0',
        tradesCount: 0,
        createdAt: Date.now(),
      };

      this.markets.set(marketAddress.toLowerCase(), marketData);
      
      // Index trades for this market
      await this.indexMarketTrades(marketAddress);
    } catch (error) {
      console.error(`Error indexing market ${marketAddress}:`, error);
    }
  }

  private async indexMarketTrades(marketAddress: `0x${string}`) {
    try {
      const logs = await this.client.getLogs({
        address: marketAddress,
        event: parseAbiItem('event Trade(address indexed trader, bool buyYes, uint256 amountIn, uint256 amountOut, uint256 yesReserve, uint256 noReserve)'),
        fromBlock: 0n,
      });

      for (const log of logs) {
        await this.processTrade(log, marketAddress);
      }
    } catch (error) {
      console.error(`Error indexing trades for ${marketAddress}:`, error);
    }
  }

  private async processTrade(log: Log, marketAddress: string) {
    const block = await this.client.getBlock({ blockNumber: log.blockNumber! });
    
    const trade: TradeEvent = {
      id: `${log.transactionHash}-${log.logIndex}`,
      marketAddress: marketAddress.toLowerCase(),
      trader: (log.topics[1] as string).slice(-40),
      buyYes: !!(log.data as any).buyYes,
      amountIn: ((log.data as any).amountIn || 0n).toString(),
      amountOut: ((log.data as any).amountOut || 0n).toString(),
      yesReserve: ((log.data as any).yesReserve || 0n).toString(),
      noReserve: ((log.data as any).noReserve || 0n).toString(),
      timestamp: Number(block.timestamp),
      blockNumber: log.blockNumber!,
      transactionHash: log.transactionHash!,
    };

    this.trades.push(trade);

    // Update market stats
    const market = this.markets.get(marketAddress.toLowerCase());
    if (market) {
      market.tradesCount++;
      
      // Calculate 24h volume
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      const recentTrades = this.trades.filter(
        t => t.marketAddress === marketAddress.toLowerCase() && 
             t.timestamp * 1000 > oneDayAgo
      );
      
      market.volume24h = recentTrades
        .reduce((sum, t) => sum + BigInt(t.amountIn), 0n)
        .toString();
    }
  }

  private watchEvents() {
    // Watch for new trades
    setInterval(async () => {
      if (!this.running) return;
      
      try {
        const currentBlock = await this.client.getBlockNumber();
        if (currentBlock > this.lastBlock) {
          // Re-index to get latest data
          await this.indexMarkets();
          this.lastBlock = currentBlock;
        }
      } catch (error) {
        console.error('Error watching events:', error);
      }
    }, 10000); // Poll every 10 seconds
  }

  getMarkets(): MarketData[] {
    return Array.from(this.markets.values());
  }

  getMarket(address: string): MarketData | undefined {
    return this.markets.get(address.toLowerCase());
  }

  getTrades(marketAddress?: string): TradeEvent[] {
    if (marketAddress) {
      return this.trades.filter(t => t.marketAddress === marketAddress.toLowerCase());
    }
    return this.trades;
  }

  getStats() {
    const totalVolume = this.trades.reduce((sum, t) => sum + BigInt(t.amountIn), 0n);
    const totalLiquidity = Array.from(this.markets.values())
      .reduce((sum, m) => sum + BigInt(m.totalLiquidity), 0n);
    
    return {
      totalMarkets: this.markets.size,
      totalTrades: this.trades.length,
      totalVolume: totalVolume.toString(),
      totalLiquidity: totalLiquidity.toString(),
    };
  }
}

export const indexer = new Indexer();
