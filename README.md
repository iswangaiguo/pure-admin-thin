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
