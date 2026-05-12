import hre from "hardhat";
import { expect } from "chai";

describe("MyNFT (ERC-721)", function () {
  let ethers: any;
  let nft: any;
  let owner: any;
  let addr1: any;
  let addr2: any;

  const NAME = "ChainForge NFT";
  const SYMBOL = "CFN";
  const BASE_URI = "ipfs://QmTestCID/";
  const MAX_SUPPLY = 100;

  before(async function () {
    ({ ethers } = await hre.network.connect());
  });

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    nft = await ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, MAX_SUPPLY]);
    await nft.waitForDeployment();
  });

  describe("部署", function () {
    it("应该正确设置名称和符号", async function () {
      expect(await nft.name()).to.equal(NAME);
      expect(await nft.symbol()).to.equal(SYMBOL);
    });

    it("部署者应该是 Owner", async function () {
      expect(await nft.owner()).to.equal(owner.address);
    });

    it("应该正确设置最大供应量", async function () {
      expect(await nft.maxSupply()).to.equal(MAX_SUPPLY);
    });

    it("初始已铸造数量为 0", async function () {
      expect(await nft.totalMinted()).to.equal(0);
    });
  });

  describe("铸造 (mint)", function () {
    it("Owner 应该能铸造 1 个 NFT", async function () {
      const tx = await nft.mint(addr1.address);
      await tx.wait();
      expect(await nft.ownerOf(0)).to.equal(addr1.address);
      expect(await nft.totalMinted()).to.equal(1);
    });

    it("tokenId 应该从 0 自增", async function () {
      await nft.mint(addr1.address);
      await nft.mint(addr2.address);
      expect(await nft.ownerOf(0)).to.equal(addr1.address);
      expect(await nft.ownerOf(1)).to.equal(addr2.address);
    });

    it("非 Owner 不能铸造", async function () {
      await expect(nft.connect(addr1).mint(addr2.address)).to.revert(ethers);
    });

    it("铸造应该触发 Transfer 事件", async function () {
      await expect(nft.mint(addr1.address))
        .to.emit(nft, "Transfer")
        .withArgs(ethers.ZeroAddress, addr1.address, 0);
    });
  });

  describe("批量铸造 (batchMint)", function () {
    it("Owner 应该能批量铸造", async function () {
      await nft.batchMint(addr1.address, 5);
      expect(await nft.totalMinted()).to.equal(5);
      expect(await nft.balanceOf(addr1.address)).to.equal(5);
    });

    it("非 Owner 不能批量铸造", async function () {
      await expect(nft.connect(addr1).batchMint(addr2.address, 3)).to.revert(ethers);
    });
  });

  describe("供应量限制", function () {
    it("铸造不能超过最大供应量", async function () {
      await nft.batchMint(addr1.address, MAX_SUPPLY);
      await expect(nft.mint(addr2.address)).to.be.revertedWith("Max supply reached");
    });

    it("批量铸造不能超过最大供应量", async function () {
      await expect(nft.batchMint(addr1.address, MAX_SUPPLY + 1)).to.be.revertedWith(
        "Max supply reached"
      );
    });
  });

  describe("元数据 (tokenURI)", function () {
    it("tokenURI 应该拼接 baseURI + tokenId", async function () {
      await nft.mint(addr1.address);
      expect(await nft.tokenURI(0)).to.equal(BASE_URI + "0");
    });

    it("未铸造的 tokenId 查询 tokenURI 应该回退", async function () {
      await expect(nft.tokenURI(0)).to.revert(ethers);
    });

    it("Owner 应该能设置新的 baseURI", async function () {
      const newURI = "https://api.example.com/metadata/";
      await nft.setBaseURI(newURI);
      await nft.mint(addr1.address);
      expect(await nft.tokenURI(0)).to.equal(newURI + "0");
    });

    it("非 Owner 不能设置 baseURI", async function () {
      await expect(nft.connect(addr1).setBaseURI("https://evil.com/")).to.revert(ethers);
    });
  });

  describe("转账", function () {
    it("NFT 持有者应该能转账", async function () {
      await nft.mint(addr1.address);
      await nft.connect(addr1).transferFrom(addr1.address, addr2.address, 0);
      expect(await nft.ownerOf(0)).to.equal(addr2.address);
    });
  });
});
