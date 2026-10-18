# Test Garden · 测试乐园

中文默认、支持 English 的综合测试网站，采用「角色乐园③」设计。

- **网站（GitHub Pages）：** https://335083474.github.io/test-garden/
- **English：** https://335083474.github.io/test-garden/en/

页面与静态文件实际运行在 GitHub Pages，地址保持在 `github.io`，不跳转或连接 ChatGPT 托管。`main` 推送后由 `.github/workflows/pages.yml` 检查、构建并自动发布 `dist-github/`。

## 当前功能

- 五个原创编辑测试、三个站外活动，中文默认 / English，包含朋友合集与搜索。
- 浏览器计分、结果卡、二维码、可选择包含结果摘要的分享链接；朋友直接打开同一个 GitHub 测试。
- 接入 Cloudflare 后，“帮我选测试”调用真正 MiniMax：最多两次追问、三个目录选项或新测试方向，支持中英文。只推荐已有目录 ID 或生成新问卷，不接受模型编造的外链。
- 原测试与 AI 新作进入共享目录，D1 保存去重后的完成记录与主动反馈，提供近7天 / 全部完成排行。计数按浏览器与题库版本去重，不是核实过的独立人数。
- 结果后给出深入探索、互补角度、朋友共玩的三项 AI 推荐，参考自己的完成记录和反馈。
- 双人邀请冻结同一题库版本，双方主动同意并分别完成后显示角色与分布。邀请7天到期，发起者可撤销，第三位访客不能覆盖参与者。
- 活跃对话最多暂存2小时；仅勾选后保存需求与选择30天。原始作答经后端校验后丢弃。访客凭证保存在当前浏览器，第三方Cookie不是必需条件。
- 24 个中英文内容页面、6 个动态读取内容的共享入口和2个404页面。保留标题、描述、canonical、hreflang、结构化数据；AI新作未经编辑审核前 noindex。

**部署与验证状态：** 以 GitHub Actions、Cloudflare 部署回执及实际公网验收为准。架构、限制与部署步骤见 [CLOUDFLARE_BACKEND.md](CLOUDFLARE_BACKEND.md)。旧 Sites 的管理者身份不用于这个独立后端；管理员分析没有公开接口。

## 开发与验证

需要 Node.js 22.16+。

```sh
npm ci
npm test
npm run build:github
node scripts/check-github.mjs
node scripts/serve-github.mjs
```

本地预览：`http://127.0.0.1:4326/test-garden/`。静态输出为 `dist-github/`，仓库子路径、分享 URL、图片与语言切换均保留 `/test-garden/`。CI 运行65项自动测试，并验证页面链接、结构化数据及不包含旧站跳转。生产API仅允许正式GitHub来源；localhost预览的AI请求不会获准。

保留的 `npm run build` 是旧 Worker 构建，需要 D1 绑定 `DB` 与迁移，不能直接放进 Pages。旧服务设计见 [HOSTED_STUDIO.md](HOSTED_STUDIO.md)，其中的已上线功能不代表当前 GitHub 静态版已接入。

内部本地试用见 [INTERNAL_STUDIO.md](INTERNAL_STUDIO.md)。`npm run start:plan` 仅绑定回环地址，并使用本机已登录的官方 Codex CLI 额度，不是生产托管方案。

## 发布说明

本仓库从已验证的当前源代码快照初始化，未包含旧 Git 历史、本机数据库、需求原文、运行日志、构建产物或凭据。应用源版本：`261d5de13e05c78dd20f1894a8fbfa7d58a77396`；GitHub 发布准备日期：2026-10-18。

本次移除 `/docs` 跳转页，Pages 来源改为 GitHub Actions 的静态构建产物。完整本地 GitHub 工作区为 `D:\SEA\test-garden-github`。源码修改推送 `main` 后自动构建发布；以 Actions 的成功部署和公开页面实际读回为准。

GitHub 页面没有 AI 密钥。线上AI通过Cloudflare后端使用MiniMax额度，不使用本机Codex额度。MiniMax密钥与网络散列盐只配置在Cloudflare Secrets，不写入源码、Pages或浏览器。共享调用上限为每天全站50次、每位访客15次，同一网络每日30次；失败调用也可能消耗名额。这不是精确金额预算，也不代表无限免费AI。

测试用于娱乐和自我探索，未经过心理测量验证。
