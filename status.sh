#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   Polymarket Clone - Status Check${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Check Anvil
echo -e "${YELLOW}Checking Anvil (Blockchain)...${NC}"
if pgrep -x "anvil" > /dev/null; then
    echo -e "${GREEN}✅ Anvil is running${NC}"
    echo -e "   Process ID: $(pgrep anvil)"
    echo -e "   RPC URL: http://127.0.0.1:8545\n"
else
    echo -e "${RED}❌ Anvil is not running${NC}"
    echo -e "   Start with: anvil\n"
fi

# Check Frontend
echo -e "${YELLOW}Checking Frontend (Next.js)...${NC}"
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null; then
    echo -e "${GREEN}✅ Frontend is running${NC}"
    echo -e "   URL: http://localhost:3000\n"
else
    echo -e "${RED}❌ Frontend is not running${NC}"
    echo -e "   Start with: cd packages/frontend && pnpm dev\n"
fi

# Check Backend
echo -e "${YELLOW}Checking Backend (Express API)...${NC}"
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null; then
    echo -e "${GREEN}✅ Backend is running${NC}"
    echo -e "   API: http://localhost:3001"
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        MARKETS=$(curl -s http://localhost:3001/api/events/stats 2>/dev/null | grep -o '"totalMarkets":[0-9]*' | cut -d':' -f2)
        LIQUIDITY=$(curl -s http://localhost:3001/api/events/stats 2>/dev/null | grep -o '"totalLiquidityFormatted":"[^"]*"' | cut -d'"' -f4)
        echo -e "   Markets: ${MARKETS:-?} | Total Liquidity: ${LIQUIDITY:-?}\n"
    else
        echo -e "   (API not responding)\n"
    fi
else
    echo -e "${RED}❌ Backend is not running${NC}"
    echo -e "   Start with: cd packages/backend && pnpm dev\n"
fi

# Check contract deployments
echo -e "${YELLOW}Checking Contract Deployments...${NC}"
CONTRACTS=(
    "MockUSDC:0x5FbDB2315678afecb367f032d93F642f64180aa3"
    "MarketFactory:0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
    "ConditionalTokens:0xCafac3dD18aC6c6e92c921884f9E4176737C052c"
)

for contract in "${CONTRACTS[@]}"; do
    name="${contract%%:*}"
    address="${contract##*:}"
    code=$(cast code "$address" --rpc-url http://127.0.0.1:8545 2>/dev/null)
    if [ "$code" != "0x" ] && [ -n "$code" ]; then
        echo -e "${GREEN}✅ $name deployed at $address${NC}"
    else
        echo -e "${RED}❌ $name not found at $address${NC}"
    fi
done
echo ""

# Check sample markets
echo -e "${YELLOW}Checking Sample Markets...${NC}"
MARKETS=(
    "0x9f1ac54BEF0DD2f6f3462EA0fa94fC62300d3a8e"
    "0xbf9fBFf01664500A33080Da5d437028b07DFcC55"
    "0x93b6BDa6a0813D808d75aA42e900664Ceb868bcF"
)

for i in "${!MARKETS[@]}"; do
    address="${MARKETS[$i]}"
    code=$(cast code "$address" --rpc-url http://127.0.0.1:8545 2>/dev/null)
    if [ "$code" != "0x" ] && [ -n "$code" ]; then
        echo -e "${GREEN}✅ Market $((i+1)) deployed at $address${NC}"
    else
        echo -e "${RED}❌ Market $((i+1)) not found${NC}"
    fi
done
echo ""

# Test connection
echo -e "${YELLOW}Testing RPC Connection...${NC}"
if curl -s -X POST http://127.0.0.1:8545 \
    -H "Content-Type: application/json" \
    --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' > /dev/null; then
    block=$(cast block-number --rpc-url http://127.0.0.1:8545 2>/dev/null)
    echo -e "${GREEN}✅ RPC connection successful${NC}"
    echo -e "   Current block: $block\n"
else
    echo -e "${RED}❌ Cannot connect to RPC${NC}\n"
fi

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   Quick Commands${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${YELLOW}Start Anvil:${NC}"
echo -e "  anvil"
echo -e ""
echo -e "${YELLOW}Deploy Contracts:${NC}"
echo -e "  cd packages/contracts"
echo -e "  forge script script/Deploy.s.sol:DeployScript --rpc-url http://127.0.0.1:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --broadcast"
echo -e ""
echo -e "${YELLOW}Start Frontend:${NC}"
echo -e "  cd packages/frontend"
echo -e "  pnpm dev"
echo -e ""
echo -e "${YELLOW}Start Backend:${NC}"
echo -e "  cd packages/backend"
echo -e "  pnpm dev"
echo -e ""
echo -e "${YELLOW}Run Tests:${NC}"
echo -e "  cd packages/contracts"
echo -e "  forge test"
echo -e ""
echo -e "${YELLOW}Get Test USDC:${NC}"
echo -e "  cast send 0x5FbDB2315678afecb367f032d93F642f64180aa3 \"faucet()\" --rpc-url http://127.0.0.1:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
echo -e ""
echo -e "${GREEN}Visit: http://localhost:3000${NC}"
echo -e ""
