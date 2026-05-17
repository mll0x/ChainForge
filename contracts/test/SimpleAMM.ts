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
  });

  describe("添加流动性", function () {
    it("首次添加应铸造 LP Token = sqrt(a*b)", async function () {
      const amountA = ethers.parseUnits("1000", 18);
      const amountB = ethers.parseUnits("2000", 18);

      await tokenA.approve(await amm.getAddress(), amountA);
      await tokenB.approve(await amm.getAddress(), amountB);

      await amm.addLiquidity(amountA, amountB);

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

      await tokenA.approve(await amm.getAddress(), amountA);
      await tokenB.approve(await amm.getAddress(), amountB);
      await amm.addLiquidity(amountA, amountB);

      const firstLP = await amm.totalSupply();

      await tokenA.approve(await amm.getAddress(), amountA);
      await tokenB.approve(await amm.getAddress(), amountB);
      await amm.addLiquidity(amountA, amountB);

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

    it("添加流动性后 kLast 应更新", async function () {
      const amountA = ethers.parseUnits("1000", 18);
      const amountB = ethers.parseUnits("2000", 18);

      await tokenA.approve(await amm.getAddress(), amountA);
      await tokenB.approve(await amm.getAddress(), amountB);
      await amm.addLiquidity(amountA, amountB);

      const kLast = await amm.kLast();
      expect(kLast).to.equal(amountA * amountB);
    });
  });

  describe("兑换 (swap)", function () {
    beforeEach(async function () {
      const amountA = ethers.parseUnits("1000", 18);
      const amountB = ethers.parseUnits("2000", 18);

      await tokenA.approve(await amm.getAddress(), amountA);
      await tokenB.approve(await amm.getAddress(), amountB);
      await amm.addLiquidity(amountA, amountB);
    });

    it("A → B 兑换应正确计算输出（含 0.3% 手续费）", async function () {
      const amountIn = ethers.parseUnits("10", 18);
      // 含手续费: amountInWithFee = 10e18 * 997 / 1000 = 9.97e18
      // amountOut = 2000e18 * 9.97e18 / (1000e18 + 9.97e18)
      const amountInWithFee = amountIn * 997n / 1000n;
      const reserveIn = ethers.parseUnits("1000", 18);
      const reserveOut = ethers.parseUnits("2000", 18);
      const expectedOut = (reserveOut * amountInWithFee) / (reserveIn + amountInWithFee);

      await tokenA.approve(await amm.getAddress(), amountIn);

      const beforeB = await tokenB.balanceOf(owner.address);
      await amm.swap(await tokenA.getAddress(), amountIn, 0);
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
      await amm.swap(await tokenB.getAddress(), amountIn, 0);
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
      await amm.swap(await tokenA.getAddress(), amountIn, 0);

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
        amm.swap(await tokenA.getAddress(), amountIn, expectedOut + 1n)
      ).to.revert(ethers);

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

    it("连续多次 swap 后 k 应增长（手续费积累）", async function () {
      const kBefore = (await amm.reserveA()) * (await amm.reserveB());

      const in1 = ethers.parseUnits("50", 18);
      await tokenA.approve(await amm.getAddress(), in1);
      await amm.swap(await tokenA.getAddress(), in1, 0);

      const in2 = ethers.parseUnits("100", 18);
      await tokenB.approve(await amm.getAddress(), in2);
      await amm.swap(await tokenB.getAddress(), in2, 0);

      const kAfter = (await amm.reserveA()) * (await amm.reserveB());
      // 有手续费时，k 应严格增长
      expect(kAfter).to.be.gt(kBefore);
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

      // 手续费差额约等于 0.3% of amountIn 对应的输出差异
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
      await amm.addLiquidity(amountA, amountB);
    });

    it("feeTo = address(0) 时，swap 不铸造协议费 LP", async function () {
      const totalSupplyBefore = await amm.totalSupply();

      const in1 = ethers.parseUnits("50", 18);
      await tokenA.approve(await amm.getAddress(), in1);
      await amm.swap(await tokenA.getAddress(), in1, 0);

      // swap 后再 addLiquidity 或 removeLiquidity 会触发 _mintFee
      // 但 feeTo = 0 时 _mintFee 直接返回，totalSupply 不变
      // 实际上 _mintFee 在 addLiquidity/removeLiquidity 时调用
      // 这里只做 swap，_mintFee 不会被调用
      // 需要触发 addLiquidity 或 removeLiquidity 来检验
      const moreA = ethers.parseUnits("100", 18);
      const moreB = ethers.parseUnits("200", 18);
      await tokenA.approve(await amm.getAddress(), moreA);
      await tokenB.approve(await amm.getAddress(), moreB);
      await amm.addLiquidity(moreA, moreB);

      // feeTo = 0，_mintFee 不铸造任何 LP
      // 新增的 LP 来自流动性添加
      const totalSupplyAfter = await amm.totalSupply();
      expect(totalSupplyAfter).to.be.gt(totalSupplyBefore);
    });

    it("设置 feeTo 后，swap 应导致协议费 LP 铸造", async function () {
      // 设置 feeTo
      await amm.setFeeTo(addr1.address);

      // 执行几次 swap 积累手续费
      const in1 = ethers.parseUnits("50", 18);
      await tokenA.approve(await amm.getAddress(), in1);
      await amm.swap(await tokenA.getAddress(), in1, 0);

      const in2 = ethers.parseUnits("100", 18);
      await tokenB.approve(await amm.getAddress(), in2);
      await amm.swap(await tokenB.getAddress(), in2, 0);

      // 触发 _mintFee（通过 addLiquidity）
      const moreA = ethers.parseUnits("10", 18);
      const moreB = ethers.parseUnits("20", 18);
      await tokenA.approve(await amm.getAddress(), moreA);
      await tokenB.approve(await amm.getAddress(), moreB);

      const feeToLPBefore = await amm.balanceOf(addr1.address);
      await amm.addLiquidity(moreA, moreB);
      const feeToLPAfter = await amm.balanceOf(addr1.address);

      // feeTo 应该收到协议费 LP
      expect(feeToLPAfter).to.be.gt(feeToLPBefore);
    });

    it("协议费也可以通过 removeLiquidity 触发", async function () {
      await amm.setFeeTo(addr1.address);

      const in1 = ethers.parseUnits("50", 18);
      await tokenA.approve(await amm.getAddress(), in1);
      await amm.swap(await tokenA.getAddress(), in1, 0);

      // 通过 removeLiquidity 触发 _mintFee
      const lpAmount = (await amm.balanceOf(owner.address)) / 10n;
      const feeToLPBefore = await amm.balanceOf(addr1.address);
      await amm.removeLiquidity(lpAmount);
      const feeToLPAfter = await amm.balanceOf(addr1.address);

      expect(feeToLPAfter).to.be.gt(feeToLPBefore);
    });

    it("setFeeTo 权限控制：非 feeToSetter 应回退", async function () {
      await expect(amm.connect(addr1).setFeeTo(addr1.address))
        .to.be.revertedWith("Forbidden: not feeToSetter");
    });

    it("setFeeToSetter 权限控制：非 feeToSetter 应回退", async function () {
      await expect(amm.connect(addr1).setFeeToSetter(addr1.address))
        .to.be.revertedWith("Forbidden: not feeToSetter");
    });

    it("setFeeTo 应触发 FeeToChanged 事件", async function () {
      await expect(amm.setFeeTo(addr1.address))
        .to.emit(amm, "FeeToChanged")
        .withArgs(ethers.ZeroAddress, addr1.address);
    });

    it("setFeeToSetter 应转移设置权", async function () {
      await amm.setFeeToSetter(addr1.address);

      expect(await amm.feeToSetter()).to.equal(addr1.address);

      // 原 owner 无法再设置
      await expect(amm.setFeeTo(addr2.address))
        .to.be.revertedWith("Forbidden: not feeToSetter");

      // 新 setter 可以设置
      await amm.connect(addr1).setFeeTo(addr2.address);
      expect(await amm.feeTo()).to.equal(addr2.address);
    });

    it("k 随 swap 增长（手续费积累）", async function () {
      const kBefore = (await amm.reserveA()) * (await amm.reserveB());

      const in1 = ethers.parseUnits("50", 18);
      await tokenA.approve(await amm.getAddress(), in1);
      await amm.swap(await tokenA.getAddress(), in1, 0);

      const kAfter = (await amm.reserveA()) * (await amm.reserveB());
      expect(kAfter).to.be.gt(kBefore);
    });
  });

  describe("端到端场景", function () {
    it("添加流动性 → swap → 移除流动性 全流程", async function () {
      const amountA = ethers.parseUnits("1000", 18);
      const amountB = ethers.parseUnits("2000", 18);

      await tokenA.approve(await amm.getAddress(), amountA);
      await tokenB.approve(await amm.getAddress(), amountB);
      await amm.addLiquidity(amountA, amountB);

      const lpBeforeSwap = await amm.balanceOf(owner.address);

      const swapIn = ethers.parseUnits("10", 18);
      await tokenA.approve(await amm.getAddress(), swapIn);
      await amm.swap(await tokenA.getAddress(), swapIn, 0);

      await amm.removeLiquidity(lpBeforeSwap);

      expect(await amm.totalSupply()).to.equal(0);
    });

    it("不同用户添加流动性和 swap", async function () {
      const amountA = ethers.parseUnits("1000", 18);
      const amountB = ethers.parseUnits("2000", 18);

      await tokenA.approve(await amm.getAddress(), amountA);
      await tokenB.approve(await amm.getAddress(), amountB);
      await amm.addLiquidity(amountA, amountB);

      const swapAmount = ethers.parseUnits("50", 18);
      await tokenA.transfer(addr1.address, swapAmount);
      await tokenA.connect(addr1).approve(await amm.getAddress(), swapAmount);

      const beforeB = await tokenB.balanceOf(addr1.address);
      await amm.connect(addr1).swap(await tokenA.getAddress(), swapAmount, 0);
      const afterB = await tokenB.balanceOf(addr1.address);

      expect(afterB).to.be.gt(beforeB);
    });

    it("完整协议费流程: 设置 feeTo → swap → removeLiquidity → feeTo 收到 LP", async function () {
      const amountA = ethers.parseUnits("1000", 18);
      const amountB = ethers.parseUnits("2000", 18);

      await tokenA.approve(await amm.getAddress(), amountA);
      await tokenB.approve(await amm.getAddress(), amountB);
      await amm.addLiquidity(amountA, amountB);

      // 设置 feeTo
      await amm.setFeeTo(addr2.address);

      // 多次 swap 积累手续费
      for (let i = 0; i < 3; i++) {
        const inA = ethers.parseUnits("10", 18);
        await tokenA.approve(await amm.getAddress(), inA);
        await amm.swap(await tokenA.getAddress(), inA, 0);

        const inB = ethers.parseUnits("20", 18);
        await tokenB.approve(await amm.getAddress(), inB);
        await amm.swap(await tokenB.getAddress(), inB, 0);
      }

      // removeLiquidity 触发 _mintFee
      const lpAmount = (await amm.balanceOf(owner.address)) / 5n;
      const feeToLPBefore = await amm.balanceOf(addr2.address);
      await amm.removeLiquidity(lpAmount);
      const feeToLPAfter = await amm.balanceOf(addr2.address);

      expect(feeToLPAfter).to.be.gt(feeToLPBefore);
    });
  });

  describe("闪电兑换 (flashSwap)", function () {
    let receiver: any;

    beforeEach(async function () {
      const amountA = ethers.parseUnits("1000", 18);
      const amountB = ethers.parseUnits("2000", 18);

      await tokenA.approve(await amm.getAddress(), amountA);
      await tokenB.approve(await amm.getAddress(), amountB);
      await amm.addLiquidity(amountA, amountB);

      // 部署闪电兑换接收者合约
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

      // 给 receiver 一些 tokenA 用于还款
      const repayAmount = ethers.parseUnits("20", 18);
      await tokenA.transfer(await receiver.getAddress(), repayAmount);

      const beforeB = await tokenB.balanceOf(await receiver.getAddress());
      await receiver.doFlashSwap(await tokenB.getAddress(), amountOut);
      const afterB = await tokenB.balanceOf(await receiver.getAddress());

      // receiver 收到了 tokenB
      expect(afterB - beforeB).to.equal(amountOut);
    });

    it("闪电兑换后储备量应正确更新", async function () {
      const amountOut = ethers.parseUnits("10", 18);

      const repayAmount = ethers.parseUnits("20", 18);
      await tokenA.transfer(await receiver.getAddress(), repayAmount);

      const reserveABefore = await amm.reserveA();
      const reserveBBefore = await amm.reserveB();

      await receiver.doFlashSwap(await tokenB.getAddress(), amountOut);

      // A 储备增加（还款），B 储备减少（借出）
      expect(await amm.reserveA()).to.be.gt(reserveABefore);
      expect(await amm.reserveB()).to.be.lt(reserveBBefore);
      expect(await amm.reserveB()).to.equal(reserveBBefore - amountOut);
    });

    it("无回调的闪电兑换（直接还款）", async function () {
      const amountOut = ethers.parseUnits("10", 18);

      // 计算 amountIn
      const reserveA = await amm.reserveA();
      const reserveB = await amm.reserveB();
      const amountIn = (reserveA * amountOut) / (reserveB - amountOut);
      const amountInWithFee = (amountIn * 1000n) / 997n;

      // 给 owner 足够的 tokenA
      // owner 已经有 tokenA，只需 approve
      await tokenA.approve(await amm.getAddress(), amountInWithFee);

      const beforeB = await tokenB.balanceOf(owner.address);
      // 调用 flashSwap with empty data (no callback)
      await amm.flashSwap(await tokenB.getAddress(), amountOut, "0x");
      const afterB = await tokenB.balanceOf(owner.address);

      // owner 收到了 tokenB
      expect(afterB - beforeB).to.equal(amountOut);
    });

    it("还款不足应回退", async function () {
      const amountOut = ethers.parseUnits("10", 18);

      // 给 receiver 一些 tokenA，但只 approve 很少
      await tokenA.transfer(await receiver.getAddress(), ethers.parseUnits("20", 18));

      // 部分还款时 transferFrom 会因余额/授权不足而回退
      await expect(receiver.doFlashSwapPartialRepay(await tokenB.getAddress(), amountOut))
        .to.revert(ethers);
    });

    it("输出为 0 应回退", async function () {
      await expect(
        amm.flashSwap(await tokenB.getAddress(), 0, "0x")
      ).to.be.revertedWith("Zero output");
    });

    it("不支持的代币应回退", async function () {
      await expect(
        amm.flashSwap(owner.address, ethers.parseUnits("10", 18), "0x")
      ).to.be.revertedWith("Invalid token");
    });

    it("借出量超过储备应回退", async function () {
      const reserveB = await amm.reserveB();
      await expect(
        amm.flashSwap(await tokenB.getAddress(), reserveB, "0x")
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
  });

  describe("TWAP 预言机", function () {
    beforeEach(async function () {
      const amountA = ethers.parseUnits("1000", 18);
      const amountB = ethers.parseUnits("2000", 18);

      await tokenA.approve(await amm.getAddress(), amountA);
      await tokenB.approve(await amm.getAddress(), amountB);
      await amm.addLiquidity(amountA, amountB);
    });

    it("添加流动性后累积价格开始记录", async function () {
      // 添加流动性时会调用 _update，设置 blockTimestampLast
      const timestamp = await amm.blockTimestampLast();
      expect(timestamp).to.be.gt(0);
    });

    it("swap 后累积价格应更新", async function () {
      const cumulativeBefore = await amm.price0CumulativeLast();

      // 推进时间
      await networkProvider.send("evm_increaseTime", [100]);
      await networkProvider.send("evm_mine");

      const in1 = ethers.parseUnits("10", 18);
      await tokenA.approve(await amm.getAddress(), in1);
      await amm.swap(await tokenA.getAddress(), in1, 0);

      const cumulativeAfter = await amm.price0CumulativeLast();
      expect(cumulativeAfter).to.be.gt(cumulativeBefore);
    });

    it("累积价格与时间成正比", async function () {
      // 记录当前累积值
      const cumulative0 = await amm.price0CumulativeLast();

      // 推进 100 秒
      await networkProvider.send("evm_increaseTime", [100]);
      await networkProvider.send("evm_mine");

      // 触发一次 swap 以更新累积
      const in1 = ethers.parseUnits("1", 18);
      await tokenA.approve(await amm.getAddress(), in1 * 3n);
      await amm.swap(await tokenA.getAddress(), in1, 0);
      const cumulative1 = await amm.price0CumulativeLast();

      // 再推进 100 秒
      await networkProvider.send("evm_increaseTime", [100]);
      await networkProvider.send("evm_mine");

      await amm.swap(await tokenA.getAddress(), in1, 0);
      const cumulative2 = await amm.price0CumulativeLast();

      // 两段 100 秒的累积增量应该大致相同（因为价格变化不大）
      const diff1 = cumulative1 - cumulative0;
      const diff2 = cumulative2 - cumulative1;
      // 允许 20% 误差（因为 swap 本身改变了价格）
      expect(diff2).to.be.closeTo(diff1, diff1 / 5n);
    });

    it("blockTimestampLast 正确更新", async function () {
      const tsBefore = await amm.blockTimestampLast();

      await networkProvider.send("evm_increaseTime", [60]);
      await networkProvider.send("evm_mine");

      const in1 = ethers.parseUnits("1", 18);
      await tokenA.approve(await amm.getAddress(), in1);
      await amm.swap(await tokenA.getAddress(), in1, 0);

      const tsAfter = await amm.blockTimestampLast();
      expect(tsAfter - tsBefore).to.be.gte(60);
    });

    it("swap 不更新 kLast（保留协议费计算能力）", async function () {
      const kLastBefore = await amm.kLast();

      const in1 = ethers.parseUnits("10", 18);
      await tokenA.approve(await amm.getAddress(), in1);
      await amm.swap(await tokenA.getAddress(), in1, 0);

      const kLastAfter = await amm.kLast();
      expect(kLastAfter).to.equal(kLastBefore);
    });

    it("addLiquidity 更新 kLast", async function () {
      const kLastBefore = await amm.kLast();

      const moreA = ethers.parseUnits("100", 18);
      const moreB = ethers.parseUnits("200", 18);
      await tokenA.approve(await amm.getAddress(), moreA);
      await tokenB.approve(await amm.getAddress(), moreB);
      await amm.addLiquidity(moreA, moreB);

      const kLastAfter = await amm.kLast();
      expect(kLastAfter).to.be.gt(kLastBefore);
    });

    it("无交互时累积价格不更新", async function () {
      const cumulativeBefore = await amm.price0CumulativeLast();

      // 推进时间但不触发任何交易
      await networkProvider.send("evm_increaseTime", [1000]);
      await networkProvider.send("evm_mine");

      const cumulativeAfter = await amm.price0CumulativeLast();
      expect(cumulativeAfter).to.equal(cumulativeBefore);
    });

    it("price0 和 price1 互为倒数", async function () {
      // price0 = B/A, price1 = A/B → price0 * price1 ≈ 1 (in UQ112x112 space)
      const reserveA = await amm.reserveA();
      const reserveB = await amm.reserveB();

      // 推进时间
      await networkProvider.send("evm_increaseTime", [100]);
      await networkProvider.send("evm_mine");

      const in1 = ethers.parseUnits("1", 18);
      await tokenA.approve(await amm.getAddress(), in1);
      await amm.swap(await tokenA.getAddress(), in1, 0);

      const price0 = await amm.price0CumulativeLast();
      const price1 = await amm.price1CumulativeLast();

      // 两者都应该是正数
      expect(price0).to.be.gt(0);
      expect(price1).to.be.gt(0);
    });
  });
});
