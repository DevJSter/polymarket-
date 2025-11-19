// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title ConditionalTokens
/// @notice ERC1155 token representing conditional outcomes
/// @dev Implements the core conditional token framework for prediction markets
contract ConditionalTokens is ERC1155 {
    using SafeERC20 for IERC20;

    // Position ID is keccak256(collateralToken, parentCollectionId, conditionId, indexSet)
    mapping(bytes32 => uint256) public payoutNumerators;
    mapping(bytes32 => uint256) public payoutDenominator;

    event ConditionPreparation(
        bytes32 indexed conditionId,
        address indexed oracle,
        bytes32 indexed questionId,
        uint256 outcomeSlotCount
    );

    event ConditionResolution(
        bytes32 indexed conditionId,
        address indexed oracle,
        bytes32 indexed questionId,
        uint256 outcomeSlotCount,
        uint256[] payoutNumerators
    );

    event PositionSplit(
        address indexed stakeholder,
        IERC20 collateralToken,
        bytes32 indexed parentCollectionId,
        bytes32 indexed conditionId,
        uint256[] partition,
        uint256 amount
    );

    event PositionsMerge(
        address indexed stakeholder,
        IERC20 collateralToken,
        bytes32 indexed parentCollectionId,
        bytes32 indexed conditionId,
        uint256[] partition,
        uint256 amount
    );

    event PayoutRedemption(
        address indexed redeemer,
        IERC20 indexed collateralToken,
        bytes32 indexed parentCollectionId,
        bytes32 conditionId,
        uint256[] indexSets,
        uint256 payout
    );

    constructor() ERC1155("") {}

    /// @notice Prepare a condition for a prediction market
    /// @param questionId Unique identifier for the question
    /// @param oracle Address that will resolve the condition
    /// @param outcomeSlotCount Number of possible outcomes (typically 2 for binary markets)
    function prepareCondition(bytes32 questionId, address oracle, uint256 outcomeSlotCount) external {
        require(outcomeSlotCount > 1, "Invalid outcome count");
        bytes32 conditionId = getConditionId(oracle, questionId, outcomeSlotCount);
        require(payoutNumerators[conditionId] == 0, "Condition already prepared");

        payoutNumerators[conditionId] = 1; // Mark as prepared but not resolved
        emit ConditionPreparation(conditionId, oracle, questionId, outcomeSlotCount);
    }

    /// @notice Resolve a condition with payout information
    /// @param questionId The question identifier
    /// @param payouts Array of payout numerators for each outcome
    function reportPayouts(bytes32 questionId, uint256[] calldata payouts) external {
        uint256 outcomeSlotCount = payouts.length;
        require(outcomeSlotCount > 1, "Invalid payout length");

        bytes32 conditionId = getConditionId(msg.sender, questionId, outcomeSlotCount);
        require(payoutNumerators[conditionId] == 1, "Condition not prepared or already resolved");

        uint256 den = 0;
        for (uint256 i = 0; i < outcomeSlotCount; i++) {
            den += payouts[i];
        }
        require(den > 0, "Invalid payouts");

        payoutDenominator[conditionId] = den;

        // Store individual payouts
        for (uint256 i = 0; i < outcomeSlotCount; i++) {
            bytes32 key = keccak256(abi.encodePacked(conditionId, i));
            payoutNumerators[key] = payouts[i];
        }
        payoutNumerators[conditionId] = 2; // Mark as resolved

        emit ConditionResolution(conditionId, msg.sender, questionId, outcomeSlotCount, payouts);
    }

    /// @notice Split collateral into conditional tokens
    /// @param collateralToken The ERC20 token used as collateral
    /// @param parentCollectionId Parent collection (bytes32(0) for root)
    /// @param conditionId The condition identifier
    /// @param partition Array of index sets representing the split
    /// @param amount Amount of collateral to split
    function splitPosition(
        IERC20 collateralToken,
        bytes32 parentCollectionId,
        bytes32 conditionId,
        uint256[] calldata partition,
        uint256 amount
    ) external {
        require(amount > 0, "Amount must be positive");
        require(payoutNumerators[conditionId] > 0, "Condition not prepared");

        // Transfer collateral from user
        collateralToken.safeTransferFrom(msg.sender, address(this), amount);

        // Mint conditional tokens for each partition
        for (uint256 i = 0; i < partition.length; i++) {
            uint256 positionId = getPositionId(collateralToken, getCollectionId(parentCollectionId, conditionId, partition[i]));
            _mint(msg.sender, positionId, amount, "");
        }

        emit PositionSplit(msg.sender, collateralToken, parentCollectionId, conditionId, partition, amount);
    }

    /// @notice Merge conditional tokens back into collateral
    /// @param collateralToken The ERC20 token used as collateral
    /// @param parentCollectionId Parent collection (bytes32(0) for root)
    /// @param conditionId The condition identifier
    /// @param partition Array of index sets representing the merge
    /// @param amount Amount to merge
    function mergePositions(
        IERC20 collateralToken,
        bytes32 parentCollectionId,
        bytes32 conditionId,
        uint256[] calldata partition,
        uint256 amount
    ) external {
        require(amount > 0, "Amount must be positive");

        // Burn conditional tokens from each partition
        for (uint256 i = 0; i < partition.length; i++) {
            uint256 positionId = getPositionId(collateralToken, getCollectionId(parentCollectionId, conditionId, partition[i]));
            _burn(msg.sender, positionId, amount);
        }

        // Return collateral to user
        collateralToken.safeTransfer(msg.sender, amount);

        emit PositionsMerge(msg.sender, collateralToken, parentCollectionId, conditionId, partition, amount);
    }

    /// @notice Redeem conditional tokens for payout after condition resolution
    /// @param collateralToken The ERC20 token used as collateral
    /// @param parentCollectionId Parent collection
    /// @param conditionId The condition identifier
    /// @param indexSets Array of index sets to redeem
    function redeemPositions(
        IERC20 collateralToken,
        bytes32 parentCollectionId,
        bytes32 conditionId,
        uint256[] calldata indexSets
    ) external {
        require(payoutNumerators[conditionId] == 2, "Condition not resolved");

        uint256 den = payoutDenominator[conditionId];
        uint256 totalPayout = 0;

        for (uint256 i = 0; i < indexSets.length; i++) {
            uint256 positionId = getPositionId(collateralToken, getCollectionId(parentCollectionId, conditionId, indexSets[i]));
            uint256 balance = balanceOf(msg.sender, positionId);

            if (balance > 0) {
                // Get payout for this outcome
                bytes32 payoutKey = keccak256(abi.encodePacked(conditionId, indexSets[i]));
                uint256 payoutNumerator = payoutNumerators[payoutKey];
                uint256 payout = (balance * payoutNumerator) / den;

                totalPayout += payout;
                _burn(msg.sender, positionId, balance);
            }
        }

        if (totalPayout > 0) {
            collateralToken.safeTransfer(msg.sender, totalPayout);
        }

        emit PayoutRedemption(msg.sender, collateralToken, parentCollectionId, conditionId, indexSets, totalPayout);
    }

    /// @notice Get the condition ID
    function getConditionId(address oracle, bytes32 questionId, uint256 outcomeSlotCount) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(oracle, questionId, outcomeSlotCount));
    }

    /// @notice Get collection ID
    function getCollectionId(bytes32 parentCollectionId, bytes32 conditionId, uint256 indexSet) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(parentCollectionId, conditionId, indexSet));
    }

    /// @notice Get position ID (ERC1155 token ID)
    function getPositionId(IERC20 collateralToken, bytes32 collectionId) public pure returns (uint256) {
        return uint256(keccak256(abi.encodePacked(collateralToken, collectionId)));
    }
}
