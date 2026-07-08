# Elixadmin Frontend

这个目录是 Elixadmin 的前端工作区，基于 `pure-admin-thin` 定制。

## 运行

```bash
pnpm install
pnpm dev
```

默认开发端口是 `8848`，并将 `/api` 代理到 `http://localhost:4000`。

## 常用命令

```bash
pnpm dev
pnpm typecheck
pnpm build
pnpm lint
```

## 说明

- 完整项目启动方式和默认账号说明见仓库根目录 `README.md`
- 这个目录保留了 `pure-admin-thin` 的基础结构，但当前功能和接口以 Elixadmin 后端为准

## 自动部署

本仓库通过 GitHub Actions 实现推送 `main` 分支自动部署，采用 Docker 镜像方案。

### 部署流程

```
push main → 构建前端镜像（pnpm build → nginx 静态站）→ 推送 GHCR → SSH 拉取重启
```

相关文件：

- `Dockerfile`：多阶段构建，build 阶段 `pnpm build` 产物，运行阶段用 nginx 托管 `dist`
- `.github/workflows/deploy.yml`：构建镜像 + 推送 GHCR + SSH 部署

### 与后端的协作

- 编排文件 `docker-compose.yml` 维护在后端仓库 `iswangaiguo/elixadmin`
- 前端镜像推送到 `ghcr.io/iswangaiguo/pure-admin-thin:latest`
- 服务器上 `docker compose pull frontend && docker compose up -d frontend` 完成更新
- 对外由 Caddy 反向代理统一路由：`/api/*` → 后端，`/*` → 前端

### GitHub Secrets

workflow 的 deploy job 声明了 `environment: production`，因此 Secrets 需配在 **Environment secrets**：

1. 仓库 Settings → Environments → **New environment** → 命名 `production`
2. 进入 `production` → 添加以下 secrets：

| Secret     | 说明                                         |
| ---------- | -------------------------------------------- |
| `SSH_HOST` | 服务器 IP                                    |
| `SSH_USER` | SSH 登录用户                                 |
| `SSH_KEY`  | SSH 私钥（`cat ~/.ssh/id_ed25519` 整段内容） |
| `SSH_PORT` | 可选，默认 22                                |

GHCR 推送使用 workflow 内置的 `GITHUB_TOKEN`，无需额外配置。镜像仓库需设为公开。
