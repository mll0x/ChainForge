// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./SimpleAMM.sol";

/// @dev 测试用闪电兑换接收者 — 在回调中还款
contract FlashSwapReceiver is IAMMCallee {
    address public immutable amm;
    address public immutable tokenA;
    address public immutable tokenB;

    constructor(address amm_, address tokenA_, address tokenB_) {
        amm = amm_;
        tokenA = tokenA_;
        tokenB = tokenB_;
    }

    /// @notice 借出 tokenOut，在回调中用 tokenIn 还款
    function doFlashSwap(address tokenOut, uint256 amountOut) external {
        SimpleAMM(amm).flashSwap(tokenOut, amountOut, abi.encode("repay"), block.timestamp);
    }

    /// @notice 借出但不还款（测试还款不足）
    function doFlashSwapNoRepay(address tokenOut, uint256 amountOut) external {
        SimpleAMM(amm).flashSwap(tokenOut, amountOut, "", block.timestamp);
    }

    /// @notice 借出但只还部分（测试还款不足）
    function doFlashSwapPartialRepay(address tokenOut, uint256 amountOut) external {
        SimpleAMM(amm).flashSwap(tokenOut, amountOut, abi.encode("partial"), block.timestamp);
    }

    function ammCall(address, address tokenOut, uint256, bytes calldata data) external override {
        require(msg.sender == amm, "Only AMM");

        string memory action = abi.decode(data, (string));

        if (keccak256(bytes(action)) == keccak256("repay")) {
            // 还款：approve AMM 使用我们的 tokenIn
            address tokenIn = tokenOut == tokenA ? tokenB : tokenA;
            IERC20(tokenIn).approve(amm, type(uint256).max);
        } else if (keccak256(bytes(action)) == keccak256("partial")) {
            // 部分还款：只 approve 一小部分
            address tokenIn = tokenOut == tokenA ? tokenB : tokenA;
            IERC20(tokenIn).approve(amm, 1); // 只还 1 wei
        }
        // "noaction" — 不还款
    }
}
