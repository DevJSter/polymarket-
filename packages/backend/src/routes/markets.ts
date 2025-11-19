import { Router } from 'express';
import { indexer } from '../services/indexer';

export const marketsRouter = Router();

// Get all markets
marketsRouter.get('/', (req, res) => {
  try {
    const markets = indexer.getMarkets();
    
    // Add computed fields
    const enrichedMarkets = markets.map(market => ({
      ...market,
      yesPercentage: calculatePercentage(market.yesPrice),
      noPercentage: calculatePercentage(market.noPrice),
      totalLiquidityFormatted: formatUSDC(market.totalLiquidity),
      volume24hFormatted: formatUSDC(market.volume24h),
      isActive: Date.now() / 1000 < market.endTime,
    }));

    res.json({
      success: true,
      count: enrichedMarkets.length,
      markets: enrichedMarkets,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch markets',
    });
  }
});

// Get single market
marketsRouter.get('/:address', (req, res) => {
  try {
    const { address } = req.params;
    const market = indexer.getMarket(address);

    if (!market) {
      return res.status(404).json({
        success: false,
        error: 'Market not found',
      });
    }

    const trades = indexer.getTrades(address);

    res.json({
      success: true,
      market: {
        ...market,
        yesPercentage: calculatePercentage(market.yesPrice),
        noPercentage: calculatePercentage(market.noPrice),
        totalLiquidityFormatted: formatUSDC(market.totalLiquidity),
        volume24hFormatted: formatUSDC(market.volume24h),
        isActive: Date.now() / 1000 < market.endTime,
      },
      trades: trades.slice(-100), // Last 100 trades
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch market',
    });
  }
});

// Get market stats
marketsRouter.get('/:address/stats', (req, res) => {
  try {
    const { address } = req.params;
    const market = indexer.getMarket(address);

    if (!market) {
      return res.status(404).json({
        success: false,
        error: 'Market not found',
      });
    }

    const trades = indexer.getTrades(address);
    const priceHistory = calculatePriceHistory(trades);

    res.json({
      success: true,
      stats: {
        tradesCount: market.tradesCount,
        volume24h: market.volume24h,
        volume24hFormatted: formatUSDC(market.volume24h),
        totalLiquidity: market.totalLiquidity,
        totalLiquidityFormatted: formatUSDC(market.totalLiquidity),
        currentYesPrice: calculatePercentage(market.yesPrice),
        currentNoPrice: calculatePercentage(market.noPrice),
        priceHistory,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch market stats',
    });
  }
});

// Helper functions
function calculatePercentage(price: string): number {
  const priceNum = Number(price);
  if (priceNum === 0) return 50;
  return Number((priceNum / 1e18 * 100).toFixed(2));
}

function formatUSDC(amount: string): string {
  const num = Number(amount) / 1e6;
  return num.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function calculatePriceHistory(trades: any[]): any[] {
  // Group by hour and calculate average price
  const history = trades.reduce((acc, trade) => {
    const hour = Math.floor(trade.timestamp / 3600) * 3600;
    if (!acc[hour]) {
      acc[hour] = {
        timestamp: hour,
        yesReserve: trade.yesReserve,
        noReserve: trade.noReserve,
        trades: 0,
      };
    }
    acc[hour].trades++;
    return acc;
  }, {} as Record<number, any>);

  return Object.values(history)
    .map((h: any) => ({
      timestamp: h.timestamp,
      yesPrice: calculatePercentage(
        ((BigInt(h.noReserve) * BigInt(1e18)) / 
         (BigInt(h.yesReserve) + BigInt(h.noReserve))).toString()
      ),
      trades: h.trades,
    }))
    .slice(-24); // Last 24 hours
}
