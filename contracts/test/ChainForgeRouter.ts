import hre from "hardhat";
import { expect } from "chai";

describe("ChainForgeRouter", function () {
  let ethers: any;
  let tokenA: any;
  let tokenB: any;
  let tokenC: any;
  let poolAB: any;
  let poolBC: any;
  let router: any;
  let owner: any;
  let addr1: any;

  before(async function () {
    const networkConnection = await hre.network.connect();
    ethers = networkConnection.ethers;
  });

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("MyToken");
    tokenA = await Token.deploy("Token A", "TKA", 1000000, 0);
    await tokenA.waitForDeployment();
    tokenB = await Token.deploy("Token B", "TKB", 1000000, 0);
    await tokenB.waitForDeployment();
    tokenC = await Token.deploy("Token C", "TKC", 1000000, 0);
    await tokenC.waitForDeployment();

    const SimpleAMM = await ethers.getContractFactory("SimpleAMM");
    poolAB = await SimpleAMM.deploy(await tokenA.getAddress(), await tokenB.getAddress());
    await poolAB.waitForDeployment();
    poolBC = await SimpleAMM.deploy(await tokenB.getAddress(), await tokenC.getAddress());
    await poolBC.waitForDeployment();

    const Router = await ethers.getContractFactory("ChainForgeRouter");
    router = await Router.deploy();
    await router.waitForDeployment();

    await router.addPool(await tokenA.getAddress(), await tokenB.getAddress(), await poolAB.getAddress());
    await router.addPool(await tokenB.getAddress(), await tokenC.getAddress(), await poolBC.getAddress());

    // 添加流动性到 poolAB: 1000 A, 2000 B
    const amountA = ethers.parseUnits("1000", 18);
    const amountB = ethers.parseUnits("2000", 18);
    await tokenA.approve(await poolAB.getAddress(), amountA);
    await tokenB.approve(await poolAB.getAddress(), amountB);
    await poolAB.addLiquidity(amountA, amountB, futureDeadline());

    // 添加流动性到 poolBC: 2000 B, 3000 C
    const amountB2 = ethers.parseUnits("2000", 18);
    const amountC = ethers.parseUnits("3000", 18);
    await tokenB.approve(await poolBC.getAddress(), amountB2);
    await tokenC.approve(await poolBC.getAddress(), amountC);
    await poolBC.addLiquidity(amountB2, amountC, futureDeadline());
  });

  function futureDeadline(): number {
    return Math.floor(Date.now() / 1000) + 3600;
  }

  describe("Pool 管理", function () {
    it("应该正确注册池", async function () {
      expect(await router.pairFor(await tokenA.getAddress(), await tokenB.getAddress())).to.equal(await poolAB.getAddress());
      expect(await router.pairFor(await tokenB.getAddress(), await tokenA.getAddress())).to.equal(await poolAB.getAddress());
      expect(await router.poolCount()).to.equal(2);
    });

    it("重复注册应回退", async function () {
      await expect(
        router.addPool(await tokenA.getAddress(), await tokenB.getAddress(), await poolAB.getAddress())
      ).to.be.revertedWith("Pool already exists");
    });

    it("相同代币应回退", async function () {
      await expect(
        router.addPool(await tokenA.getAddress(), await tokenA.getAddress(), await poolAB.getAddress())
      ).to.be.revertedWith("Identical addresses");
    });
  });

  describe("getAmountsOut", function () {
    it("单跳应正确计算输出", async function () {
      const amountIn = ethers.parseUnits("10", 18);
      const path = [await tokenA.getAddress(), await tokenB.getAddress()];
      const amounts = await router.getAmountsOut(amountIn, path);
      expect(amounts.length).to.equal(2);
      expect(amounts[0]).to.equal(amountIn);
      expect(amounts[1]).to.be.gt(0);
    });

    it("两跳应正确计算输出", async function () {
      const amountIn = ethers.parseUnits("10", 18);
      const path = [await tokenA.getAddress(), await tokenB.getAddress(), await tokenC.getAddress()];
      const amounts = await router.getAmountsOut(amountIn, path);
      expect(amounts.length).to.equal(3);
      expect(amounts[0]).to.equal(amountIn);
      expect(amounts[1]).to.be.gt(0);
      expect(amounts[2]).to.be.gt(0);
    });

    it("路径不存在应回退", async function () {
      const path = [await tokenA.getAddress(), await tokenC.getAddress()];
      await expect(router.getAmountsOut(ethers.parseUnits("10", 18), path))
        .to.be.revertedWith("Pool not found");
    });

    it("路径长度不足应回退", async function () {
      await expect(router.getAmountsOut(ethers.parseUnits("10", 18), [await tokenA.getAddress()]))
        .to.be.revertedWith("Invalid path");
    });
  });

  describe("swapExactTokensForTokens", function () {
    it("单跳兑换应成功", async function () {
      const amountIn = ethers.parseUnits("10", 18);
      const path = [await tokenA.getAddress(), await tokenB.getAddress()];
      const amounts = await router.getAmountsOut(amountIn, path);
      const expectedOut = amounts[1];

      await tokenA.approve(await router.getAddress(), amountIn);

      const beforeB = await tokenB.balanceOf(owner.address);
      await router.swapExactTokensForTokens(
        amountIn, expectedOut * 99n / 100n, path, owner.address, futureDeadline()
      );
      const afterB = await tokenB.balanceOf(owner.address);

      expect(afterB - beforeB).to.be.gte(expectedOut * 99n / 100n);
    });

    it("两跳兑换应成功", async function () {
      const amountIn = ethers.parseUnits("10", 18);
      const path = [await tokenA.getAddress(), await tokenB.getAddress(), await tokenC.getAddress()];
      const amounts = await router.getAmountsOut(amountIn, path);
      const expectedOut = amounts[2];

      await tokenA.approve(await router.getAddress(), amountIn);

      const beforeC = await tokenC.balanceOf(owner.address);
      await router.swapExactTokensForTokens(
        amountIn, expectedOut * 99n / 100n, path, owner.address, futureDeadline()
      );
      const afterC = await tokenC.balanceOf(owner.address);

      expect(afterC - beforeC).to.be.gte(expectedOut * 99n / 100n);
    });

    it("滑点保护应生效", async function () {
      const amountIn = ethers.parseUnits("10", 18);
      const path = [await tokenA.getAddress(), await tokenB.getAddress()];
      const amounts = await router.getAmountsOut(amountIn, path);
      const expectedOut = amounts[1];

      await tokenA.approve(await router.getAddress(), amountIn);

      await expect(
        router.swapExactTokensForTokens(
          amountIn, expectedOut + 1n, path, owner.address, futureDeadline()
        )
      ).to.be.revertedWith("Slippage exceeded");
    });

    it("deadline 过期应回退", async function () {
      const amountIn = ethers.parseUnits("10", 18);
      const path = [await tokenA.getAddress(), await tokenB.getAddress()];
      await tokenA.approve(await router.getAddress(), amountIn);

      await expect(
        router.swapExactTokensForTokens(
          amountIn, 0, path, owner.address, 1
        )
      ).to.be.revertedWith("Transaction expired");
    });

    it("路径不存在应回退", async function () {
      const amountIn = ethers.parseUnits("10", 18);
      const path = [await tokenA.getAddress(), await tokenC.getAddress()];
      await tokenA.approve(await router.getAddress(), amountIn);

      await expect(
        router.swapExactTokensForTokens(
          amountIn, 0, path, owner.address, futureDeadline()
        )
      ).to.be.revertedWith("Pool not found");
    });

    it("应该触发 SwapExecuted 事件", async function () {
      const amountIn = ethers.parseUnits("10", 18);
      const path = [await tokenA.getAddress(), await tokenB.getAddress()];
      await tokenA.approve(await router.getAddress(), amountIn);

      await expect(
        router.swapExactTokensForTokens(
          amountIn, 0, path, owner.address, futureDeadline()
        )
      ).to.emit(router, "SwapExecuted");
    });
  });
});
