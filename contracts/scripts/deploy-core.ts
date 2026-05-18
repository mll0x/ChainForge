import hre from "hardhat";

async function main() {
  const { ethers } = await hre.network.connect();
  const deployer = (await ethers.getSigners())[0];
  console.log("=== 部署核心合约 (MyToken + MyNFT) ===\n");
  console.log("Deployer:", deployer.address);

  const myToken = await ethers.deployContract("MyToken", ["ChainForge Token", "CFT", 1_000_000, 10_000_000]);
  await myToken.waitForDeployment();
  const tokenAddr = await myToken.getAddress();
  console.log("MyToken 部署成功:", tokenAddr);

  const myNFT = await ethers.deployContract("MyNFT", ["ChainForge NFT", "CFN", "ipfs://QmPlaceholder/", 100]);
  await myNFT.waitForDeployment();
  const nftAddr = await myNFT.getAddress();
  console.log("MyNFT 部署成功:", nftAddr);

  console.log("\n=== 核心合约地址 ===");
  console.log(`NEXT_PUBLIC_MYTOKEN_ADDRESS=${tokenAddr}`);
  console.log(`NEXT_PUBLIC_MYNFT_ADDRESS=${nftAddr}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
