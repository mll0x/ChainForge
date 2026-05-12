// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MyToken
 * @dev ChainForge ERC-20 Token
 *
 * 所有数量参数均为原始数量（不含 decimals），合约内部自动处理精度。
 * 例如传入 1000 表示 1000 个 Token，合约内部存储为 1000 * 10^18。
 */
contract MyToken is ERC20, Ownable {
    uint256 private _maxSupply;

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 initialSupply_,
        uint256 maxSupply_
    ) ERC20(name_, symbol_) Ownable(msg.sender) {
        require(maxSupply_ == 0 || initialSupply_ <= maxSupply_, "Initial supply exceeds max");
        _maxSupply = maxSupply_ * 10 ** decimals();

        if (initialSupply_ > 0) {
            _mint(msg.sender, initialSupply_ * 10 ** decimals());
        }
    }

    /// @notice 增发代币（原始数量），仅 Owner 可调用
    function mint(address to, uint256 amount) external onlyOwner {
        uint256 amountWithDecimals = amount * 10 ** decimals();
        if (_maxSupply > 0) {
            require(totalSupply() + amountWithDecimals <= _maxSupply, "Exceeds max supply");
        }
        _mint(to, amountWithDecimals);
    }

    /// @notice 查询最大供应量（含 decimals），0 表示无上限
    function maxSupply() external view returns (uint256) {
        return _maxSupply;
    }
}
