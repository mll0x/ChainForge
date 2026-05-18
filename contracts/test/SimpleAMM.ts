import hre from "hardhat";
import { expect } from "chai";

describe("SimpleAMM", function () {
  let ethers: any;
  let networkProvider: any;
  let tokenA: any;
  let tokenB: any;
  let amm: any;
  let owner: any;
  let addr1: any;
  let addr2: any;

  const UNIT = 10n ** 18n;

  before(async function () {
    const networkConnection = await hre.network.connect();
    ethers = networkConnection.ethers;
    networkProvider = networkConnection.provider;
  });

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("MyToken");
    tokenA = await Token.deploy("Token A", "TKA", 1000000, 0);
    await tokenA.waitForDeployment();
    tokenB = await Token.deploy("Token B", "TKB", 2000000, 0);
    await tokenB.waitForDeployment();

    const SimpleAMM = await ethers.getContractFactory("SimpleAMM");
    amm = await SimpleAMM.deploy(await tokenA.getAddress(), await tokenB.getAddress());
    await amm.waitForDeployment();
  });

  function futureDeadline(): number {
    return Math.floor(Date.now() / 1000) + 3600;
  }

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

    it("feeToSetter 应为部署者", async function () {
      expect(await amm.feeToSetter()).to.equal(owner.address);
    });

    it("初始 feeTo 应为 address(0)", async function () {
      expect(await amm.feeTo()).to.equal(ethers.ZeroAddress);
    });

    it("MINIMUM_LIQUIDITY 应为 1000", async function () {
      expect(await amm.MINIMUM_LIQUIDITY()).to.equal(1000);
    });
  });

  describe("添加流动性", function () {
    it("首次添加应铸造 LP Token = sqrt(a*b) - MINIMUM_LIQUIDITY", async function () {
      const amountA = ethers.parseUnits("1000", 18);
      const amountB = ethers.parseUnits("2000", 18);

      await tokenA.approve(await amm.getAddress(), amountA);
      await tokenB.approve(await amm.getAddress(), amountB);

      await amm.addLiquidity(amountA, amountB, futureDeadline());

      const expectedLP = BigInt(Math.floor(Math.sqrt(Number(amountA * amountB)))) - 1000n;
      expect(await amm.totalSupply()).to.be.closeTo(expectedLP + 1000n, expectedLP / 1000n);
    });

    it("应该更新储备量", async function () {
      const amountA = ethers.parseUnits("1000", 18);
      const amountB = ethers.parseUnits("2000", 18);

      await tokenA.approve(await amm.getAddress(), amountA);
      await tokenB.approve(await amm.getAddress(), amountB);

      await amm.addLiquidity(amountA, amountB, futureDeadline());

      expect(await amm.reserveA()).to.equal(amountA);
      expect(await amm.reserveB()).to.equal(amountB);
    });

    it("后续添加按比例铸造 LP", async function () {
      const amountA = ethers.parseUnits("1000", 18);
      const amountB = ethers.parseUnits("2000", 18);

      await tokenA.approve(await amm.getAddress(), amountA);
      await tokenB.approve(await amm.getAddress(), amountB);
      await amm.addLiquidity(amountA, amountB, futureDeadline());

      const firstLP = await amm.totalSupply();

      await tokenA.approve(await amm.getAddress(), amountA);
      await tokenB.approve(await amm.getAddress(), amountB);
      await amm.addLiquidity(amountA, amountB, futureDeadline());

      expect(await amm.totalSupply()).to.equal(firstLP * 2n);
    });

    it("数量为 0 应回退", async function () {
      await expect(amm.addLiquidity(0, ethers.parseUnits("100", 18), futureDeadline()))
        .to.be.revertedWith("Zero amount");
      await expect(amm.addLiquidity(ethers.parseUnits("100", 18), 0, futureDeadline()))
        .to.be.revertedWith("Zero amount");
    });

    it("首次流动性过少应回退", async function () {
      await tokenA.approve(await amm.getAddress(), 1000);
      await tokenB.approve(await amm.getAddress(), 1000);
      await expect(amm.addLiquidity(1000, 1000, futureDeadline()))
        .to.be.revertedWith("Insufficient initial liquidity");
    });

    it("应该触发 LiquidityAdded 事件", async function () {
      const amountA = ethers.parseUnits("1000", 18);
      const amountB = ethers.parseUnits("2000", 18);

      await tokenA.approve(await amm.getAddress(), amountA);
      await tokenB.approve(await amm.getAddress(), amountB);

      const tx = amm.addLiquidity(amountA, amountB, futureDeadline());
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

    it("添加流动性后 kLast 应更新", async function () {
      const amountA = ethers.parseUnits("1000", 18);
      const amountB = ethers.parseUnits("2000", 18);

      await tokenA.approve(await amm.getAddress(), amountA);
      await tokenB.approve(await amm.getAddress(), amountB);
      await amm.addLiquidity(amountA, amountB, futureDeadline());

      const kLast = await amm.kLast();
      expect(kLast).to.equal(amountA * amountB);
    });

    it("deadline 过期应回退", async function () {
      const amountA = ethers.parseUnits("1000", 18);
      const amountB = ethers.parseUnits("2000", 18);
      await tokenA.approve(await amm.getAddress(), amountA);
      await tokenB.approve(await amm.getAddress(), amountB);
      await expect(amm.addLiquidity(amountA, amountB, 1))
        .to.be.revertedWith("Transaction expired");
    });
  });

  describe("兑换 (swap)", function () {
    beforeEach(async function () {
      const amountA = ethers.parseUnits("1000", 18);
      const amountB = ethers.parseUnits("2000", 18);

      await tokenA.approve(await amm.getAddress(), amountA);
      await tokenB.approve(await amm.getAddress(), amountB);
      await amm.addLiquidity(amountA, amountB, futureDeadline());
    });

    it("A → B 兑换应正确计算输出（含 0.3% 手续费）", async function () {
      const amountIn = ethers.parseUnits("10", 18);
      const amountInWithFee = amountIn * 997n / 1000n;
      const reserveIn = ethers.parseUnits("1000", 18);
      const reserveOut = ethers.parseUnits("2000", 18);
      const expectedOut = (reserveOut * amountInWithFee) / (reserveIn + amountInWithFee);

      await tokenA.approve(await amm.getAddress(), amountIn);

      const beforeB = await tokenB.balanceOf(owner.address);
      await amm.swap(await tokenA.getAddress(), amountIn, 0, futureDeadline());
      const afterB = await tokenB.balanceOf(owner.address);

      const received = afterB - beforeB;
      expect(received).to.equal(expectedOut);
    });

    it("B → A 兑换应正确计算输出（含 0.3% 手续费）", async function () {
      const amountIn = ethers.parseUnits("20", 18);
      const amountInWithFee = amountIn * 997n / 1000n;
      const reserveIn = ethers.parseUnits("2000", 18);
      const reserveOut = ethers.parseUnits("1000", 18);
      const expectedOut = (reserveOut * amountInWithFee) / (reserveIn + amountInWithFee);

      await tokenB.approve(await amm.getAddress(), amountIn);

      const beforeA = await tokenA.balanceOf(owner.address);
      await amm.swap(await tokenB.getAddress(), amountIn, 0, futureDeadline());
      const afterA = await tokenA.balanceOf(owner.address);

      const received = afterA - beforeA;
      expect(received).to.equal(expectedOut);
    });

    it("兑换后应更新储备量", async function () {
      const amountIn = ethers.parseUnits("10", 18);
      const amountInWithFee = amountIn * 997n / 1000n;
      const reserveIn = ethers.parseUnits("1000", 18);
      const reserveOut = ethers.parseUnits("2000", 18);
      const expectedOut = (reserveOut * amountInWithFee) / (reserveIn + amountInWithFee);

      await tokenA.approve(await amm.getAddress(), amountIn);
      await amm.swap(await tokenA.getAddress(), amountIn, 0, futureDeadline());

      expect(await amm.reserveA()).to.equal(ethers.parseUnits("1000", 18) + amountIn);
      expect(await amm.reserveB()).to.equal(ethers.parseUnits("2000", 18) - expectedOut);
    });

    it("滑点保护应生效", async function () {
      const amountIn = ethers.parseUnits("10", 18);
      const amountInWithFee = amountIn * 997n / 1000n;
      const reserveIn = ethers.parseUnits("1000", 18);
      const reserveOut = ethers.parseUnits("2000", 18);
      const expectedOut = (reserveOut * amountInWithFee) / (reserveIn + amountInWithFee);

      await tokenA.approve(await amm.getAddress(), amountIn * 2n);

      await expect(
        amm.swap(await tokenA.getAddress(), amountIn, expectedOut + 1n, futureDeadline())
      ).to.revert(ethers);

      const tx = await amm.swap(await tokenA.getAddress(), amountIn, expectedOut - 1n, futureDeadline());
      await tx.wait();
    });

    it("不支持的代币应回退", async function () {
      await expect(
        amm.swap(owner.address, ethers.parseUnits("10", 18), 0, futureDeadline())
      ).to.be.revertedWith("Invalid token");
    });

    it("输入为 0 应回退", async function () {
      await expect(
        amm.swap(await tokenA.getAddress(), 0, 0, futureDeadline())
      ).to.be.revertedWith("Zero input");
    });

    it("应该触发 Swap 事件", async function () {
      const amountIn = ethers.parseUnits("10", 18);
      await tokenA.approve(await amm.getAddress(), amountIn);

      await expect(amm.swap(await tokenA.getAddress(), amountIn, 0, futureDeadline()))
        .to.emit(amm, "Swap");
    });

    it("连续多次 swap 后 k 应增长（手续费积累）", async function () {
      const kBefore = (await amm.reserveA()) * (await amm.reserveB());

      const in1 = ethers.parseUnits("50", 18);
      await tokenA.approve(await amm.getAddress(), in1);
      await amm.swap(await tokenA.getAddress(), in1, 0, futureDeadline());

      const in2 = ethers.parseUnits("100", 18);
      await tokenB.approve(await amm.getAddress(), in2);
      await amm.swap(await tokenB.getAddress(), in2, 0, futureDeadline());

      const kAfter = (await amm.reserveA()) * (await amm.reserveB());
      expect(kAfter).to.be.gt(kBefore);
    });

    it("deadline 过期应回退", async function () {
      await tokenA.approve(await amm.getAddress(), ethers.parseUnits("10", 18));
      await expect(amm.swap(await tokenA.getAddress(), ethers.parseUnits("10", 18), 0, 1))
        .to.be.revertedWith("Transaction expired");
    });
  });

  describe("移除流动性", function () {
    beforeEach(async function () {
      const amountA = ethers.parseUnits("1000", 18);
      const amountB = ethers.parseUnits("2000", 18);

      await tokenA.approve(await amm.getAddress(), amountA);
      await tokenB.approve(await amm.getAddress(), amountB);
      await amm.addLiquidity(amountA, amountB, futureDeadline());
    });

    it("移除全部流动性应取回几乎全部代币（扣除永久锁定的 MINIMUM_LIQUIDITY）", async function () {
      const lpAmount = await amm.balanceOf(owner.address);
      const beforeA = await tokenA.balanceOf(owner.address);
      const beforeB = await tokenB.balanceOf(owner.address);

      await amm.removeLiquidity(lpAmount, futureDeadline());

      // MINIMUM_LIQUIDITY 永久锁定，reserve 不会到 0
      expect(await tokenA.balanceOf(owner.address)).to.be.closeTo(beforeA + ethers.parseUnits("1000", 18), ethers.parseUnits("1", 15));
      expect(await tokenB.balanceOf(owner.address)).to.be.closeTo(beforeB + ethers.parseUnits("2000", 18), ethers.parseUnits("1", 15));
      expect(await amm.reserveA()).to.be.lt(ethers.parseUnits("1", 15));
      expect(await amm.reserveB()).to.be.lt(ethers.parseUnits("1", 15));
    });

    it("移除一半流动性应取回约一半代币", async function () {
      const lpAmount = await amm.balanceOf(owner.address);
      const halfLP = lpAmount / 2n;

      await amm.removeLiquidity(halfLP, futureDeadline());

      const reserveA = await amm.reserveA();
      const reserveB = await amm.reserveB();
      expect(reserveA).to.be.closeTo(ethers.parseUnits("500", 18), ethers.parseUnits("1", 15));
      expect(reserveB).to.be.closeTo(ethers.parseUnits("1000", 18), ethers.parseUnits("1", 15));
    });

    it("LP 数量为 0 应回退", async function () {
      await expect(amm.removeLiquidity(0, futureDeadline()))
        .to.be.revertedWith("Zero liquidity");
    });

    it("LP 不足应回退", async function () {
      const lpAmount = await amm.balanceOf(owner.address);
      await expect(amm.removeLiquidity(lpAmount + 1n, futureDeadline()))
        .to.revert(ethers);
    });

    it("应该触发 LiquidityRemoved 事件", async function () {
      const lpAmount = await amm.balanceOf(owner.address);
      await expect(amm.removeLiquidity(lpAmount, futureDeadline()))
        .to.emit(amm, "LiquidityRemoved");
    });

    it("deadline 过期应回退", async function () {
      const lpAmount = await amm.balanceOf(owner.address);
      await expect(amm.removeLiquidity(lpAmount, 1))
        .to.be.revertedWith("Transaction expired");
    });
  });

  describe("getAmountOut (含手续费)", function () {
    it("正确计算输出量（含 0.3% 手续费）", async function () {
      const amountIn = ethers.parseUnits("10", 18);
      const reserveIn = ethers.parseUnits("1000", 18);
      const reserveOut = ethers.parseUnits("2000", 18);

      const out = await amm.getAmountOut(amountIn, reserveIn, reserveOut);

      const amountInWithFee = amountIn * 997n / 1000n;
      const expected = (reserveOut * amountInWithFee) / (reserveIn + amountInWithFee);
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

    it("有手续费时输出应小于无手续费时", async function () {
      const amountIn = ethers.parseUnits("10", 18);
      const reserveIn = ethers.parseUnits("1000", 18);
      const reserveOut = ethers.parseUnits("2000", 18);

      const outWithFee = await amm.getAmountOut(amountIn, reserveIn, reserveOut);
      const outWithoutFee = (reserveOut * amountIn) / (reserveIn + amountIn);

      expect(outWithFee).to.be.lt(outWithoutFee);
    });

    it("手续费精确扣减 0.3%", async function () {
      const amountIn = ethers.parseUnits("1000", 18);
      const reserveIn = ethers.parseUnits("10000", 18);
      const reserveOut = ethers.parseUnits("10000", 18);

      const outWithFee = await amm.getAmountOut(amountIn, reserveIn, reserveOut);
      const outWithoutFee = (reserveOut * amountIn) / (reserveIn + amountIn);

      const feeDiff = outWithoutFee - outWithFee;
      expect(feeDiff).to.be.gt(0);
    });
  });

  describe("协议费 (feeTo)", function () {
    beforeEach(async function () {
      const amountA = ethers.parseUnits("1000", 18);
      const amountB = ethers.parseUnits("2000", 18);

      await tokenA.approve(await amm.getAddress(), amountA);
      await tokenB.approve(await amm.getAddress(), amountB);
      await amm.addLiquidity(amountA, amountB, futureDeadline());
    });

    it("feeTo = address(0) 时，swap 不铸造协议费 LP", async function () {
      const totalSupplyBefore = await amm.totalSupply();

      const in1 = ethers.parseUnits("50", 18);
      await tokenA.approve(await amm.getAddress(), in1);
      await amm.swap(await tokenA.getAddress(), in1, 0, futureDeadline());

      const moreA = ethers.parseUnits("100", 18);
      const moreB = ethers.parseUnits("200", 18);
      await tokenA.approve(await amm.getAddress(), moreA);
      await tokenB.approve(await amm.getAddress(), moreB);
      await amm.addLiquidity(moreA, moreB, futureDeadline());

      const totalSupplyAfter = await amm.totalSupply();
      expect(totalSupplyAfter).to.be.gt(totalSupplyBefore);
    });

    it("设置 feeTo 后，swap 应导致协议费 LP 铸造", async function () {
      await amm.setFeeTo(addr1.address);

      const in1 = ethers.parseUnits("50", 18);
      await tokenA.approve(await amm.getAddress(), in1);
      await amm.swap(await tokenA.getAddress(), in1, 0, futureDeadline());

      const in2 = ethers.parseUnits("100", 18);
      await tokenB.approve(await amm.getAddress(), in2);
      await amm.swap(await tokenB.getAddress(), in2, 0, futureDeadline());

      const moreA = ethers.parseUnits("10", 18);
      const moreB = ethers.parseUnits("20", 18);
      await tokenA.approve(await amm.getAddress(), moreA);
      await tokenB.approve(await amm.getAddress(), moreB);

      const feeToLPBefore = await amm.balanceOf(addr1.address);
      await amm.addLiquidity(moreA, moreB, futureDeadline());
      const feeToLPAfter = await amm.balanceOf(addr1.address);

      expect(feeToLPAfter).to.be.gt(feeToLPBefore);
    });

    it("协议费也可以通过 removeLiquidity 触发", async function () {
      await amm.setFeeTo(addr1.address);

      const in1 = ethers.parseUnits("50", 18);
      await tokenA.approve(await amm.getAddress(), in1);
      await amm.swap(await tokenA.getAddress(), in1, 0, futureDeadline());

      const lpAmount = (await amm.balanceOf(owner.address)) / 10n;
      const feeToLPBefore = await amm.balanceOf(addr1.address);
      await amm.removeLiquidity(lpAmount, futureDeadline());
      const feeToLPAfter = await amm.balanceOf(addr1.address);

      expect(feeToLPAfter).to.be.gt(feeToLPBefore);
    });

    it("setFeeTo 权限控制：非 feeToSetter 应回退", async function () {
      await expect(amm.connect(addr1).setFeeTo(addr1.address))
        .to.be.revertedWith("Forbidden: not feeToSetter");
    });

    it("proposeFeeToSetter 权限控制：非 feeToSetter 应回退", async function () {
      await expect(amm.connect(addr1).proposeFeeToSetter(addr1.address))
        .to.be.revertedWith("Forbidden: not feeToSetter");
    });

    it("acceptFeeToSetter 权限控制：非 pending setter 应回退", async function () {
      await expect(amm.acceptFeeToSetter())
        .to.be.revertedWith("Forbidden: not pending feeToSetter");
    });

    it("two-step feeToSetter 转移流程", async function () {
      await amm.proposeFeeToSetter(addr1.address);
      expect(await amm.pendingFeeToSetter()).to.equal(addr1.address);

      await amm.connect(addr1).acceptFeeToSetter();
      expect(await amm.feeToSetter()).to.equal(addr1.address);
      expect(await amm.pendingFeeToSetter()).to.equal(ethers.ZeroAddress);

      await expect(amm.setFeeTo(addr2.address))
        .to.be.revertedWith("Forbidden: not feeToSetter");

      await amm.connect(addr1).setFeeTo(addr2.address);
      expect(await amm.feeTo()).to.equal(addr2.address);
    });

    it("setFeeTo 应触发 FeeToChanged 事件", async function () {
      await expect(amm.setFeeTo(addr1.address))
        .to.emit(amm, "FeeToChanged")
        .withArgs(ethers.ZeroAddress, addr1.address);
    });

    it("k 随 swap 增长（手续费积累）", async function () {
      const kBefore = (await amm.reserveA()) * (await amm.reserveB());

      const in1 = ethers.parseUnits("50", 18);
      await tokenA.approve(await amm.getAddress(), in1);
      await amm.swap(await tokenA.getAddress(), in1, 0, futureDeadline());

      const kAfter = (await amm.reserveA()) * (await amm.reserveB());
      expect(kAfter).to.be.gt(kBefore);
    });
  });

  describe("Pausable 紧急暂停", function () {
    beforeEach(async function () {
      const amountA = ethers.parseUnits("1000", 18);
      const amountB = ethers.parseUnits("2000", 18);
      await tokenA.approve(await amm.getAddress(), amountA);
      await tokenB.approve(await amm.getAddress(), amountB);
      await amm.addLiquidity(amountA, amountB, futureDeadline());
    });

    it("Owner 可以暂停合约", async function () {
      await amm.pause();
      expect(await amm.paused()).to.equal(true);
    });

    it("非 Owner 不能暂停", async function () {
      await expect(amm.connect(addr1).pause())
        .to.be.revertedWithCustomError(amm, "OwnableUnauthorizedAccount");
    });

    it("暂停后 swap 应回退", async function () {
      await amm.pause();
      await tokenA.approve(await amm.getAddress(), ethers.parseUnits("10", 18));
      await expect(amm.swap(await tokenA.getAddress(), ethers.parseUnits("10", 18), 0, futureDeadline()))
        .to.be.revertedWithCustomError(amm, "EnforcedPause");
    });

    it("暂停后 addLiquidity 应回退", async function () {
      await amm.pause();
      await tokenA.approve(await amm.getAddress(), ethers.parseUnits("100", 18));
      await tokenB.approve(await amm.getAddress(), ethers.parseUnits("200", 18));
      await expect(amm.addLiquidity(ethers.parseUnits("100", 18), ethers.parseUnits("200", 18), futureDeadline()))
        .to.be.revertedWithCustomError(amm, "EnforcedPause");
    });

    it("暂停后 removeLiquidity 仍可用", async function () {
      await amm.pause();
      const lpAmount = await amm.balanceOf(owner.address);
      await amm.removeLiquidity(lpAmount, futureDeadline());
    });

    it("Owner 可以恢复合约", async function () {
      await amm.pause();
      await amm.unpause();
      expect(await amm.paused()).to.equal(false);
    });

    it("恢复后 swap 恢复正常", async function () {
      await amm.pause();
      await amm.unpause();
      await tokenA.approve(await amm.getAddress(), ethers.parseUnits("10", 18));
      await amm.swap(await tokenA.getAddress(), ethers.parseUnits("10", 18), 0, futureDeadline());
    });
  });

  describe("Sync / Skim", function () {
    beforeEach(async function () {
      const amountA = ethers.parseUnits("1000", 18);
      const amountB = ethers.parseUnits("2000", 18);
      await tokenA.approve(await amm.getAddress(), amountA);
      await tokenB.approve(await amm.getAddress(), amountB);
      await amm.addLiquidity(amountA, amountB, futureDeadline());
    });

    it("sync 应同步储备量与余额", async function () {
      // 直接转账给 AMM（不通过 addLiquidity）
      await tokenA.transfer(await amm.getAddress(), ethers.parseUnits("100", 18));
      expect(await tokenA.balanceOf(await amm.getAddress())).to.not.equal(await amm.reserveA());

      await amm.sync();
      expect(await amm.reserveA()).to.equal(await tokenA.balanceOf(await amm.getAddress()));
    });

    it("sync 应触发 Sync 事件", async function () {
      await expect(amm.sync()).to.emit(amm, "Sync");
    });

    it("skim 应将多余余额转给指定地址", async function () {
      await tokenA.transfer(await amm.getAddress(), ethers.parseUnits("100", 18));
      const before = await tokenA.balanceOf(addr1.address);
      await amm.skim(addr1.address);
      const after = await tokenA.balanceOf(addr1.address);
      expect(after - before).to.equal(ethers.parseUnits("100", 18));
    });
  });

  describe("闪电兑换 (flashSwap)", function () {
    let receiver: any;

    beforeEach(async function () {
      const amountA = ethers.parseUnits("1000", 18);
      const amountB = ethers.parseUnits("2000", 18);

      await tokenA.approve(await amm.getAddress(), amountA);
      await tokenB.approve(await amm.getAddress(), amountB);
      await amm.addLiquidity(amountA, amountB, futureDeadline());

      const Receiver = await ethers.getContractFactory("FlashSwapReceiver");
      receiver = await Receiver.deploy(
        await amm.getAddress(),
        await tokenA.getAddress(),
        await tokenB.getAddress()
      );
      await receiver.waitForDeployment();
    });

    it("简单闪电兑换：借 tokenB，在回调中用 tokenA 还款", async function () {
      const amountOut = ethers.parseUnits("10", 18);

      const repayAmount = ethers.parseUnits("20", 18);
      await tokenA.transfer(await receiver.getAddress(), repayAmount);

      const beforeB = await tokenB.balanceOf(await receiver.getAddress());
      await receiver.doFlashSwap(await tokenB.getAddress(), amountOut);
      const afterB = await tokenB.balanceOf(await receiver.getAddress());

      expect(afterB - beforeB).to.equal(amountOut);
    });

    it("闪电兑换后储备量应正确更新", async function () {
      const amountOut = ethers.parseUnits("10", 18);

      const repayAmount = ethers.parseUnits("20", 18);
      await tokenA.transfer(await receiver.getAddress(), repayAmount);

      const reserveABefore = await amm.reserveA();
      const reserveBBefore = await amm.reserveB();

      await receiver.doFlashSwap(await tokenB.getAddress(), amountOut);

      expect(await amm.reserveA()).to.be.gt(reserveABefore);
      expect(await amm.reserveB()).to.be.lt(reserveBBefore);
      expect(await amm.reserveB()).to.equal(reserveBBefore - amountOut);
    });

    it("无回调的闪电兑换（直接还款）", async function () {
      const amountOut = ethers.parseUnits("10", 18);

      const reserveA = await amm.reserveA();
      const reserveB = await amm.reserveB();
      const amountIn = (reserveA * amountOut) / (reserveB - amountOut);
      const amountInWithFee = (amountIn * 1000n) / 997n;

      await tokenA.approve(await amm.getAddress(), amountInWithFee);

      const beforeB = await tokenB.balanceOf(owner.address);
      await amm.flashSwap(await tokenB.getAddress(), amountOut, "0x", futureDeadline());
      const afterB = await tokenB.balanceOf(owner.address);

      expect(afterB - beforeB).to.equal(amountOut);
    });

    it("还款不足应回退", async function () {
      const amountOut = ethers.parseUnits("10", 18);

      await tokenA.transfer(await receiver.getAddress(), ethers.parseUnits("20", 18));

      await expect(receiver.doFlashSwapPartialRepay(await tokenB.getAddress(), amountOut))
        .to.revert(ethers);
    });

    it("输出为 0 应回退", async function () {
      await expect(
        amm.flashSwap(await tokenB.getAddress(), 0, "0x", futureDeadline())
      ).to.be.revertedWith("Zero output");
    });

    it("不支持的代币应回退", async function () {
      await expect(
        amm.flashSwap(owner.address, ethers.parseUnits("10", 18), "0x", futureDeadline())
      ).to.be.revertedWith("Invalid token");
    });

    it("借出量超过储备应回退", async function () {
      const reserveB = await amm.reserveB();
      await expect(
        amm.flashSwap(await tokenB.getAddress(), reserveB, "0x", futureDeadline())
      ).to.be.revertedWith("Insufficient liquidity");
    });

    it("闪电兑换后 k 应增长（手续费积累）", async function () {
      const kBefore = (await amm.reserveA()) * (await amm.reserveB());

      const amountOut = ethers.parseUnits("10", 18);
      const repayAmount = ethers.parseUnits("20", 18);
      await tokenA.transfer(await receiver.getAddress(), repayAmount);
      await receiver.doFlashSwap(await tokenB.getAddress(), amountOut);

      const kAfter = (await amm.reserveA()) * (await amm.reserveB());
      expect(kAfter).to.be.gte(kBefore);
    });

    it("deadline 过期应回退", async function () {
      await expect(
        amm.flashSwap(await tokenB.getAddress(), ethers.parseUnits("10", 18), "0x", 1)
      ).to.be.revertedWith("Transaction expired");
    });
  });

  describe("TWAP 预言机", function () {
    beforeEach(async function () {
      const amountA = ethers.parseUnits("1000", 18);
      const amountB = ethers.parseUnits("2000", 18);

      await tokenA.approve(await amm.getAddress(), amountA);
      await tokenB.approve(await amm.getAddress(), amountB);
      await amm.addLiquidity(amountA, amountB, futureDeadline());
    });

    it("添加流动性后累积价格开始记录", async function () {
      const timestamp = await amm.blockTimestampLast();
      expect(timestamp).to.be.gt(0);
    });

    it("swap 后累积价格应更新", async function () {
      const cumulativeBefore = await amm.price0CumulativeLast();

      await networkProvider.send("evm_increaseTime", [100]);
      await networkProvider.send("evm_mine");

      const in1 = ethers.parseUnits("10", 18);
      await tokenA.approve(await amm.getAddress(), in1);
      await amm.swap(await tokenA.getAddress(), in1, 0, futureDeadline());

      const cumulativeAfter = await amm.price0CumulativeLast();
      expect(cumulativeAfter).to.be.gt(cumulativeBefore);
    });

    it("累积价格与时间成正比", async function () {
      const cumulative0 = await amm.price0CumulativeLast();

      await networkProvider.send("evm_increaseTime", [100]);
      await networkProvider.send("evm_mine");

      const in1 = ethers.parseUnits("1", 18);
      await tokenA.approve(await amm.getAddress(), in1 * 3n);
      await amm.swap(await tokenA.getAddress(), in1, 0, futureDeadline());
      const cumulative1 = await amm.price0CumulativeLast();

      await networkProvider.send("evm_increaseTime", [100]);
      await networkProvider.send("evm_mine");

      await amm.swap(await tokenA.getAddress(), in1, 0, futureDeadline());
      const cumulative2 = await amm.price0CumulativeLast();

      const diff1 = cumulative1 - cumulative0;
      const diff2 = cumulative2 - cumulative1;
      expect(diff2).to.be.closeTo(diff1, diff1 / 5n);
    });

    it("blockTimestampLast 正确更新", async function () {
      const tsBefore = await amm.blockTimestampLast();

      await networkProvider.send("evm_increaseTime", [60]);
      await networkProvider.send("evm_mine");

      const in1 = ethers.parseUnits("1", 18);
      await tokenA.approve(await amm.getAddress(), in1);
      await amm.swap(await tokenA.getAddress(), in1, 0, futureDeadline());

      const tsAfter = await amm.blockTimestampLast();
      expect(tsAfter - tsBefore).to.be.gte(60);
    });

    it("swap 不更新 kLast", async function () {
      const kLastBefore = await amm.kLast();

      const in1 = ethers.parseUnits("10", 18);
      await tokenA.approve(await amm.getAddress(), in1);
      await amm.swap(await tokenA.getAddress(), in1, 0, futureDeadline());

      const kLastAfter = await amm.kLast();
      expect(kLastAfter).to.equal(kLastBefore);
    });

    it("addLiquidity 更新 kLast", async function () {
      const kLastBefore = await amm.kLast();

      const moreA = ethers.parseUnits("100", 18);
      const moreB = ethers.parseUnits("200", 18);
      await tokenA.approve(await amm.getAddress(), moreA);
      await tokenB.approve(await amm.getAddress(), moreB);
      await amm.addLiquidity(moreA, moreB, futureDeadline());

      const kLastAfter = await amm.kLast();
      expect(kLastAfter).to.be.gt(kLastBefore);
    });

    it("无交互时累积价格不更新", async function () {
      const cumulativeBefore = await amm.price0CumulativeLast();

      await networkProvider.send("evm_increaseTime", [1000]);
      await networkProvider.send("evm_mine");

      const cumulativeAfter = await amm.price0CumulativeLast();
      expect(cumulativeAfter).to.equal(cumulativeBefore);
    });

    it("price0 和 price1 互为倒数", async function () {
      const reserveA = await amm.reserveA();
      const reserveB = await amm.reserveB();

      await networkProvider.send("evm_increaseTime", [100]);
      await networkProvider.send("evm_mine");

      const in1 = ethers.parseUnits("1", 18);
      await tokenA.approve(await amm.getAddress(), in1);
      await amm.swap(await tokenA.getAddress(), in1, 0, futureDeadline());

      const price0 = await amm.price0CumulativeLast();
      const price1 = await amm.price1CumulativeLast();

      expect(price0).to.be.gt(0);
      expect(price1).to.be.gt(0);
    });
  });

  describe("端到端场景", function () {
    it("添加流动性 → swap → 移除流动性 全流程", async function () {
      const amountA = ethers.parseUnits("1000", 18);
      const amountB = ethers.parseUnits("2000", 18);

      await tokenA.approve(await amm.getAddress(), amountA);
      await tokenB.approve(await amm.getAddress(), amountB);
      await amm.addLiquidity(amountA, amountB, futureDeadline());

      const lpBeforeSwap = await amm.balanceOf(owner.address);

      const swapIn = ethers.parseUnits("10", 18);
      await tokenA.approve(await amm.getAddress(), swapIn);
      await amm.swap(await tokenA.getAddress(), swapIn, 0, futureDeadline());

      await amm.removeLiquidity(lpBeforeSwap, futureDeadline());

      expect(await amm.totalSupply()).to.equal(await amm.MINIMUM_LIQUIDITY());
    });

    it("不同用户添加流动性和 swap", async function () {
      const amountA = ethers.parseUnits("1000", 18);
      const amountB = ethers.parseUnits("2000", 18);

      await tokenA.approve(await amm.getAddress(), amountA);
      await tokenB.approve(await amm.getAddress(), amountB);
      await amm.addLiquidity(amountA, amountB, futureDeadline());

      const swapAmount = ethers.parseUnits("50", 18);
      await tokenA.transfer(addr1.address, swapAmount);
      await tokenA.connect(addr1).approve(await amm.getAddress(), swapAmount);

      const beforeB = await tokenB.balanceOf(addr1.address);
      await amm.connect(addr1).swap(await tokenA.getAddress(), swapAmount, 0, futureDeadline());
      const afterB = await tokenB.balanceOf(addr1.address);

      expect(afterB).to.be.gt(beforeB);
    });

    it("完整协议费流程", async function () {
      const amountA = ethers.parseUnits("1000", 18);
      const amountB = ethers.parseUnits("2000", 18);

      await tokenA.approve(await amm.getAddress(), amountA);
      await tokenB.approve(await amm.getAddress(), amountB);
      await amm.addLiquidity(amountA, amountB, futureDeadline());

      await amm.setFeeTo(addr2.address);

      for (let i = 0; i < 3; i++) {
        const inA = ethers.parseUnits("10", 18);
        await tokenA.approve(await amm.getAddress(), inA);
        await amm.swap(await tokenA.getAddress(), inA, 0, futureDeadline());

        const inB = ethers.parseUnits("20", 18);
        await tokenB.approve(await amm.getAddress(), inB);
        await amm.swap(await tokenB.getAddress(), inB, 0, futureDeadline());
      }

      const lpAmount = (await amm.balanceOf(owner.address)) / 5n;
      const feeToLPBefore = await amm.balanceOf(addr2.address);
      await amm.removeLiquidity(lpAmount, futureDeadline());
      const feeToLPAfter = await amm.balanceOf(addr2.address);

      expect(feeToLPAfter).to.be.gt(feeToLPBefore);
    });
  });

  describe("Permit 免授权", function () {
    async function signPermit(
      token: any,
      owner: any,
      spender: string,
      value: bigint,
      deadline: number
    ) {
      const domain = {
        name: await token.name(),
        version: "1",
        chainId: 31337, // hardhat local network
        verifyingContract: await token.getAddress(),
      };

      const types = {
        Permit: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
          { name: "value", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
      };

      const permitValue = {
        owner: owner.address,
        spender,
        value,
        nonce: await token.nonces(owner.address),
        deadline,
      };

      const signature = await owner.signTypedData(domain, types, permitValue);
      return ethers.Signature.from(signature);
    }

    beforeEach(async function () {
      const amountA = ethers.parseUnits("1000", 18);
      const amountB = ethers.parseUnits("2000", 18);
      await tokenA.approve(await amm.getAddress(), amountA);
      await tokenB.approve(await amm.getAddress(), amountB);
      await amm.addLiquidity(amountA, amountB, futureDeadline());
    });

    it("swapWithPermit 无需预先 approve", async function () {
      const amountIn = ethers.parseUnits("10", 18);
      const permitDeadline = futureDeadline();
      const { v, r, s } = await signPermit(tokenA, owner, await amm.getAddress(), amountIn, permitDeadline);

      // 确保没有预先 approve
      expect(await tokenA.allowance(owner.address, await amm.getAddress())).to.equal(0);

      const beforeB = await tokenB.balanceOf(owner.address);
      await amm.swapWithPermit(
        await tokenA.getAddress(), amountIn, 0, futureDeadline(),
        v, r, s, permitDeadline
      );
      const afterB = await tokenB.balanceOf(owner.address);

      expect(afterB).to.be.gt(beforeB);
    });

    it("addLiquidityWithPermit 无需 tokenA 预先 approve", async function () {
      const amountA = ethers.parseUnits("100", 18);
      const amountB = ethers.parseUnits("200", 18);
      const permitDeadline = futureDeadline();
      const { v, r, s } = await signPermit(tokenA, owner, await amm.getAddress(), amountA, permitDeadline);

      // tokenA 无授权，tokenB 已授权
      expect(await tokenA.allowance(owner.address, await amm.getAddress())).to.equal(0);
      await tokenB.approve(await amm.getAddress(), amountB);

      const lpBefore = await amm.balanceOf(owner.address);
      await amm.addLiquidityWithPermit(
        amountA, amountB, futureDeadline(),
        v, r, s, permitDeadline
      );
      const lpAfter = await amm.balanceOf(owner.address);

      expect(lpAfter).to.be.gt(lpBefore);
    });

    it("swapWithPermit 使用错误签名应回退", async function () {
      const amountIn = ethers.parseUnits("10", 18);
      const permitDeadline = futureDeadline();

      await expect(
        amm.swapWithPermit(
          await tokenA.getAddress(), amountIn, 0, futureDeadline(),
          27, ethers.ZeroHash, ethers.ZeroHash, permitDeadline
        )
      ).to.revert(ethers);
    });

    it("permit 后 allowance 应正确设置", async function () {
      const amountIn = ethers.parseUnits("10", 18);
      const permitDeadline = futureDeadline();
      const { v, r, s } = await signPermit(tokenA, owner, await amm.getAddress(), amountIn, permitDeadline);

      expect(await tokenA.allowance(owner.address, await amm.getAddress())).to.equal(0);

      await tokenA.permit(owner.address, await amm.getAddress(), amountIn, permitDeadline, v, r, s);

      expect(await tokenA.allowance(owner.address, await amm.getAddress())).to.equal(amountIn);
    });
  });
});
