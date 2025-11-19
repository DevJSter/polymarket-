export const contracts = {
  usdc: '0x5FbDB2315678afecb367f032d93F642f64180aa3' as `0x${string}`,
  marketFactory: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512' as `0x${string}`,
  conditionalTokens: '0xCafac3dD18aC6c6e92c921884f9E4176737C052c' as `0x${string}`,
} as const;

export const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:8545';
export const CHAIN_ID = 31337;

export const MARKET_FACTORY_ABI = [
  {
    "inputs": [],
    "name": "marketCount",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "index", "type": "uint256"}],
    "name": "getMarket",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "market", "type": "address"},
      {"indexed": true, "internalType": "address", "name": "oracle", "type": "address"},
      {"indexed": false, "internalType": "string", "name": "question", "type": "string"},
      {"indexed": false, "internalType": "uint256", "name": "endTime", "type": "uint256"},
      {"indexed": true, "internalType": "uint256", "name": "marketIndex", "type": "uint256"}
    ],
    "name": "MarketCreated",
    "type": "event"
  }
] as const;

export const BINARY_MARKET_ABI = [
  {
    "inputs": [],
    "name": "question",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "endTime",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "oracle",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "yesReserve",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "noReserve",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "bool", "name": "forYes", "type": "bool"}],
    "name": "getPrice",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalLiquidity",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "trader", "type": "address"},
      {"indexed": false, "internalType": "bool", "name": "buyYes", "type": "bool"},
      {"indexed": false, "internalType": "uint256", "name": "amountIn", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "amountOut", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "yesReserve", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "noReserve", "type": "uint256"}
    ],
    "name": "Trade",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "provider", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "liquidity", "type": "uint256"}
    ],
    "name": "LiquidityAdded",
    "type": "event"
  }
] as const;

