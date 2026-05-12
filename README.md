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
| 智能合约 | Solidity + Hardhat | 合约开发、测试、部署 |
| 合约库 | OpenZeppelin | 安全的 ERC-20/721 标准实现 |
| 后端 | Java 17 + Spring Boot + Web3j | 合约调用、交易签名、API 服务 |
| 前端 | React + Wagmi + RainbowKit | 钱包连接、DApp 交互 |
| 测试网 | Ethereum Sepolia | 免费测试环境 |
| RPC 节点 | Alchemy | 区块链网络访问入口 |

## 项目结构

```
ChainForge/
├── contracts/          # Solidity 智能合约 (Hardhat 项目)
│   ├── src/
│   │   ├── MyToken.sol # ERC-20 Token 合约
│   │   └── MyNFT.sol   # ERC-721 NFT 合约
│   ├── test/           # 合约测试
│   ├── scripts/        # 部署脚本
│   ├── ignition/       # Hardhat Ignition 部署模块
│   └── hardhat.config.ts
├── backend/            # Java 后端 (Spring Boot + Web3j)
│   └── src/main/java/com/nftdemo/
│       ├── config/     # Web3j 配置
│       ├── contract/   # 合约包装类 (Web3j 生成)
│       ├── service/    # 业务逻辑
│       ├── controller/ # REST API
│       └── model/      # 数据模型
├── frontend/           # React 前端
│   └── src/
│       ├── components/ # UI 组件
│       ├── hooks/      # 自定义 Hooks
│       └── lib/        # 工具函数
├── .env.example        # 环境变量模板
├── .gitignore
└── README.md
```

## 快速开始

> 详细步骤请参考各阶段的文档

### 环境要求

- JDK 17+
- Node.js 20+
- Hardhat 3 (npm install)
- MetaMask 浏览器插件

### 1. 克隆项目

```bash
git clone git@github.com:mll0x/ChainForge.git
cd ChainForge
```

### 2. 合约开发

```bash
cd contracts
npm install
npx hardhat compile
npx hardhat test
```

### 3. 后端启动

```bash
cd backend
cp ../.env.example .env  # 填写实际配置
mvn spring-boot:run
```

### 4. 前端启动

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

### MyNFT (ERC-721)

| 方法 | 权限 | 说明 |
|------|------|------|
| `mint(address to)` | Owner only | 铸造 1 个 NFT |
| `batchMint(address to, uint256 quantity)` | Owner only | 批量铸造 |
| `setBaseURI(string baseURI)` | Owner only | 设置元数据基础 URL |

## API 接口

> 后端开发完成后补充

## 部署信息

> 测试网部署后补充合约地址和 Etherscan 链接

## 学习路线

| 阶段 | 时间 | 目标 |
|------|------|------|
| 合约基础 | 第 1 周 | Solidity 语法 + ERC-20/721 标准 |
| Java 集成 | 第 2 周 | Web3j 连接节点、调用合约、签名交易 |
| React 前端 | 第 3 周 | 钱包连接、DApp 交互 |
| 整合完善 | 第 4 周 | 联调、文档、部署 |

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
