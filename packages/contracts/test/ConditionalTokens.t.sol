// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {ConditionalTokens} from "../src/ConditionalTokens.sol";
import {MockUSDC} from "../src/MockUSDC.sol";

contract ConditionalTokensTest is Test {
    ConditionalTokens public conditionalTokens;
    MockUSDC public usdc;
    
    address public oracle = address(0x1);
    address public user1 = address(0x2);
    address public user2 = address(0x3);
    
    bytes32 public questionId = keccak256("Test Question");
    uint256 public constant OUTCOME_SLOTS = 2;
    
    function setUp() public {
        conditionalTokens = new ConditionalTokens();
        usdc = new MockUSDC();
        
        // Fund users
        usdc.transfer(user1, 10000 * 10**6);
        usdc.transfer(user2, 10000 * 10**6);
        
        // Approve conditional tokens
        vm.prank(user1);
        usdc.approve(address(conditionalTokens), type(uint256).max);
        
        vm.prank(user2);
        usdc.approve(address(conditionalTokens), type(uint256).max);
    }
    
    function testPrepareCondition() public {
        bytes32 conditionId = conditionalTokens.getConditionId(oracle, questionId, OUTCOME_SLOTS);
        
        conditionalTokens.prepareCondition(questionId, oracle, OUTCOME_SLOTS);
        
        // Check condition is prepared
        uint256 status = conditionalTokens.payoutNumerators(conditionId);
        assertEq(status, 1, "Condition should be prepared");
    }
    
    function testCannotPrepareConditionTwice() public {
        conditionalTokens.prepareCondition(questionId, oracle, OUTCOME_SLOTS);
        
        vm.expectRevert("Condition already prepared");
        conditionalTokens.prepareCondition(questionId, oracle, OUTCOME_SLOTS);
    }
    
    function testSplitPosition() public {
        // Prepare condition
        conditionalTokens.prepareCondition(questionId, oracle, OUTCOME_SLOTS);
        
        uint256 amount = 1000 * 10**6;
        uint256[] memory partition = new uint256[](2);
        partition[0] = 0; // YES
        partition[1] = 1; // NO
        
        bytes32 conditionId = conditionalTokens.getConditionId(oracle, questionId, OUTCOME_SLOTS);
        
        vm.prank(user1);
        conditionalTokens.splitPosition(
            usdc,
            bytes32(0),
            conditionId,
            partition,
            amount
        );
        
        // Check balances
        uint256 yesPositionId = conditionalTokens.getPositionId(
            usdc,
            conditionalTokens.getCollectionId(bytes32(0), conditionId, 0)
        );
        uint256 noPositionId = conditionalTokens.getPositionId(
            usdc,
            conditionalTokens.getCollectionId(bytes32(0), conditionId, 1)
        );
        
        assertEq(conditionalTokens.balanceOf(user1, yesPositionId), amount, "YES balance mismatch");
        assertEq(conditionalTokens.balanceOf(user1, noPositionId), amount, "NO balance mismatch");
    }
    
    function testMergePositions() public {
        // Prepare and split
        conditionalTokens.prepareCondition(questionId, oracle, OUTCOME_SLOTS);
        
        uint256 amount = 1000 * 10**6;
        uint256[] memory partition = new uint256[](2);
        partition[0] = 0;
        partition[1] = 1;
        
        bytes32 conditionId = conditionalTokens.getConditionId(oracle, questionId, OUTCOME_SLOTS);
        
        vm.prank(user1);
        conditionalTokens.splitPosition(usdc, bytes32(0), conditionId, partition, amount);
        
        uint256 usdcBefore = usdc.balanceOf(user1);
        
        // Merge positions back
        vm.prank(user1);
        conditionalTokens.mergePositions(usdc, bytes32(0), conditionId, partition, amount);
        
        uint256 usdcAfter = usdc.balanceOf(user1);
        
        assertEq(usdcAfter - usdcBefore, amount, "Should get collateral back");
    }
    
    function testReportPayouts() public {
        // Prepare condition
        conditionalTokens.prepareCondition(questionId, oracle, OUTCOME_SLOTS);
        
        bytes32 conditionId = conditionalTokens.getConditionId(oracle, questionId, OUTCOME_SLOTS);
        
        // Report payouts (YES wins)
        uint256[] memory payouts = new uint256[](2);
        payouts[0] = 1; // YES gets 100%
        payouts[1] = 0; // NO gets 0%
        
        vm.prank(oracle);
        conditionalTokens.reportPayouts(questionId, payouts);
        
        // Check condition is resolved
        uint256 status = conditionalTokens.payoutNumerators(conditionId);
        assertEq(status, 2, "Condition should be resolved");
        
        uint256 denominator = conditionalTokens.payoutDenominator(conditionId);
        assertEq(denominator, 1, "Denominator should be sum of payouts");
    }
    
    function testRedeemWinningPosition() public {
        // Prepare and split
        conditionalTokens.prepareCondition(questionId, oracle, OUTCOME_SLOTS);
        
        uint256 amount = 1000 * 10**6;
        uint256[] memory partition = new uint256[](2);
        partition[0] = 0;
        partition[1] = 1;
        
        bytes32 conditionId = conditionalTokens.getConditionId(oracle, questionId, OUTCOME_SLOTS);
        
        vm.prank(user1);
        conditionalTokens.splitPosition(usdc, bytes32(0), conditionId, partition, amount);
        
        // Resolve condition (YES wins)
        uint256[] memory payouts = new uint256[](2);
        payouts[0] = 1; // YES wins
        payouts[1] = 0; // NO loses
        
        vm.prank(oracle);
        conditionalTokens.reportPayouts(questionId, payouts);
        
        // Redeem YES position
        uint256 usdcBefore = usdc.balanceOf(user1);
        uint256[] memory indexSets = new uint256[](1);
        indexSets[0] = 0; // YES
        
        vm.prank(user1);
        conditionalTokens.redeemPositions(usdc, bytes32(0), conditionId, indexSets);
        
        uint256 usdcAfter = usdc.balanceOf(user1);
        
        assertEq(usdcAfter - usdcBefore, amount, "Should receive full payout for winning position");
    }
    
    function testRedeemLosingPosition() public {
        // Prepare and split
        conditionalTokens.prepareCondition(questionId, oracle, OUTCOME_SLOTS);
        
        uint256 amount = 1000 * 10**6;
        uint256[] memory partition = new uint256[](2);
        partition[0] = 0;
        partition[1] = 1;
        
        bytes32 conditionId = conditionalTokens.getConditionId(oracle, questionId, OUTCOME_SLOTS);
        
        vm.prank(user1);
        conditionalTokens.splitPosition(usdc, bytes32(0), conditionId, partition, amount);
        
        // Resolve condition (YES wins)
        uint256[] memory payouts = new uint256[](2);
        payouts[0] = 1;
        payouts[1] = 0;
        
        vm.prank(oracle);
        conditionalTokens.reportPayouts(questionId, payouts);
        
        // Redeem NO position (losing)
        uint256 usdcBefore = usdc.balanceOf(user1);
        uint256[] memory indexSets = new uint256[](1);
        indexSets[0] = 1; // NO
        
        vm.prank(user1);
        conditionalTokens.redeemPositions(usdc, bytes32(0), conditionId, indexSets);
        
        uint256 usdcAfter = usdc.balanceOf(user1);
        
        assertEq(usdcAfter - usdcBefore, 0, "Should receive no payout for losing position");
    }
    
    function testCannotResolveUnpreparedCondition() public {
        uint256[] memory payouts = new uint256[](2);
        payouts[0] = 1;
        payouts[1] = 0;
        
        vm.prank(oracle);
        vm.expectRevert("Condition not prepared or already resolved");
        conditionalTokens.reportPayouts(questionId, payouts);
    }
    
    function testCannotRedeemUnresolvedCondition() public {
        // Prepare and split
        conditionalTokens.prepareCondition(questionId, oracle, OUTCOME_SLOTS);
        
        uint256 amount = 1000 * 10**6;
        uint256[] memory partition = new uint256[](2);
        partition[0] = 0;
        partition[1] = 1;
        
        bytes32 conditionId = conditionalTokens.getConditionId(oracle, questionId, OUTCOME_SLOTS);
        
        vm.prank(user1);
        conditionalTokens.splitPosition(usdc, bytes32(0), conditionId, partition, amount);
        
        // Try to redeem without resolution
        uint256[] memory indexSets = new uint256[](1);
        indexSets[0] = 0;
        
        vm.prank(user1);
        vm.expectRevert("Condition not resolved");
        conditionalTokens.redeemPositions(usdc, bytes32(0), conditionId, indexSets);
    }
    
    function testPartialPayout() public {
        // Prepare and split
        conditionalTokens.prepareCondition(questionId, oracle, OUTCOME_SLOTS);
        
        uint256 amount = 1000 * 10**6;
        uint256[] memory partition = new uint256[](2);
        partition[0] = 0;
        partition[1] = 1;
        
        bytes32 conditionId = conditionalTokens.getConditionId(oracle, questionId, OUTCOME_SLOTS);
        
        vm.prank(user1);
        conditionalTokens.splitPosition(usdc, bytes32(0), conditionId, partition, amount);
        
        // Resolve with partial payout (50/50 split)
        uint256[] memory payouts = new uint256[](2);
        payouts[0] = 1;
        payouts[1] = 1;
        
        vm.prank(oracle);
        conditionalTokens.reportPayouts(questionId, payouts);
        
        // Redeem both positions
        uint256 usdcBefore = usdc.balanceOf(user1);
        uint256[] memory indexSets = new uint256[](2);
        indexSets[0] = 0;
        indexSets[1] = 1;
        
        vm.prank(user1);
        conditionalTokens.redeemPositions(usdc, bytes32(0), conditionId, indexSets);
        
        uint256 usdcAfter = usdc.balanceOf(user1);
        
        // Should get back full amount since holding both outcomes
        assertEq(usdcAfter - usdcBefore, amount, "Should receive proportional payout");
    }
}
