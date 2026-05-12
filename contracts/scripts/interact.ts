import hre from "hardhat";

async function main() {
  const { ethers } = await hre.network.connect();

  const TOKEN_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  const NFT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const TEST_ADDR = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // Hardhat Account #1

  const deployer = (await ethers.getSigners())[0];
  console.log("=== ChainForge 本地链交互 ===\n");
  console.log("Deployer 地址:", deployer.address);

  // ========== ERC-20 Token ==========
  console.log("\n--- ERC-20 Token ---");
  const token = await ethers.getContractAt("MyToken", TOKEN_ADDRESS);

  console.log("名称:", await token.name());
  console.log("符号:", await token.symbol());
  console.log("Deployer 余额:", ethers.formatUnits(await token.balanceOf(deployer.address), 18), "CFT");
  console.log("总供应量:", ethers.formatUnits(await token.totalSupply(), 18), "CFT");
  console.log("最大供应量:", ethers.formatUnits(await token.maxSupply(), 18), "CFT");

  // 转账
  console.log("\n转账 1000 CFT 给", TEST_ADDR);
  const transferTx = await token.transfer(TEST_ADDR, ethers.parseUnits("1000", 18));
  await transferTx.wait();
  console.log("转账成功! Tx:", transferTx.hash);
  console.log("对方余额:", ethers.formatUnits(await token.balanceOf(TEST_ADDR), 18), "CFT");

  // 增发
  console.log("\n增发 5000 CFT 给", TEST_ADDR);
  const mintTx = await token.mint(TEST_ADDR, 5000);
  await mintTx.wait();
  console.log("增发成功! 对方余额:", ethers.formatUnits(await token.balanceOf(TEST_ADDR), 18), "CFT");

  // ========== ERC-721 NFT ==========
  console.log("\n--- ERC-721 NFT ---");
  const nft = await ethers.getContractAt("MyNFT", NFT_ADDRESS);

  console.log("名称:", await nft.name());
  console.log("符号:", await nft.symbol());
  console.log("已铸造:", (await nft.totalMinted()).toString());
  console.log("最大供应量:", (await nft.maxSupply()).toString());

  // 铸造 NFT
  console.log("\n铸造 3 个 NFT 给 Deployer");
  for (let i = 0; i < 3; i++) {
    const tx = await nft.mint(deployer.address);
    await tx.wait();
    console.log(`NFT #${i} 铸造成功!`);
  }

  // 批量铸造
  console.log("\n批量铸造 5 个 NFT 给", TEST_ADDR);
  const batchTx = await nft.batchMint(TEST_ADDR, 5);
  await batchTx.wait();
  console.log("批量铸造成功!");

  // 查询结果
  console.log("\n已铸造总数:", (await nft.totalMinted()).toString());
  console.log("Deployer NFT 数量:", (await nft.balanceOf(deployer.address)).toString());
  console.log("对方 NFT 数量:", (await nft.balanceOf(TEST_ADDR)).toString());
  console.log("NFT #0 持有者:", await nft.ownerOf(0));
  console.log("NFT #0 tokenURI:", await nft.tokenURI(0));

  console.log("\n=== 交互完成 ===");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
