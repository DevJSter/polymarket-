import type { Abi } from 'viem';
import MarketFactoryABI from './MarketFactory.json';
import BinaryMarketABI from './BinaryMarket.json';
import MockUSDCABI from './MockUSDC.json';
import ConditionalTokensABI from './ConditionalTokens.json';

export const contracts = {
  usdc: '0x5FbDB2315678afecb367f032d93F642f64180aa3' as `0x${string}`,
  marketFactory: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512' as `0x${string}`,
  conditionalTokens: '0xCafac3dD18aC6c6e92c921884f9E4176737C052c' as `0x${string}`,
} as const;

// Sample market addresses from deployment
export const sampleMarkets = [
  '0x9f1ac54BEF0DD2f6f3462EA0fa94fC62300d3a8e',
  '0xbf9fBFf01664500A33080Da5d437028b07DFcC55',
  '0x93b6BDa6a0813D808d75aA42e900664Ceb868bcF',
] as `0x${string}`[];

export const abis = {
  marketFactory: MarketFactoryABI as Abi,
  binaryMarket: BinaryMarketABI as Abi,
  mockUSDC: MockUSDCABI as Abi,
  conditionalTokens: ConditionalTokensABI as Abi,
};
