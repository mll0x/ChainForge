import hre from "hardhat";
import { expect } from "chai";
import { MaxUint256 } from "ethers";

describe("MyToken (ERC-20)", function () {
  let ethers: any;
  let token: any;
  let owner: any;
  let addr1: any;
  let addr2: any;

  const NAME = "ChainForge Token";
  const SYMBOL = "CFT";
  const INITIAL_SUPPLY = 1_000_000;
  const MAX_SUPPLY = 10_000_000;

  before(async function () {
    ({ ethers } = await hre.network.connect());
  });

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    token = await ethers.deployContract("MyToken", [
      NAME,
      SYMBOL,
      INITIAL_SUPPLY,
      MAX_SUPPLY,
    ]);
    await token.waitForDeployment();
  });

  describe("部署", function () {
    it("应该正确设置名称和符号", async function () {
      expect(await token.name()).to.equal(NAME);
      expect(await token.symbol()).to.equal(SYMBOL);
    });

    it("应该将初始供应量铸造给部署者", async function () {
      const ownerBalance = await token.balanceOf(owner.address);
      expect(ownerBalance).to.equal(ethers.parseUnits(INITIAL_SUPPLY.toString(), 18));
    });

    it("应该正确设置总供应量", async function () {
      const totalSupply = await token.totalSupply();
      expect(totalSupply).to.equal(ethers.parseUnits(INITIAL_SUPPLY.toString(), 18));
    });

    it("应该正确设置最大供应量", async function () {
      expect(await token.maxSupply()).to.equal(ethers.parseUnits(MAX_SUPPLY.toString(), 18));
    });

    it("部署者应该是 Owner", async function () {
      expect(await token.owner()).to.equal(owner.address);
    });
  });

  describe("转账", function () {
    it("持有者应该能转账", async function () {
      const amount = ethers.parseUnits("1000", 18);
      await token.transfer(addr1.address, amount);
      expect(await token.balanceOf(addr1.address)).to.equal(amount);
    });

    it("余额不足时应该回退", async function () {
      await expect(token.transfer(addr1.address, MaxUint256)).to.revert(ethers);
    });

    it("应该正确触发 Transfer 事件", async function () {
      const amount = ethers.parseUnits("1000", 18);
      await expect(token.transfer(addr1.address, amount))
        .to.emit(token, "Transfer")
        .withArgs(owner.address, addr1.address, amount);
    });
  });

  describe("授权", function () {
    it("持有者应该能授权额度", async function () {
      const amount = ethers.parseUnits("5000", 18);
      await token.approve(addr1.address, amount);
      expect(await token.allowance(owner.address, addr1.address)).to.equal(amount);
    });

    it("被授权者应该能 transferFrom", async function () {
      const amount = ethers.parseUnits("5000", 18);
      await token.approve(addr1.address, amount);
      await token.connect(addr1).transferFrom(owner.address, addr2.address, amount);
      expect(await token.balanceOf(addr2.address)).to.equal(amount);
    });
  });

  describe("增发 (mint)", function () {
    it("Owner 应该能增发", async function () {
      const amount = 5000;
      await token.mint(addr1.address, amount);
      expect(await token.balanceOf(addr1.address)).to.equal(
        ethers.parseUnits(amount.toString(), 18)
      );
    });

    it("非 Owner 不能增发", async function () {
      await expect(token.connect(addr1).mint(addr2.address, 1000)).to.revert(ethers);
    });

    it("增发不能超过最大供应量", async function () {
      await expect(token.mint(addr1.address, MAX_SUPPLY)).to.be.revertedWith(
        "Exceeds max supply"
      );
    });
  });
});
