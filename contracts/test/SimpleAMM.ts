import hre from "hardhat";
import { expect } from "chai";

describe("SimpleAMM", function () {
  let ethers: any;
  let tokenA: any;
  let tokenB: any;
  let amm: any;
  let owner: any;
  let addr1: any;
  let addr2: any;

  const UNIT = 10n ** 18n;

  before(async function () {
    ({ ethers } = await hre.network.connect());
  });

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    // 部署两个测试用 ERC-20 代币
    const Token = await ethers.getContractFactory("MyToken");
    tokenA = await Token.deploy("Token A", "TKA", 1000000, 0);
    await tokenA.waitForDeployment();
    tokenB = await Token.deploy("Token B", "TKB", 2000000, 0);
    await tokenB.waitForDeployment();

    // 部署 AMM
    const SimpleAMM = await ethers.getContractFactory("SimpleAMM");
    amm = await SimpleAMM.deploy(await tokenA.getAddress(), await tokenB.getAddress());
    await amm.waitForDeployment();
  });

  describe("部署", function () {
    it("应该正确设置代币地址", async function () {
      expect(await amm.tokenA()).to.equal(await tokenA.getAddress());
      expect(await amm.tokenB()).to.equal(await tokenB.getAddress());
    });

    it("初始储备量应为 0", async function () {
      expect(await amm.reserveA()).to.equal(0);
      expect(await amm.reserveB()).to.equal(0);
    });

    it("LP Token 总供应量应为 0", async function () {
      expect(await amm.totalSupply()).to.equal(0);
    });

    it("不能用相同地址部署", async function () {
      const SimpleAMM = await ethers.getContractFactory("SimpleAMM");
      await expect(SimpleAMM.deploy(await tokenA.getAddress(), await tokenA.getAddress()))
        .to.be.revertedWith("Identical addresses");
    });
  });

  describe("添加流动性", function () {
    it("首次添加应铸造 LP Token = sqrt(a*b)", async function () {
      const amountA = ethers.parseUnits("1000", 18);
      const amountB = ethers.parseUnits("2000", 18);

      await tokenA.approve(await amm.getAddress(), amountA);
      await tokenB.approve(await amm.getAddress(), amountB);

      await amm.addLiquidity(amountA, amountB);

      // sqrt(1000e18 * 2000e18) = sqrt(2e42) ≈ 1.4142e21
      const expectedLP = BigInt(Math.floor(Math.sqrt(Number(amountA * amountB))));
      expect(await amm.totalSupply()).to.be.closeTo(expectedLP, expectedLP / 1000n);
    });

    it("应该更新储备量", async function () {
      const amountA = ethers.parseUnits("1000", 18);
      const amountB = ethers.parseUnits("2000", 18);

      await tokenA.approve(await amm.getAddress(), amountA);
      await tokenB.approve(await amm.getAddress(), amountB);

      await amm.addLiquidity(amountA, amountB);

      expect(await amm.reserveA()).to.equal(amountA);
      expect(await amm.reserveB()).to.equal(amountB);
    });

    it("后续添加按比例铸造 LP", async function () {
      const amountA = ethers.parseUnits("1000", 18);
      const amountB = ethers.parseUnits("2000", 18);

      // 首次
      await tokenA.approve(await amm.getAddress(), amountA);
      await tokenB.approve(await amm.getAddress(), amountB);
      await amm.addLiquidity(amountA, amountB);

      const firstLP = await amm.totalSupply();

      // 第二次（同比例）
      await tokenA.approve(await amm.getAddress(), amountA);
      await tokenB.approve(await amm.getAddress(), amountB);
      await amm.addLiquidity(amountA, amountB);

      // 同比例添加，LP 应翻倍
      expect(await amm.totalSupply()).to.equal(firstLP * 2n);
    });

    it("数量为 0 应回退", async function () {
      await expect(amm.addLiquidity(0, ethers.parseUnits("100", 18)))
        .to.be.revertedWith("Zero amount");
      await expect(amm.addLiquidity(ethers.parseUnits("100", 18), 0))
        .to.be.revertedWith("Zero amount");
    });

    it("应该触发 LiquidityAdded 事件", async function () {
      const amountA = ethers.parseUnits("1000", 18);
      const amountB = ethers.parseUnits("2000", 18);

      await tokenA.approve(await amm.getAddress(), amountA);
      await tokenB.approve(await amm.getAddress(), amountB);

      const tx = amm.addLiquidity(amountA, amountB);
      const receipt = await (await tx).wait();
      const event = receipt.logs.find((l: any) => {
        try { return amm.interface.parseLog(l)?.name === "LiquidityAdded"; } catch { return false; }
      });
      const parsed = amm.interface.parseLog(event);
      expect(parsed.args.provider).to.equal(owner.address);
      expect(parsed.args.amountA).to.equal(amountA);
      expect(parsed.args.amountB).to.equal(amountB);
      expect(parsed.args.liquidity).to.be.gt(0);
    });
  });

  describe("兑换 (swap)", function () {
    beforeEach(async function () {
      // 添加初始流动性 1000 A : 2000 B (价格比 1A = 2B)
      const amountA = ethers.parseUnits("1000", 18);
      const amountB = ethers.parseUnits("2000", 18);

      await tokenA.approve(await amm.getAddress(), amountA);
      await tokenB.approve(await amm.getAddress(), amountB);
      await amm.addLiquidity(amountA, amountB);
    });

    it("A → B 兑换应正确计算输出", async function () {
      const amountIn = ethers.parseUnits("10", 18);
      // dy = 2000e18 * 10e18 / (1000e18 + 10e18) = 20000e18 / 1010 ≈ 19.80...
      const expectedOut = (2000n * 10n * BigInt(1e18)) / (1000n + 10n);

      await tokenA.approve(await amm.getAddress(), amountIn);

      const beforeB = await tokenB.balanceOf(owner.address);
      await amm.swap(await tokenA.getAddress(), amountIn, 0);
      const afterB = await tokenB.balanceOf(owner.address);

      const received = afterB - beforeB;
      expect(received).to.equal(expectedOut);
    });

    it("B → A 兑换应正确计算输出", async function () {
      const amountIn = ethers.parseUnits("20", 18);
      // dx = 1000e18 * 20e18 / (2000e18 + 20e18) = 20000e18 / 2020 ≈ 9.90...
      const expectedOut = (1000n * 20n * BigInt(1e18)) / (2000n + 20n);

      await tokenB.approve(await amm.getAddress(), amountIn);

      const beforeA = await tokenA.balanceOf(owner.address);
      await amm.swap(await tokenB.getAddress(), amountIn, 0);
      const afterA = await tokenA.balanceOf(owner.address);

      const received = afterA - beforeA;
      expect(received).to.equal(expectedOut);
    });

    it("兑换后应更新储备量", async function () {
      const amountIn = ethers.parseUnits("10", 18);
      const expectedOut = (2000n * 10n * BigInt(1e18)) / (1000n + 10n);

      await tokenA.approve(await amm.getAddress(), amountIn);
      await amm.swap(await tokenA.getAddress(), amountIn, 0);

      expect(await amm.reserveA()).to.equal(ethers.parseUnits("1000", 18) + amountIn);
      expect(await amm.reserveB()).to.equal(ethers.parseUnits("2000", 18) - expectedOut);
    });

    it("滑点保护应生效", async function () {
      const amountIn = ethers.parseUnits("10", 18);
      const expectedOut = (2000n * 10n * BigInt(1e18)) / (1000n + 10n);

      await tokenA.approve(await amm.getAddress(), amountIn * 2n);

      // 设置 amountOutMin 高于实际输出 → 应回退
      await expect(
        amm.swap(await tokenA.getAddress(), amountIn, expectedOut + 1n)
      ).to.revert(ethers);

      // 设置 amountOutMin 低于实际输出 → 应成功
      const tx = await amm.swap(await tokenA.getAddress(), amountIn, expectedOut - 1n);
      await tx.wait();
    });

    it("不支持的代币应回退", async function () {
      await expect(
        amm.swap(owner.address, ethers.parseUnits("10", 18), 0)
      ).to.be.revertedWith("Invalid token");
    });

    it("输入为 0 应回退", async function () {
      await expect(
        amm.swap(await tokenA.getAddress(), 0, 0)
      ).to.be.revertedWith("Zero input");
    });

    it("应该触发 Swap 事件", async function () {
      const amountIn = ethers.parseUnits("10", 18);
      await tokenA.approve(await amm.getAddress(), amountIn);

      await expect(amm.swap(await tokenA.getAddress(), amountIn, 0))
        .to.emit(amm, "Swap");
    });

    it("连续多次 swap 后储备量乘积应不减少", async function () {
      // 无手续费时，由于整数截断，k 会略增（截断使输出略少，储备略多）
      const kBefore = (await amm.reserveA()) * (await amm.reserveB());

      // 第一次 swap: A → B
      const in1 = ethers.parseUnits("50", 18);
      await tokenA.approve(await amm.getAddress(), in1);
      await amm.swap(await tokenA.getAddress(), in1, 0);

      // 第二次 swap: B → A
      const in2 = ethers.parseUnits("100", 18);
      await tokenB.approve(await amm.getAddress(), in2);
      await amm.swap(await tokenB.getAddress(), in2, 0);

      const kAfter = (await amm.reserveA()) * (await amm.reserveB());
      // 整数截断使 k 不减
      expect(kAfter).to.be.gte(kBefore);
    });
  });

  describe("移除流动性", function () {
    beforeEach(async function () {
      const amountA = ethers.parseUnits("1000", 18);
      const amountB = ethers.parseUnits("2000", 18);

      await tokenA.approve(await amm.getAddress(), amountA);
      await tokenB.approve(await amm.getAddress(), amountB);
      await amm.addLiquidity(amountA, amountB);
    });

    it("移除全部流动性应取回全部代币", async function () {
      const lpAmount = await amm.balanceOf(owner.address);
      const beforeA = await tokenA.balanceOf(owner.address);
      const beforeB = await tokenB.balanceOf(owner.address);

      await amm.removeLiquidity(lpAmount);

      expect(await tokenA.balanceOf(owner.address)).to.equal(beforeA + ethers.parseUnits("1000", 18));
      expect(await tokenB.balanceOf(owner.address)).to.equal(beforeB + ethers.parseUnits("2000", 18));
      expect(await amm.reserveA()).to.equal(0);
      expect(await amm.reserveB()).to.equal(0);
    });

    it("移除一半流动性应取回约一半代币", async function () {
      const lpAmount = await amm.balanceOf(owner.address);
      const halfLP = lpAmount / 2n;

      await amm.removeLiquidity(halfLP);

      // 储备约减半（整数除法可能有 1 wei 偏差）
      const reserveA = await amm.reserveA();
      const reserveB = await amm.reserveB();
      expect(reserveA).to.be.closeTo(ethers.parseUnits("500", 18), 2n);
      expect(reserveB).to.be.closeTo(ethers.parseUnits("1000", 18), 2n);
    });

    it("LP 数量为 0 应回退", async function () {
      await expect(amm.removeLiquidity(0))
        .to.be.revertedWith("Zero liquidity");
    });

    it("LP 不足应回退", async function () {
      const lpAmount = await amm.balanceOf(owner.address);
      await expect(amm.removeLiquidity(lpAmount + 1n))
        .to.revert(ethers);
    });

    it("应该触发 LiquidityRemoved 事件", async function () {
      const lpAmount = await amm.balanceOf(owner.address);
      await expect(amm.removeLiquidity(lpAmount))
        .to.emit(amm, "LiquidityRemoved");
    });
  });

  describe("getAmountOut (纯函数)", function () {
    it("正确计算输出量", async function () {
      // 1000e18 输入，储备 1000:2000
      const amountIn = ethers.parseUnits("10", 18);
      const reserveIn = ethers.parseUnits("1000", 18);
      const reserveOut = ethers.parseUnits("2000", 18);

      const out = await amm.getAmountOut(amountIn, reserveIn, reserveOut);
      const expected = (reserveOut * amountIn) / (reserveIn + amountIn);
      expect(out).to.equal(expected);
    });

    it("输入为 0 应回退", async function () {
      await expect(
        amm.getAmountOut(0, ethers.parseUnits("1000", 18), ethers.parseUnits("2000", 18))
      ).to.be.revertedWith("Insufficient input");
    });

    it("流动性不足应回退", async function () {
      await expect(
        amm.getAmountOut(ethers.parseUnits("10", 18), 0, ethers.parseUnits("2000", 18))
      ).to.be.revertedWith("Insufficient liquidity");
    });
  });

  describe("端到端场景", function () {
    it("添加流动性 → swap → 移除流动性 全流程", async function () {
      const amountA = ethers.parseUnits("1000", 18);
      const amountB = ethers.parseUnits("2000", 18);

      // 1. 添加流动性
      await tokenA.approve(await amm.getAddress(), amountA);
      await tokenB.approve(await amm.getAddress(), amountB);
      await amm.addLiquidity(amountA, amountB);

      const lpBeforeSwap = await amm.balanceOf(owner.address);

      // 2. Swap A → B
      const swapIn = ethers.parseUnits("10", 18);
      await tokenA.approve(await amm.getAddress(), swapIn);
      await amm.swap(await tokenA.getAddress(), swapIn, 0);

      // 3. 移除流动性
      await amm.removeLiquidity(lpBeforeSwap);

      // LP 供应应为 0
      expect(await amm.totalSupply()).to.equal(0);
    });

    it("不同用户添加流动性和 swap", async function () {
      const amountA = ethers.parseUnits("1000", 18);
      const amountB = ethers.parseUnits("2000", 18);

      // owner 添加流动性
      await tokenA.approve(await amm.getAddress(), amountA);
      await tokenB.approve(await amm.getAddress(), amountB);
      await amm.addLiquidity(amountA, amountB);

      // 给 addr1 一些 tokenA 用于 swap
      const swapAmount = ethers.parseUnits("50", 18);
      await tokenA.transfer(addr1.address, swapAmount);
      await tokenA.connect(addr1).approve(await amm.getAddress(), swapAmount);

      const beforeB = await tokenB.balanceOf(addr1.address);
      await amm.connect(addr1).swap(await tokenA.getAddress(), swapAmount, 0);
      const afterB = await tokenB.balanceOf(addr1.address);

      expect(afterB).to.be.gt(beforeB);
    });
  });
});
