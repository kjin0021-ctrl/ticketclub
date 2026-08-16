# Contributing to TicketClub

感谢你帮助 TicketClub 变得更可靠。这个项目优先服务单用户自部署场景，提交改动时请保留“零成本可运行”和“信息来源透明”两条原则。

## 开始之前

- 功能建议和较大改动请先开 Discussion 或 Feature Request，说明用户问题和数据来源。
- Bug 请附复现步骤、浏览器、操作系统和去除隐私信息后的截图。
- 不要提交艺人私密行程、非公开个人信息、账号 Cookie、API Key 或邮箱密码。
- 不接受规避平台访问控制、验证码或付费限制的实现。

## 本地开发

需要 Node.js 22.13+ 和 pnpm 11：

```bash
pnpm install
pnpm dev
```

提交 Pull Request 前运行：

```bash
pnpm lint
pnpm test
```

## Pull Request

- 一个 PR 只解决一个清晰问题。
- UI 改动请同时检查桌面端和手机端，并附截图。
- 新的数据解析规则必须提供测试，并对无法确认的字段保持为空。
- 新的第三方服务必须说明免费额度、密钥存放方式和失效时的降级路径。
- 不要降低可访问性，不要删除来源证据或风险提示。

提交即表示你同意按照项目的 MIT License 许可你的贡献。
