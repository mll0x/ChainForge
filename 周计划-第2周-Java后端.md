# ChainForge 第 2 周课程大纲 — Java 后端（Spring Boot + Web3j）

> 前置条件：第 1 周 Day 1-6 已完成（合约开发 + 本地链交互验证通过）

## 本周目标

用 Java 完成与本地链的全量交互：查询余额、转账 Token、铸造 NFT、监听链上事件。

## 每日计划

### Day 8 — Spring Boot 项目初始化

- [ ] Spring Initializr 创建 backend 项目（Spring Web + Lombok）
- [ ] 添加 Web3j 依赖（core + spring-boot-starter）
- [ ] 编写 application.yml 配置（RPC URL、合约地址、私钥占位）
- [ ] 编写 .env.example
- [ ] mvn spring-boot:run 启动验证
- **产出**：项目启动验证通过

### Day 9 — Web3j 合约包装类生成

- [ ] 安装 web3j CLI：brew install web3j
- [ ] 从 Foundry/Hardhat 编译产物生成 MyToken.java 和 MyNFT.java
- [ ] 编写 Web3jConfig.java（Web3j Bean、Credentials Bean）
- [ ] 验证连接节点成功（获取区块号）
- **产出**：Java 中能调用合约方法

### Day 10 — 钱包服务 + 查询 API

- [ ] 编写 WalletService.java：查询 ETH 余额、查询 ERC-20 余额
- [ ] 编写 WalletController.java：GET /api/wallet/{address}/balance
- [ ] Postman 测试接口
- **产出**：GET /api/wallet/{address}/balance 调通

### Day 11 — Token 服务 + 转账 API

- [ ] 编写 TokenService.java：transfer、approve、mint
- [ ] 编写 TokenController.java：POST /api/token/transfer、POST /api/token/mint
- [ ] Postman 测试（在本地链上真实执行）
- **产出**：Token 转账 + 增发 API 调通

### Day 12 — NFT 服务 + 铸造 API

- [ ] 编写 NftService.java：mint、batchMint、ownerOf、tokenURI
- [ ] 编写 NftController.java：POST /api/nft/mint、GET /api/nft/{tokenId}
- [ ] Postman 测试
- **产出**：NFT 铸造 + 查询 API 调通

### Day 13 — 事件监听

- [ ] 编写事件监听服务：监听 Transfer、Approval 事件
- [ ] 日志输出到控制台
- [ ] 验证链上操作触发事件监听
- **产出**：实时事件监听服务

### Day 14 — 整合测试 + 异常处理

- [ ] 全局异常处理（@ControllerAdvice）
- [ ] 参数校验（@Valid + 自定义校验）
- [ ] 端到端测试：查询 → 转账 → 铸造 NFT → 事件监听
- [ ] 修复发现的问题
- **产出**：完整可用的后端 API

## 关键文件路径

```
backend/
└── src/main/java/com/chainforge/
    ├── ChainForgeApplication.java
    ├── config/Web3jConfig.java
    ├── contract/MyToken.java          # Web3j 生成
    ├── contract/MyNFT.java            # Web3j 生成
    ├── service/WalletService.java
    ├── service/TokenService.java
    ├── service/NftService.java
    ├── controller/WalletController.java
    ├── controller/TokenController.java
    ├── controller/NftController.java
    └── model/                         # DTO / VO
```

## 合约信息（本地节点）

| 合约 | 地址 |
|------|------|
| MyToken (ERC-20) | 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 |
| MyNFT (ERC-721) | 0x5FbDB2315678afecb367f032d93F642f64180aa3 |

- 本地节点：http://127.0.0.1:8545
- 启动命令：cd contracts && npx hardhat node
- 部署命令：npx hardhat ignition deploy ignition/modules/ChainForge.ts --network localhost

## 注意事项

- 本地节点每次重启后合约地址可能变化，需要更新 application.yml 中的地址
- 私钥使用 Hardhat Account #0 的测试私钥，切勿在主网使用
- 每天完成后的 commit 规范：feat: xxx / fix: xxx / docs: xxx
