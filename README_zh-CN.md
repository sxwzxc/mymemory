# MyMemory · AI 记忆库

基于 **EdgeOne Pages + 边缘函数 + KV 存储** 的多用户 AI 记忆库应用。无需传统数据库，所有数据存储在边缘 KV 中，每个用户在 KV 中是独立的一个变量，彼此完全隔离。

- 🧠 私密记忆库：记录所思所想、知识笔记、提示词（Skill）
- 👥 多用户：注册 / 登录，注册开关由环境变量控制
- 🔑 API 接口：用户可生成 API Key，通过 HTTP 程序化读写自己的记忆库
- 🌐 全边缘：静态站点 + 边缘函数 + KV，0 服务器、0 数据库

## 部署到 EdgeOne Pages

[![使用 EdgeOne Pages 部署](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://console.cloud.tencent.com/edgeone/pages/new?from=github&template=functions-kv)

### 1. 准备并绑定 KV 命名空间

1. 在 EdgeOne 控制台「存储 → KV」中创建一个命名空间（名称可任取，如 `mymemory`）。
2. 进入 Pages 项目详情 → 「KV 存储」菜单，点击「绑定命名空间」，**变量名必须填 `mymemory`**（这是边缘函数中访问该 KV 的全局变量名）。

> 代码已做容错：若变量名不一致，会自动从 `env` 上寻找任意 KV 绑定；但未绑定任何命名空间时会报错 `KV 存储未绑定`。详见官方文档 [KV 存储](https://pages.edgeone.ai/zh/document/kv-storage)。

### 2. 创建 Pages 项目并关联仓库

- 框架预设：Next.js
- 构建命令：`npm run build`
- 输出目录：`.next`（由 Next.js 自动处理）
- 部署分支：`main`

### 3. 配置环境变量

在 Pages 项目「设置 → 环境变量」中添加：

| 变量名 | 必填 | 说明 |
| --- | --- | --- |
| `AllowRegister` | 是 | 是否允许注册。`1` 允许，其他值（含未设置）禁止。建议首次部署时设为 `1`，创建完管理员账号后改回 `0`。 |

### 4. 部署并访问

部署成功后会得到形如 `xxx.edgeone.app` 的访问域名。打开网页即被引导到登录/注册页。

## 本地开发

由于本项目使用了 Next.js 静态导出（`next.config.mjs` 中 `output: 'export'`）与 EdgeOne Pages 边缘函数，本地开发需同时运行前端与函数两套服务：

```bash
# 1. 安装依赖
npm install

# 2. 终端 A：运行前端（默认 3000）
npm run dev

# 3. 终端 B：运行 EdgeOne Pages Functions（端口 8088）
#    使用官方 CLI（需已安装 edgeone cli 并完成登录 / KV 绑定）
npx edgeone pages dev --port 8088
```

前端在 `http://localhost:3000`，但所有 `/auth/*`、`/memories/*`、`/api/*` 请求会发往 `http://localhost:8088`（见 [lib/api.ts](lib/api.ts) 中的 `API_HOST`）。本地开发时 Cookie 的 `Secure` 标记会自动省略，因此 `http://localhost` 下登录可用。

## 数据模型（基于 KV）

本项目**没有传统数据库**，所有状态都存储在 EdgeOne KV 中。设计上让每个用户在 KV 中成为**独立的一个变量**，天然实现多租户隔离。

> ⚠️ EdgeOne KV 的 key **仅支持数字、字母、下划线**，不能使用冒号等符号（会报 `Param Invalid`）。因此本项目所有 key 一律用下划线分段。用户名也限制为 `[a-zA-Z0-9_]`（3-32 位），因为它会成为 key 的一部分。

| Key | Value（JSON） | 作用 |
| --- | --- | --- |
| `user_<username>` | `{ username, passwordHash, salt, createdAt, apiKeys[] }` | 账户信息。密码使用 HMAC-SHA256 加 per-user salt 哈希（注：EdgeOne 运行时 WebCrypto 暂不支持 PBKDF2 的 deriveBits，故改用 HMAC） |
| `memories_<username>` | `[{ key, value, meta }]` | 该用户**全部**记忆，整体作为一个 KV value 存储 |
| `session_<token>` | `{ username, createdAt, expiresAt }` | 会话。token 经 HttpOnly Cookie 下发，过期时间同时写入 value（不依赖 KV 原生 TTL，跨平台兼容） |
| `apikey_<sha256>` | `{ username, keyId }` | API Key → 用户名的反向索引，O(1) 鉴权。明文密钥不存储，只存哈希 |

注册时自动为该用户写入一条「欢迎示例」记忆。

## API

所有 `/api/*` 接口使用 **API Key 鉴权**，需在请求头携带：

```
Authorization: Bearer <你的 API Key>
```

API Key 在网页登录后从「🔑 API Keys」页生成，明文只显示一次，丢失请删除后重新生成。

### 记忆接口（API Key 鉴权）

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/memories` | 列出当前用户的全部记忆 |
| `GET` | `/api/memories/get?key=KEY` | 获取单条记忆 |
| `POST` | `/api/memories/set` | 新增/更新记忆。Body：`{ "key": "...", "value": "...", "meta": { "title": "...", "tags": ["..."], "type": "memory|skill" } }` |
| `DELETE` | `/api/memories/delete?key=KEY` | 删除单条记忆 |

### 浏览器接口（Cookie 鉴权，网页前端使用）

`/auth/status`、`/auth/register`、`/auth/login`、`/auth/logout`、`/auth/me`、`/auth/apikeys`、`/auth/apikeys/delete`，以及 `/memories`、`/memories/get`、`/memories/set`、`/memories/delete`。

### 示例：用 curl 读写记忆

```bash
# 列出
curl -H "Authorization: Bearer mm_xxxxxxxx" https://your-app.edgeone.app/api/memories

# 新增
curl -X POST https://your-app.edgeone.app/api/memories/set \
  -H "Authorization: Bearer mm_xxxxxxxx" \
  -H "content-type: application/json" \
  -d '{"key":"memory_001","value":"今天学到了一个新概念","meta":{"title":"学习笔记","tags":["学习"],"type":"memory"}}'

# 删除
curl -X DELETE https://your-app.edgeone.app/api/memories/delete?key=memory_001 \
  -H "Authorization: Bearer mm_xxxxxxxx"
```

## 安全说明

- 密码：HMAC-SHA256 + 用户级 salt（EdgeOne 运行时 WebCrypto 暂不支持 PBKDF2 的 deriveBits）
- 会话：随机 32 字节 token，HttpOnly + SameSite=Lax，HTTPS 下追加 Secure；过期时间嵌入 value，不依赖 KV 原生 TTL
- API Key：明文不落库，只存 SHA-256；展示一次后无法找回
- 用户隔离：每条记忆读写都强校验当前会话/Key 所属用户，KV 中按用户名分桶
- CORS：浏览器接口回显 Origin 并允许 Credentials，API 接口允许任意 Origin（仍需有效 Bearer）

## 已知约束（KV 无数据库架构的固有限制）

1. **读-改-写并发**：`/memories/set` 与 `/memories/delete` 是「读出整组记忆 → 修改 → 整组写回」。同一用户极高频并发写入存在丢失更新风险（KV 无事务）。个人记忆库场景下可忽略。
2. **单用户单 value 大小**：单个用户的全部记忆存为一个 KV value。受 KV 单 value 体积上限约束（EdgeOne KV 与 Cloudflare KV 一致，约 25MB）。如需突破，可改为「每条记忆一个 KV key」并在 `functions/_lib/auth.js` 中扩展。
3. **会话过期清理**：过期会话在下次访问时被惰性删除，不会主动清理。

## 目录结构

```
app/                     # Next.js 页面
  page.tsx               # 鉴权门控 + 视图切换
components/
  Auth.tsx               # 登录/注册页
  Kv.tsx                 # 记忆库主界面（增删改查）
  ApiKeys.tsx            # API Key 管理
functions/               # EdgeOne Pages 边缘函数
  _lib/auth.js           # 共享认证与 KV 访问助手
  auth/                  # 浏览器认证端点
  memories/              # 浏览器记忆端点（cookie 鉴权）
  api/memories/          # API Key 鉴权端点
lib/api.ts               # 前端 API 客户端
```

## 了解更多

- [EdgeOne Pages 文档](https://edgeone.ai/pages)
- [Next.js 文档](https://nextjs.org/docs)
