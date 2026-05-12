// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MyNFT
 * @dev ChainForge ERC-721 NFT — 非同质化代币
 *
 * 功能：
 *   - Owner 铸造单个或批量 NFT
 *   - 自增 tokenId
 *   - 可设置 baseURI 指向元数据（IPFS 或 API）
 */
contract MyNFT is ERC721, Ownable {
    uint256 private _nextTokenId;
    string private _baseTokenURI;
    uint256 private _maxSupply;

    constructor(
        string memory name_,
        string memory symbol_,
        string memory baseURI_,
        uint256 maxSupply_
    ) ERC721(name_, symbol_) Ownable(msg.sender) {
        _baseTokenURI = baseURI_;
        _maxSupply = maxSupply_;
    }

    /// @notice 铸造 1 个 NFT 给指定地址
    function mint(address to) external onlyOwner returns (uint256) {
        require(_maxSupply == 0 || _nextTokenId < _maxSupply, "Max supply reached");
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        return tokenId;
    }

    /// @notice 批量铸造 NFT
    function batchMint(address to, uint256 quantity) external onlyOwner {
        require(_maxSupply == 0 || _nextTokenId + quantity <= _maxSupply, "Max supply reached");
        for (uint256 i = 0; i < quantity; i++) {
            uint256 tokenId = _nextTokenId++;
            _safeMint(to, tokenId);
        }
    }

    /// @notice 查询已铸造数量
    function totalMinted() external view returns (uint256) {
        return _nextTokenId;
    }

    /// @notice 查询最大供应量（0 表示无上限）
    function maxSupply() external view returns (uint256) {
        return _maxSupply;
    }

    /// @notice 设置 baseURI（元数据前缀），仅 Owner
    function setBaseURI(string memory baseURI_) external onlyOwner {
        _baseTokenURI = baseURI_;
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }
}
