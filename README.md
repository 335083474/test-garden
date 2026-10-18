# Test Garden · 测试乐园

中文默认、支持 English 的综合测试网站，采用「角色乐园③」设计。

- **网站（GitHub Pages）：** https://335083474.github.io/test-garden/
- **English：** https://335083474.github.io/test-garden/en/

页面与静态文件实际运行在 GitHub Pages，地址保持在 `github.io`，不跳转或连接 ChatGPT 托管。`main` 推送后由 `.github/workflows/pages.yml` 检查、构建并自动发布 `dist-github/`。

## 当前功能

- 五个原创编辑测试、三个站外活动，中文默认 / English，包含朋友合集与搜索。
- 浏览器计分、结果卡、二维码、可选择包含结果摘要的分享链接；朋友直接打开同一个 GitHub 测试。
- “帮我选测试”进行中英文目录关键词匹配；明确标识为目录匹配，不冒充 AI。
- 按主题关联的编辑推荐，并避开本浏览器已完成或反馈不合适的测试。
- 只保存本设备的完成记录与主动反馈，不保存搜索需求、对话或原始答案。计数明确标记为本设备记录，不是全站排行榜。
- 24 个中英文内容页面、独立标题 / 描述、canonical、hreflang、结构化数据与 sitemap；另有两种语言的 404 页面。

**尚待接入独立后端：** 真正 AI 追问 / 生成测试、AI 新作持久目录、需求研究与管理分析、全站排行、双人邀请汇总。GitHub Pages 不能运行密钥和数据库服务；当前版本不向原 ChatGPT 站点请求这些服务。需要独立服务器或 Cloudflare Worker / D1 配置。

## 开发与验证

需要 Node.js 22.16+。

```sh
npm ci
npm test
npm run build:github
node scripts/check-github.mjs
node scripts/serve-github.mjs
```

本地预览：`http://127.0.0.1:4326/test-garden/`。静态输出为 `dist-github/`，仓库子路径、分享 URL、图片与语言切换均保留 `/test-garden/`。CI 运行 60 项自动测试，并验证页面链接、结构化数据及不包含旧站跳转。

保留的 `npm run build` 是旧 Worker 构建，需要 D1 绑定 `DB` 与迁移，不能直接放进 Pages。旧服务设计见 [HOSTED_STUDIO.md](HOSTED_STUDIO.md)，其中的已上线功能不代表当前 GitHub 静态版已接入。

内部本地试用见 [INTERNAL_STUDIO.md](INTERNAL_STUDIO.md)。`npm run start:plan` 仅绑定回环地址，并使用本机已登录的官方 Codex CLI 额度，不是生产托管方案。

## 发布说明

本仓库从已验证的当前源代码快照初始化，未包含旧 Git 历史、本机数据库、需求原文、运行日志、构建产物或凭据。应用源版本：`261d5de13e05c78dd20f1894a8fbfa7d58a77396`；GitHub 发布准备日期：2026-10-18。

本次移除 `/docs` 跳转页，Pages 来源改为 GitHub Actions 的静态构建产物。完整本地 GitHub 工作区为 `D:\SEA\test-garden-github`。源码修改推送 `main` 后自动构建发布；以 Actions 的成功部署和公开页面实际读回为准。

当前 GitHub 页面没有 AI 密钥，也不会消耗 MiniMax 或 Codex 额度。后续密钥只可配置在独立后端，不可写入源码、Pages 或浏览器。

测试用于娱乐和自我探索，未经过心理测量验证。
