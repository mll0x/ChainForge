import hre from "hardhat";

async function main() {
  const { ethers } = await hre.network.connect();
  const deployer = (await ethers.getSigners())[0];
  console.log("=== 部署 SimpleAMM + 两个 ERC-20 代币 ===\n");
  console.log("Deployer:", deployer.address);

  // 部署 Token A
  const TokenA = await ethers.deployContract("MyToken", ["Token A", "TKA", 1_000_000, 0]);
  await TokenA.waitForDeployment();
  const tokenAAddr = await TokenA.getAddress();
  console.log("Token A 部署成功:", tokenAAddr);

  // 部署 Token B
  const TokenB = await ethers.deployContract("MyToken", ["Token B", "TKB", 2_000_000, 0]);
  await TokenB.waitForDeployment();
  const tokenBAddr = await TokenB.getAddress();
  console.log("Token B 部署成功:", tokenBAddr);

  // 部署 SimpleAMM
  const amm = await ethers.deployContract("SimpleAMM", [tokenAAddr, tokenBAddr]);
  await amm.waitForDeployment();
  const ammAddr = await amm.getAddress();
  console.log("SimpleAMM 部署成功:", ammAddr);

  const deadline = Math.floor(Date.now() / 1000) + 3600;

  // 添加初始流动性
  console.log("\n--- 添加初始流动性 (1000 TKA : 2000 TKB) ---");
  await TokenA.approve(ammAddr, ethers.parseUnits("1000", 18));
  await TokenB.approve(ammAddr, ethers.parseUnits("2000", 18));
  const addLiqTx = await amm.addLiquidity(ethers.parseUnits("1000", 18), ethers.parseUnits("2000", 18), deadline);
  await addLiqTx.wait();
  console.log("添加流动性成功!");

  // 查询池状态
  console.log("\n--- 池状态 ---");
  console.log("Token A 储备:", ethers.formatUnits(await amm.reserveA(), 18), "TKA");
  console.log("Token B 储备:", ethers.formatUnits(await amm.reserveB(), 18), "TKB");
  console.log("LP 总供应:", ethers.formatUnits(await amm.totalSupply(), 18), "SALP");
  console.log("我的 LP:", ethers.formatUnits(await amm.balanceOf(deployer.address), 18), "SALP");

  // 测试 swap
  console.log("\n--- 测试 Swap: 10 TKA → TKB ---");
  await TokenA.approve(ammAddr, ethers.parseUnits("10", 18));
  const swapTx = await amm.swap(tokenAAddr, ethers.parseUnits("10", 18), 0, deadline);
  await swapTx.wait();
  console.log("Swap 成功!");

  console.log("Token A 储备:", ethers.formatUnits(await amm.reserveA(), 18), "TKA");
  console.log("Token B 储备:", ethers.formatUnits(await amm.reserveB(), 18), "TKB");

  // 输出地址供前端使用
  console.log("\n=== 合约地址（复制到前端 .env） ===");
  console.log(`NEXT_PUBLIC_MYTOKEN_ADDRESS=${tokenAAddr}`);
  console.log(`NEXT_PUBLIC_MYNFT_ADDRESS=${tokenBAddr}`);
  console.log(`NEXT_PUBLIC_SIMPLEAMM_ADDRESS=${ammAddr}`);
  console.log("\n=== 部署完成 ===");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
