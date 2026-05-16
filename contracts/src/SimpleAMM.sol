// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title SimpleAMM
 * @dev 简化版 AMM — 基于 Uniswap V2 恒定乘积公式 x*y=k
 *
 * 仅支持 swap，不含手续费。
 * - addLiquidity: 存入两种 ERC-20 代币，铸造 LP Token
 * - removeLiquidity: 销毁 LP Token，取回两种代币
 * - swap: 用一种代币换另一种代币（恒定乘积定价）
 */
contract SimpleAMM is ERC20 {
    address public immutable tokenA;
    address public immutable tokenB;

    uint256 private _reserveA;
    uint256 private _reserveB;

    event LiquidityAdded(address indexed provider, uint256 amountA, uint256 amountB, uint256 liquidity);
    event LiquidityRemoved(address indexed provider, uint256 amountA, uint256 amountB, uint256 liquidity);
    event Swap(address indexed sender, address tokenIn, uint256 amountIn, address tokenOut, uint256 amountOut);

    constructor(address tokenA_, address tokenB_)
        ERC20("SimpleAMM LP Token", "SALP")
    {
        require(tokenA_ != address(0) && tokenB_ != address(0), "Zero address");
        require(tokenA_ != tokenB_, "Identical addresses");
        tokenA = tokenA_;
        tokenB = tokenB_;
    }

    // ─── View ───────────────────────────────────────────────

    function reserveA() external view returns (uint256) {
        return _reserveA;
    }

    function reserveB() external view returns (uint256) {
        return _reserveB;
    }

    /// @dev 给定输入数量，计算输出数量（不含手续费）
    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut)
        public
        pure
        returns (uint256)
    {
        require(amountIn > 0, "Insufficient input");
        require(reserveIn > 0 && reserveOut > 0, "Insufficient liquidity");
        // dy = y * dx / (x + dx)
        return (reserveOut * amountIn) / (reserveIn + amountIn);
    }

    // ─── Mutative ──────────────────────────────────────────

    /// @notice 添加流动性，按当前储备比例存入两种代币
    function addLiquidity(uint256 amountA, uint256 amountB) external returns (uint256 liquidity) {
        require(amountA > 0 && amountB > 0, "Zero amount");

        IERC20(tokenA).transferFrom(msg.sender, address(this), amountA);
        IERC20(tokenB).transferFrom(msg.sender, address(this), amountB);

        uint256 totalSupply_ = totalSupply();

        if (totalSupply_ == 0) {
            // 首次添加：LP = sqrt(amountA * amountB)
            liquidity = _sqrt(amountA * amountB);
        } else {
            // 后续添加：按比例取较小值
            uint256 liquidityA = (amountA * totalSupply_) / _reserveA;
            uint256 liquidityB = (amountB * totalSupply_) / _reserveB;
            liquidity = liquidityA < liquidityB ? liquidityA : liquidityB;
        }

        require(liquidity > 0, "Insufficient liquidity minted");
        _mint(msg.sender, liquidity);

        _reserveA += amountA;
        _reserveB += amountB;

        emit LiquidityAdded(msg.sender, amountA, amountB, liquidity);
    }

    /// @notice 移除流动性，销毁 LP Token 取回两种代币
    function removeLiquidity(uint256 liquidity) external returns (uint256 amountA, uint256 amountB) {
        require(liquidity > 0, "Zero liquidity");

        uint256 totalSupply_ = totalSupply();

        amountA = (_reserveA * liquidity) / totalSupply_;
        amountB = (_reserveB * liquidity) / totalSupply_;

        require(amountA > 0 && amountB > 0, "Insufficient liquidity burned");

        _burn(msg.sender, liquidity);

        _reserveA -= amountA;
        _reserveB -= amountB;

        IERC20(tokenA).transfer(msg.sender, amountA);
        IERC20(tokenB).transfer(msg.sender, amountB);

        emit LiquidityRemoved(msg.sender, amountA, amountB, liquidity);
    }

    /// @notice 用 tokenIn 换 tokenOut
    function swap(address tokenIn, uint256 amountIn, uint256 amountOutMin)
        external
        returns (uint256 amountOut)
    {
        require(tokenIn == tokenA || tokenIn == tokenB, "Invalid token");
        require(amountIn > 0, "Zero input");

        bool isAToB = tokenIn == tokenA;
        (uint256 reserveIn, uint256 reserveOut, address tokenOut) =
            isAToB ? (_reserveA, _reserveB, tokenB) : (_reserveB, _reserveA, tokenA);

        amountOut = getAmountOut(amountIn, reserveIn, reserveOut);
        require(amountOut >= amountOutMin, "Slippage exceeded");

        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenOut).transfer(msg.sender, amountOut);

        if (isAToB) {
            _reserveA += amountIn;
            _reserveB -= amountOut;
        } else {
            _reserveB += amountIn;
            _reserveA -= amountOut;
        }

        emit Swap(msg.sender, tokenIn, amountIn, tokenOut, amountOut);
    }

    // ─── Internal ──────────────────────────────────────────

    function _sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }
}
