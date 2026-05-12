import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("ChainForgeModule", (m) => {
  // ERC-20 Token
  const tokenName = m.getParameter("tokenName", "ChainForge Token");
  const tokenSymbol = m.getParameter("tokenSymbol", "CFT");
  const initialSupply = m.getParameter("initialSupply", 1_000_000n);
  const maxSupply = m.getParameter("maxSupply", 10_000_000n);

  const myToken = m.contract("MyToken", [tokenName, tokenSymbol, initialSupply, maxSupply]);

  // ERC-721 NFT
  const nftName = m.getParameter("nftName", "ChainForge NFT");
  const nftSymbol = m.getParameter("nftSymbol", "CFN");
  const baseURI = m.getParameter("baseURI", "ipfs://QmPlaceholder/");
  const nftMaxSupply = m.getParameter("nftMaxSupply", 100n);

  const myNFT = m.contract("MyNFT", [nftName, nftSymbol, baseURI, nftMaxSupply]);

  return { myToken, myNFT };
});
