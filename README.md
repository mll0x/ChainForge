# ChainForge ⚒️ — 链上锻造

> Java 开发者的 Web3 入门实战：发行 ERC-20 Token + 铸造 ERC-721 NFT

## 项目简介

这是一个面向 Java 开发者的 Web3 入门项目，通过实战学习区块链开发的核心概念和技能。项目包含：

- 发行自定义 **ERC-20 Token**（同质化代币）
- 铸造 **ERC-721 NFT**（非同质化代币）
- **Java 后端**（Spring Boot + Web3j）与链交互
- **React 前端**（Wagmi + RainbowKit）连接钱包、展示 NFT

## 技术栈

| 层 | 技术 | 说明 |
|---|---|---|
| 智能合约 | Solidity + Hardhat 3 | 合约开发、测试、部署 |
| 合约库 | OpenZeppelin 5.x | 安全的 ERC-20/721 标准实现 |
| 后端 | Java 17 + Spring Boot 3.5 + Web3j 4.11 | 合约调用、交易签名、API 服务 |
| 前端 | React + Wagmi + RainbowKit | 钱包连接、DApp 交互 |

## 项目结构

```
ChainForge/
├── contracts/          # Solidity 智能合约 (Hardhat 项目)
│   ├── src/
│   │   ├── MyToken.sol # ERC-20 Token 合约
│   │   └── MyNFT.sol   # ERC-721 NFT 合约
│   ├── test/           # 合约测试 (30 个测试全部通过)
│   ├── ignition/       # Hardhat Ignition 部署模块
│   └── hardhat.config.ts
├── backend/            # Java 后端 (Spring Boot + Web3j)
│   └── src/main/java/com/chainforge/
│       ├── config/     # Web3j 配置 (Web3j、Credentials、合约 Bean)
│       ├── contract/   # 合约包装类 (MyToken、MyNFT)
│       ├── service/    # 业务逻辑 (Wallet、Token、NFT、事件监听)
│       ├── controller/ # REST API + 全局异常处理
│       └── model/      # DTO (record 类型)
├── frontend/           # React 前端 (待开发)
├── .env.example        # 环境变量模板
├── .gitignore
└── README.md
```

## 快速开始

### 环境要求

- JDK 17+
- Node.js 20+
- MetaMask 浏览器插件

### 1. 启动本地链

```bash
cd contracts
npm install
npx hardhat node
```

### 2. 部署合约

```bash
cd contracts
npx hardhat ignition deploy ignition/modules/ChainForge.ts --network localhost
```

部署后会输出合约地址，更新 `backend/src/main/resources/application.yml` 中的地址。

### 3. 启动后端

```bash
cd backend
./mvnw spring-boot:run -s .mvn/settings.xml
```

> 项目级 `.mvn/settings.xml` 使用 Maven Central，不影响全局 Maven 配置。

### 4. 启动前端

```bash
cd frontend
npm install
npm run dev
```

## 合约说明

### MyToken (ERC-20)

| 方法 | 权限 | 说明 |
|------|------|------|
| `transfer(address to, uint256 amount)` | 任意持有者 | 转账 |
| `approve(address spender, uint256 amount)` | 任意持有者 | 授权额度 |
| `mint(address to, uint256 amount)` | Owner only | 增发代币 |
| `maxSupply()` | 只读 | 查询最大供应量 |

> 合约测试：13 个测试全部通过

### MyNFT (ERC-721)

| 方法 | 权限 | 说明 |
|------|------|------|
| `mint(address to)` | Owner only | 铸造 1 个 NFT |
| `batchMint(address to, uint256 quantity)` | Owner only | 批量铸造 |
| `ownerOf(uint256 tokenId)` | 只读 | 查询 NFT 持有者 |
| `tokenURI(uint256 tokenId)` | 只读 | 查询元数据 URI |
| `setBaseURI(string baseURI)` | Owner only | 设置元数据基础 URL |
| `maxSupply()` | 只读 | 查询最大供应量 |

> 合约测试：17 个测试全部通过

## API 接口

### 钱包查询

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/wallet/{address}/balance` | 查询 ETH 余额 + ERC-20 余额 |

**响应示例：**

```json
{
  "success": true,
  "data": {
    "address": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    "ethBalance": "9999.9962",
    "tokenBalance": "1000000",
    "tokenSymbol": "CFT"
  },
  "error": null
}
```

### Token 操作

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/token/transfer` | Token 转账 |
| POST | `/api/token/approve` | Token 授权 |
| POST | `/api/token/mint` | Token 增发（仅 Owner） |

**请求示例（转账）：**

```json
POST /api/token/transfer
{ "to": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", "amount": 100 }
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "transactionHash": "0xbfc14991...",
    "from": "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
    "to": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "status": "SUCCESS"
  },
  "error": null
}
```

### NFT 操作

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/nft/mint` | NFT 铸造（quantity=1 单铸，>1 批量铸） |
| GET | `/api/nft/{tokenId}` | 查询 NFT 信息 |

**请求示例（铸造）：**

```json
POST /api/nft/mint
{ "to": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", "quantity": 3 }
```

**响应示例（查询）：**

```json
{
  "success": true,
  "data": {
    "tokenId": 0,
    "owner": "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
    "tokenURI": "ipfs://QmPlaceholder/0"
  },
  "error": null
}
```

### 错误响应

所有 API 使用统一的 `ApiResponse` 信封格式，错误时 `success: false`：

```json
{
  "success": false,
  "data": null,
  "error": "Failed to get balance: Value must be in format 0x[0-9a-fA-F]+"
}
```

## 合约地址（本地节点）

| 合约 | 地址 |
|------|------|
| MyToken (ERC-20) | `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512` |
| MyNFT (ERC-721) | `0x5FbDB2315678afecb367f032d93F642f64180aa3` |

> 本地链每次重启后合约地址可能变化，需同步更新 `application.yml`。

## 学习路线

| 阶段 | 时间 | 目标 | 状态 |
|------|------|------|------|
| 合约基础 | 第 1 周 | Solidity 语法 + ERC-20/721 标准 | ✅ 已完成 |
| Java 集成 | 第 2 周 | Web3j 连接节点、调用合约、签名交易 | ✅ 已完成 |
| React 前端 | 第 3 周 | 钱包连接、DApp 交互 | 🚧 进行中 |
| 整合完善 | 第 4 周 | 联调、文档、部署 | ⬚ 待开始 |

## 安全注意事项

- 永远不要将私钥提交到 Git
- 使用 `.env` 管理敏感配置
- 合约部署前务必充分测试
- 生产环境使用 KMS 管理私钥

## 推荐资源

- [Solidity 官方文档](https://soliditylang.org/)
- [CryptoZombies](https://cryptozombies.io/) — 交互式 Solidity 入门
- [Web3j 文档](https://docs.web3j.io/)
- [Hardhat 文档](https://hardhat.org/docs)
- [OpenZeppelin 文档](https://docs.openzeppelin.com/)
- [Ethereum 开发者文档](https://ethereum.org/developers)

## License

MIT
