// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./SimpleAMM.sol";

/**
 * @title ChainForgeRouter
 * @dev 多池路由 — 支持跨池多跳兑换
 *
 * 通过中间代币连接多个 SimpleAMM 池，实现最佳路径兑换。
 * 例如: CFT → WETH → USDC（2 跳）
 */
contract ChainForgeRouter {
    using SafeERC20 for IERC20;

    struct Pool {
        address pair;
        address token0;
        address token1;
    }

    Pool[] public pools;
    // tokenA => tokenB => SimpleAMM pair (bidirectional)
    mapping(address => mapping(address => address)) public pairFor;

    event PoolAdded(address indexed token0, address indexed token1, address indexed pair);
    event SwapExecuted(address indexed sender, uint256 amountIn, uint256 amountOut, address[] path);

    // ─── Pool Management ───────────────────────────────────

    function addPool(address tokenA, address tokenB, address pair) external {
        require(tokenA != address(0) && tokenB != address(0), "Zero address");
        require(tokenA != tokenB, "Identical addresses");
        require(pair != address(0), "Zero pair address");
        require(pairFor[tokenA][tokenB] == address(0), "Pool already exists");

        pairFor[tokenA][tokenB] = pair;
        pairFor[tokenB][tokenA] = pair;
        pools.push(Pool({pair: pair, token0: tokenA, token1: tokenB}));

        emit PoolAdded(tokenA, tokenB, pair);
    }

    function poolCount() external view returns (uint256) {
        return pools.length;
    }

    // ─── View ───────────────────────────────────────────────

    /// @dev 给定输入和路径，计算每跳输出
    function getAmountsOut(uint256 amountIn, address[] calldata path)
        external
        view
        returns (uint256[] memory amounts)
    {
        require(path.length >= 2, "Invalid path");
        amounts = new uint256[](path.length);
        amounts[0] = amountIn;

        for (uint256 i = 0; i < path.length - 1; i++) {
            address tokenIn = path[i];
            address tokenOut = path[i + 1];
            address pair = pairFor[tokenIn][tokenOut];
            require(pair != address(0), "Pool not found");

            SimpleAMM amm = SimpleAMM(pair);
            address tA = amm.tokenA();
            uint256 reserveIn = tokenIn == tA ? amm.reserveA() : amm.reserveB();
            uint256 reserveOut = tokenIn == tA ? amm.reserveB() : amm.reserveA();
            amounts[i + 1] = amm.getAmountOut(amounts[i], reserveIn, reserveOut);
        }
    }

    // ─── Swap ───────────────────────────────────────────────

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external ensure(deadline) returns (uint256[] memory amounts) {
        require(path.length >= 2, "Invalid path");
        require(to != address(0), "Zero address");

        amounts = new uint256[](path.length);
        amounts[0] = amountIn;

        // 从用户收取第一个代币
        IERC20(path[0]).safeTransferFrom(msg.sender, address(this), amountIn);

        for (uint256 i = 0; i < path.length - 1; i++) {
            address tokenIn = path[i];
            address tokenOut = path[i + 1];
            address pair = pairFor[tokenIn][tokenOut];
            require(pair != address(0), "Pool not found");

            SimpleAMM amm = SimpleAMM(pair);
            address tA = amm.tokenA();
            uint256 reserveIn = tokenIn == tA ? amm.reserveA() : amm.reserveB();
            uint256 reserveOut = tokenIn == tA ? amm.reserveB() : amm.reserveA();
            amounts[i + 1] = amm.getAmountOut(amounts[i], reserveIn, reserveOut);

            // approve AMM 并执行 swap（滑点保护只在最后检查）
            IERC20(tokenIn).forceApprove(pair, amounts[i]);
            amm.swap(tokenIn, amounts[i], 0, deadline);
        }

        require(amounts[path.length - 1] >= amountOutMin, "Slippage exceeded");

        // 将最终代币转给接收者
        IERC20(path[path.length - 1]).safeTransfer(to, amounts[path.length - 1]);

        emit SwapExecuted(msg.sender, amountIn, amounts[path.length - 1], path);
    }

    modifier ensure(uint256 deadline) {
        require(block.timestamp <= deadline, "Transaction expired");
        _;
    }
}
