# Test Garden · 测试乐园

中文默认、支持 English 的综合测试网站，采用「角色乐园③」设计。

- **GitHub 试用入口：** https://335083474.github.io/test-garden/
- **完整应用：** https://test-garden-first-edition.liuq75061.chatgpt.site/
- **English：** https://test-garden-first-edition.liuq75061.chatgpt.site/en/

GitHub Pages 发布 `main` 分支的 `/docs`，打开后自动进入完整应用。深层测试、双人邀请链接及查询参数、片段一并转到相同正式站点。GitHub Pages 本身不运行后端；MiniMax、D1 数据库、分享和身份校验仍由现有 Sites / Cloudflare Worker 提供。不要把 Worker 构建产物当作静态网站部署。

## 当前功能

- AI 最多追问两次明确需求，提供三个选项；只引用目录中的现有测试与外链，或生成新测试。
- 五个编辑测试、三个站外活动、持久保存的 AI 双语新测试；完成计数和排行榜。
- 结果卡、二维码、分享测试和双人对比，关联推荐按深入探索、互补维度、朋友共玩组织。
- 可选择保存需求以改善推荐；站点所有者独享需求与反馈分析。
- 已编辑页面提供 SEO / GEO 内容、语言映射和结构化数据；未审核的 AI 新测试保持 noindex。

## 开发与验证

需要 Node.js 22.16+。

```sh
npm ci
npm test
node scripts/check-content.mjs
npm run build
```

构建输出是 Cloudflare Worker ESM：`dist/server/index.js`，需要 D1 绑定 `DB` 及数据库迁移；它不是 GitHub Pages 的静态产物。线上配置与权限边界见 [HOSTED_STUDIO.md](HOSTED_STUDIO.md)。

内部本地试用见 [INTERNAL_STUDIO.md](INTERNAL_STUDIO.md)。`npm run start:plan` 仅绑定回环地址，并使用本机已登录的官方 Codex CLI 额度，不是生产托管方案。

## 发布说明

本仓库从已验证的当前源代码快照初始化，未包含旧 Git 历史、本机数据库、需求原文、运行日志、构建产物或凭据。应用源版本：`261d5de13e05c78dd20f1894a8fbfa7d58a77396`；GitHub 发布准备日期：2026-10-18。

Pages 自动发布只更新试用入口；修改运行中的应用仍须执行 Sites 的构建、源代码同步、保存版本和发布流程。修改 `docs/redirect.js`、`docs/index.html`、`docs/404.html` 时需同步正式应用地址。

MiniMax 密钥只存在服务端秘密配置中。不要把密钥写入源码、GitHub Pages 或浏览器。当前全站 AI 限额为每天 50 次，另有每位访客限额；现有测试不消耗 AI 请求额度。

测试用于娱乐和自我探索，未经过心理测量验证。
