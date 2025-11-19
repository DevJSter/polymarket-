// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {MarketFactory} from "../src/MarketFactory.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {BinaryMarket} from "../src/BinaryMarket.sol";

contract SeedMarkets is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        // Get deployed contract addresses from environment or use defaults
        address factoryAddr = vm.envAddress("FACTORY_ADDRESS");
        address usdcAddr = vm.envAddress("USDC_ADDRESS");
        
        console2.log("Seeding markets...");
        console2.log("Factory:", factoryAddr);
        console2.log("USDC:", usdcAddr);
        
        MarketFactory factory = MarketFactory(factoryAddr);
        MockUSDC usdc = MockUSDC(usdcAddr);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Give deployer some USDC
        usdc.faucet();
        
        // Create sample markets
        address market1 = factory.createMarket(
            deployer,
            "Will Bitcoin reach $100,000 by end of 2025?",
            block.timestamp + 365 days
        );
        console2.log("Market 1 created:", market1);
        
        address market2 = factory.createMarket(
            deployer,
            "Will Ethereum reach $10,000 by end of 2025?",
            block.timestamp + 365 days
        );
        console2.log("Market 2 created:", market2);
        
        address market3 = factory.createMarket(
            deployer,
            "Will AI models surpass human performance in all tasks by 2026?",
            block.timestamp + 730 days
        );
        console2.log("Market 3 created:", market3);
        
        // Add liquidity to markets
        uint256 liquidityPerMarket = 10000 * 10**6; // 10k USDC
        
        usdc.approve(market1, liquidityPerMarket);
        BinaryMarket(market1).addLiquidity(liquidityPerMarket);
        console2.log("Added liquidity to Market 1");
        
        usdc.approve(market2, liquidityPerMarket);
        BinaryMarket(market2).addLiquidity(liquidityPerMarket);
        console2.log("Added liquidity to Market 2");
        
        usdc.approve(market3, liquidityPerMarket);
        BinaryMarket(market3).addLiquidity(liquidityPerMarket);
        console2.log("Added liquidity to Market 3");
        
        vm.stopBroadcast();
        
        console2.log("\n=== Markets Created ===");
        console2.log("Total markets:", factory.marketCount());
    }
}
