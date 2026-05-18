import hre from "hardhat";

async function main() {
  const { ethers } = await hre.network.connect();
  const deployer = (await ethers.getSigners())[0];

  const TOKEN_A = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const TOKEN_B = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  const POOL_AB = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";

  console.log("=== 部署 ChainForgeRouter ===\n");
  console.log("Deployer:", deployer.address);

  const Router = await ethers.getContractFactory("ChainForgeRouter");
  const router = await Router.deploy();
  await router.waitForDeployment();
  const routerAddr = await router.getAddress();
  console.log("Router 部署成功:", routerAddr);

  // 注册池
  const tx = await router.addPool(TOKEN_A, TOKEN_B, POOL_AB);
  await tx.wait();
  console.log("池注册成功!");
  console.log("池数量:", (await router.poolCount()).toString());

  console.log("\n=== Router 地址 ===");
  console.log(`NEXT_PUBLIC_ROUTER_ADDRESS=${routerAddr}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
