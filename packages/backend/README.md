# Backend API

Express.js backend for indexing blockchain events and providing a REST API for the Polymarket clone.

## Features

- Event indexing from blockchain
- Market data caching
- Trade history tracking
- Real-time statistics
- RESTful API endpoints

## Setup

```bash
pnpm install
```

## Development

```bash
pnpm dev
```

Server runs on http://localhost:3001

## API Endpoints

### Markets

- `GET /api/markets` - Get all markets
- `GET /api/markets/:address` - Get single market with trades
- `GET /api/markets/:address/stats` - Get market statistics

### Events

- `GET /api/events/trades?market=:address&limit=100` - Get trades
- `GET /api/events/stats` - Get global statistics

### Health

- `GET /health` - Health check

## Example Response

```json
{
  "success": true,
  "count": 3,
  "markets": [
    {
      "address": "0x9f1ac54BEF0DD2f6f3462EA0fa94fC62300d3a8e",
      "question": "Will Bitcoin reach $100,000 by end of 2025?",
      "yesPercentage": 52.5,
      "noPercentage": 47.5,
      "totalLiquidityFormatted": "$10,000.00",
      "volume24hFormatted": "$1,250.00",
      "tradesCount": 15,
      "isActive": true
    }
  ]
}
```

## Environment Variables

See `.env` file for configuration options.
