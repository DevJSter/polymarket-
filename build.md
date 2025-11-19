# Goal (one sentence)

Create a permissioned or permissionless binary prediction market where users deposit USDC, buy/sell YES/NO shares via an AMM, and markets settle to $1 for winning side after a decentralized oracle finalizes the outcome.

---

# 1 — High-level architecture

* **On-chain core (Solidity)**

  * Market factory: create markets (question metadata, end time, collateral token).
  * Market contract (per question): manages liquidity, minting of two ERC-20 share tokens (YES/NO), AMM swap functions, add/remove liquidity, settlement/redemption.
* **Off-chain services**

  * UI/backend server for indexing events, caching market list, user balances, and handling fiat onramps (optional).
  * Oracle integration agents to submit/verify event outcomes (UMA Optimistic Oracle / Chainlink / manual admin fallback).
* **Frontend**

  * React/Next.js app that talks to wallet (MetaMask / WalletConnect), displays markets, executes swaps & LP actions, shows outcomes and allows redemption.
* **Optional**

  * Liquidation/KYC layer if you restrict access due to regulation.
  * Relayer for gasless UX (meta-tx).

---

# 2 — Market economics & AMM options (tradeoffs)

Two main approaches for binary markets:

### A. Constant Product AMM (CPMM / Uniswap style)

* Treat YES and NO as two ERC-20 tokens held in a pair with invariant `x * y = k`.
* Price moves according to supply imbalance. Easy to implement and composable with existing AMM logic.
* **Pros:** Simple, familiar math, composable liquidity.
* **Cons:** Impermanent loss behavior, not ideal for thin markets (slippage can be large); pricing is not directly probability-preserving without high liquidity.

**Swap math (exact):**
Let `x` = reserve of YES, `y` = reserve of NO, fee `f` (e.g., 0.003). User sends `dx` YES (or buys YES by sending collateral); common pattern is swap collateral ↔ YES/NO pair. For a direct YES↔NO swap: new_x = x + dx*(1-f). New_y = k / new_x. Output `dy = y - new_y`.

You can also implement collateral ↔ YES (mint/burn) via a wrapper, but simplest is to use two share tokens plus collateral pool.

### B. LMSR (Logarithmic Market Scoring Rule)

* Market maker issues unlimited supply; price is derived from `∂C/∂q`, where `C` is cost function (e.g., `C(q_yes,q_no) = b * ln(exp(q_yes/b) + exp(q_no/b))`).
* **Pros:** Smooth price impact, parameters let you control liquidity/fee (via `b`), desirable for low-liquidity markets.
* **Cons:** More math, requires careful token/accounting, and the market maker is effectively subsidizing risk (capital exposure).

**Which to pick?**

* Use **LMSR** for low-liquidity, small markets (elections, special events).
* Use **CPMM** for markets you want composable with DeFi liquidity and external LPs.

---

# 3 — Contract responsibilities (per-market)

* Store market metadata (question text, resolution datetime, oracle address).
* Maintain collateral token (USDC) balance and mints YES/NO ERC-20 share tokens when users buy; burn when sell.
* Provide `buyYes(amountCollateral)` → returns YES tokens (AMM pricing), `sellYes(amountYes)` → returns collateral.
* LP functions: `addLiquidity(collateralYes, collateralNo)` or allow LP via depositing both sides, mint LP token representing share of pool.
* Settlement: after oracle finalizes, markets allow holders of winning token to redeem 1 collateral per token.
* Admin: ability to pause markets, emergency withdraw, but keep minimal to stay trustless.

---

# 4 — Oracle & settlement

* **UMA Optimistic Oracle**: Polymarket used UMA historically; optimistic oracle allows anyone to propose an outcome and be challenged. Good decentralization properties.
* **Chainlink Any API or Chainlink CCIP**: On-chain proven outcomes (but depends on Chainlink coverage).
* **Manual adjudication / multisig fallback**: faster to implement but centralized — only for MVP or closed communities.
* **Flow:** After event time passes, a resolution value is posted to oracle; either gets finalized automatically (if not disputed) or after dispute resolution. The market pulls the final result and flips a `settled` flag; winners redeem.

**Implementation note:** Always store oracle request identifiers on the market so settlement is provable on-chain.

---

# 5 — Example minimal Solidity design (starter)

Below is a compact, **educational** starter contract showing core ideas. **Do not** deploy to mainnet without audits + tests. It uses a simplified CPMM-ish approach where users trade collateral for YES/NO tokens and pool is tracked.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract BinaryShare is ERC20 {
    constructor(string memory name_, string memory symbol_) ERC20(name_, symbol_) {}
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
    function burn(address from, uint256 amount) external {
        _burn(from, amount);
    }
}

contract SimpleBinaryMarket {
    IERC20 public collateral; // e.g. USDC
    BinaryShare public yesToken;
    BinaryShare public noToken;

    uint256 public yesReserve; // yes token reserve (for CPMM)
    uint256 public noReserve;
    uint256 public collateralReserve; // total collateral held
    uint256 public feeBps = 30; // 0.30%

    address public oracle; // address allowed to finalize (replace with UMA/Chainlink logic)
    bool public settled;
    bool public yesWon;

    event BuyYes(address buyer, uint256 collateralIn, uint256 yesOut);
    event BuyNo(address buyer, uint256 collateralIn, uint256 noOut);
    event SoldYes(address seller, uint256 yesIn, uint256 collateralOut);
    event Settled(bool yesWon);

    constructor(IERC20 _collateral, address _oracle, string memory nameYes, string memory nameNo) {
        collateral = _collateral;
        oracle = _oracle;
        yesToken = new BinaryShare(nameYes, "YES");
        noToken = new BinaryShare(nameNo, "NO");
    }

    // Admin / LP initial seeding (very simplified)
    function seedPool(uint256 collateralAmount, uint256 yesAmount, uint256 noAmount) external {
        require(yesReserve == 0 && noReserve == 0, "already seeded");
        collateral.transferFrom(msg.sender, address(this), collateralAmount);
        yesToken.mint(address(this), yesAmount);
        noToken.mint(address(this), noAmount);
        yesReserve = yesAmount;
        noReserve = noAmount;
        collateralReserve = collateralAmount;
    }

    // Simplified CPMM: price of YES in collateral approximated as collateralReserve * yesReserve / (yesReserve + delta) ??? 
    // To keep a clear, auditable swap use constant product: yesReserve * noReserve = k.
    // We'll implement collateral -> YES via buyYes: user sends collateral, use CPMM maths switching collateral <-> YES via reserves.
    // (This is intentionally simplified. A production implementation should separate collateral pool and token reserves cleanly.)

    function buyYes(uint256 collateralIn, uint256 minYesOut) external {
        require(!settled, "market closed");
        collateral.transferFrom(msg.sender, address(this), collateralIn);
        uint256 fee = collateralIn * feeBps / 10000;
        uint256 effective = collateralIn - fee;
        // simple price: yesOut = effective * yesReserve / collateralReserve (proportional)
        // NOTE: not CPMM exact; for demo only
        uint256 yesOut = effective * yesReserve / collateralReserve;
        require(yesOut >= minYesOut, "slippage");
        yesToken.mint(msg.sender, yesOut);
        collateralReserve += effective;
        emit BuyYes(msg.sender, collateralIn, yesOut);
    }

    function sellYes(uint256 yesIn, uint256 minCollateralOut) external {
        require(!settled, "market closed");
        yesToken.burn(msg.sender, yesIn);
        // reverse of buy: collateralOut = yesIn * collateralReserve / yesReserve
        uint256 collateralOut = yesIn * collateralReserve / yesReserve;
        uint256 fee = collateralOut * feeBps / 10000;
        uint256 net = collateralOut - fee;
        require(net >= minCollateralOut, "slippage");
        collateral.transfer(msg.sender, net);
        collateralReserve -= collateralOut;
        emit SoldYes(msg.sender, yesIn, net);
    }

    // settlement by oracle (placeholder)
    function settle(bool _yesWon) external {
        require(msg.sender == oracle, "only oracle");
        settled = true;
        yesWon = _yesWon;
        emit Settled(_yesWon);
    }

    // redeem winners 1:1 to collateral
    function redeem(uint256 amount) external {
        require(settled, "not settled");
        if(yesWon) {
            yesToken.burn(msg.sender, amount);
        } else {
            noToken.burn(msg.sender, amount);
        }
        collateral.transfer(msg.sender, amount);
    }
}
```

**Notes on code:**

* This is intentionally simplified to illustrate structure. It uses mint/burn and very basic proportional pricing — not safe for production as-is.
* Replace `seedPool` pattern with proper LP tokens, invariant math for swaps (use UniswapV2 style), and secure access control.
* Integrate UMA/Chainlink oracle flows rather than `oracle` address.

---

# 6 — Frontend & UX

* **Tech:** Next.js (React), ethers.js, wagmi + rainbowkit for wallet UX.
* **Pages:** market list, market page (chart of price vs time), buy/sell widget, add/remove liquidity modal, history & claims.
* **UX tips:** show probability as percent (`price * 100`), show “cost now” vs “cost after slippage”, preview worst-case slippage, show LP impermanent loss simulation, time left until resolution, oracle trust level.

---

# 7 — Security, testing, audits

* Unit tests: Mocha/Hardhat or Foundry tests covering swap invariants, rounding, reentrancy, fee accounting.
* Property tests: fuzz swap inputs to check invariants (k stays correct for CPMM).
* Penetration tests: reentrancy, approvals, ERC-20 token quirks (use safeTransfer patterns).
* Gas profiling and optimizations (minimize storage writes).
* Formal audit before mainnet. Consider bounty program and testnet deployment.

---

# 8 — Legal / compliance (important)

* Prediction markets — especially on political outcomes — are heavily regulated in many jurisdictions (e.g., US laws often restrict real-money political betting). You must consult legal counsel before launching public markets with real collateral.
* Options if you need to avoid compliance risks:

  * Limit to non-U.S. users (requires geo-blocking + KYC)
  * Use play-money / reputation-based tokens (no fiat)
  * Markets only on non-political categories (e.g., sports with licensing)
  * Obtain licenses where required

---

# 9 — Deployment & ops checklist

* Choose chain: Polygon/Optimism/Arbitrum for low gas. Test heavily on testnet (Mumbai, Goerli, Sepolia).
* Deploy factory → create market → seed initial liquidity.
* Integrate oracle agent (UMA agent or Chainlink job).
* Set up monitoring (tx watchers, oracle disputes, reorg handling).
* Attack surface: watch for oracle disputes and stuck settlements.

---

# 10 — Next steps / roadmap (practical)

1. Pick AMM (CPMM or LMSR) for your use-case.
2. Prototype market contract (use Foundry + Solidity). Use the starter code above only to iterate quickly.
3. Add Uniswap-style pair for robust CPMM math (or implement LMSR contract).
4. Integrate a test oracle (manual multisig) for end-to-end test.
5. Build frontend with wagmi + ethers + react-query for on-chain reads.
6. Run thorough tests, add security checks, then get an audit and legal advice.
