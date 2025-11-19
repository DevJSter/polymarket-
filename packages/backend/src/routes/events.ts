import { Router } from 'express';
import { indexer } from '../services/indexer';

export const eventsRouter = Router();

// Get all trades
eventsRouter.get('/trades', (req, res) => {
  try {
    const { market, limit = '100' } = req.query;
    
    let trades = indexer.getTrades(market as string);
    
    // Apply limit
    const limitNum = parseInt(limit as string);
    trades = trades.slice(-limitNum);

    res.json({
      success: true,
      count: trades.length,
      trades: trades.map(trade => ({
        ...trade,
        traderShort: `${trade.trader.slice(0, 6)}...${trade.trader.slice(-4)}`,
        amountInFormatted: formatUSDC(trade.amountIn),
        amountOutFormatted: formatUSDC(trade.amountOut),
        type: trade.buyYes ? 'BUY_YES' : 'BUY_NO',
      })),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trades',
    });
  }
});

// Get global stats
eventsRouter.get('/stats', (req, res) => {
  try {
    const stats = indexer.getStats();

    res.json({
      success: true,
      stats: {
        ...stats,
        totalVolumeFormatted: formatUSDC(stats.totalVolume),
        totalLiquidityFormatted: formatUSDC(stats.totalLiquidity),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stats',
    });
  }
});

function formatUSDC(amount: string): string {
  const num = Number(amount) / 1e6;
  return num.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
