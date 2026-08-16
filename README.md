# TicketClub 票来

开源、自部署的艺人公开行程追踪与追星旅行决策助手。

> 当前版本：`0.1.0` 发布候选。项目不售票、不代抢票，也不提供非公开艺人行程。

## 当前功能

- 活动详情 → 空闲时间输入 → 信息确认 → 可行性结果的完整演示闭环
- 支持自然语言描述空闲时间和截图上传状态
- 可编辑识别结果并选择悠闲、标准或极限赶路偏好
- 结果时间线会公开每一项计算假设
- 独立可测试的时间可行性判断引擎，三种风险偏好会产生不同结果
- 艺人管理、多来源状态、真实 X 主页、RSSHub 测试与帖子链接导入
- 航班推荐支持本地免费估算、航班号确认、手动填写，以及可选的 Amadeus 免费测试连接器
- 无需 API Key 的航班搜索导入：打开搜索页后粘贴文字，或在浏览器本地 OCR 航班截图

- 桌面与手机响应式行程首页。
- 演唱会票根式活动卡片。
- 可行性摘要和旅行期限内附近场次。
- “去 / 考虑 / 不去”交互状态。
- Mock 活动、可行性和附近场次数据。
- 集中式品牌颜色、字体、字号、间距和按钮参数。

## 本地启动

需要 Node.js 22.13 或更高版本。

```bash
pnpm install
pnpm dev
```

打开终端显示的本地地址。

## 可选：连接航班测试数据

不配置任何密钥时，航班判断仍可使用本地估算或手动填写。若要启用 Amadeus Self-Service 测试环境：

1. 在 [Amadeus for Developers](https://developers.amadeus.com/) 创建免费测试应用。
2. 复制 `.env.example` 为 `.env.local`。
3. 填写 `AMADEUS_CLIENT_ID` 与 `AMADEUS_CLIENT_SECRET`，然后重新启动项目。

连接器固定请求 `test.api.amadeus.com`。测试环境有免费月度额度，但返回有限缓存数据，不应被标记为实时航班。密钥只在服务端使用。

### 完全不连接航班 API

在可行性判断的“从航班搜索导入”区域：

1. 打开 Google Flights 或 Skyscanner。
2. 复制一条候选航班的文字并粘贴，或上传航班截图。
3. TicketClub 在浏览器本地识别航班号、起降时间、转机与价格。
4. 核对识别出的蓝色航班票，再开始判断。

截图 OCR 使用开源 Tesseract.js。图像不会发送到 TicketClub 服务器；首次使用时浏览器需要下载 OCR 运行文件和英文识别数据。

## 构建和检查

```bash
pnpm build
pnpm lint
pnpm test
```

## 隐私与项目边界

- 艺人行程只应来自公开信息，所有自动提取结果在进入正式行程前都需要用户确认。
- 空闲时间、地点照片和精确地址默认保存在浏览器 localStorage。
- X 没有稳定的免费官方自动读取能力；项目支持公开 RSS、X 铃铛提醒和手动导入，不绕过访问控制。
- 航班搜索导入要求用户核对结果，TicketClub 不保证票价、余票或实时状态。
- 这是行程决策工具，不是票务、旅行保险、签证或入境建议服务。

安全问题请阅读 [SECURITY.md](SECURITY.md)，贡献代码前请阅读 [CONTRIBUTING.md](CONTRIBUTING.md) 与 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)。

## 最常调整的位置

### 颜色、字体、字号、按钮和页面尺寸

编辑 `app/globals.css` 顶部的 `TICKETCLUB ADJUSTMENT PANEL`：

```css
:root {
  --tc-blush-300: #e8cdd8;
  --tc-text-page-title: clamp(2rem, 3vw, 2.9rem);
  --tc-button-height: 3.125rem;
  --tc-page-gutter: clamp(1rem, 3vw, 2.5rem);
}
```

### Mock 内容

编辑 `lib/mock-data.ts`。页面组件不直接保存活动文案。

### 按钮结构

编辑 `components/ui/Button.tsx`；按钮视觉统一在 `app/globals.css` 的 `.tc-button` 中调整。

### 票根结构

编辑 `components/TicketCard.tsx`；票根宽度、安全区和移动端布局在 `app/globals.css` 中调整。

## 目录结构

```text
app/                 页面入口、字体和全局设计 Token
components/          可复用界面组件
components/ui/       基础控件
lib/mock-data.ts     免费演示数据
lib/types.ts         领域类型
db/                  后续本地数据层
tests/               服务端渲染与代码结构测试
PRODUCT.md           长期产品事实
DESIGN.md            视觉系统约束
```

## 自动检查与通知

网页内通知中心保存在本机；GitHub Actions 可以免费定时检查 RSS，并用你自己的 SMTP 发邮件。

## 配置每天中午检查

1. 编辑 `config/ticketclub.json`，加入一个或多个 RSS/Atom 地址：

```json
{
  "timezone": "Australia/Melbourne",
  "sources": [
    {
      "id": "kiiikiii-x-rss",
      "artist": "KiiiKiii",
      "url": "https://你的-rss-服务地址"
    }
  ]
}
```

2. 在 GitHub 仓库的 `Settings → Secrets and variables → Actions` 添加：`SMTP_HOST`、`SMTP_PORT`、`SMTP_SECURE`、`SMTP_USER`、`SMTP_PASS`、`NOTIFY_EMAIL`。Gmail 通常使用 `smtp.gmail.com`、端口 `465`、`true`，密码应使用 App Password，不要提交邮箱密码。
3. 打开 Actions，手动运行一次 `TicketClub daily check`。第一次只建立基线；第二次起有新增、变更、取消或连续三次失败才发信。

X 没有稳定的免费官方读取接口，因此本项目不声称直接绕过 X。可配置自建 RSSHub、其他合法 RSS 服务，或继续使用网页内“粘贴文字/截图后确认”的流程。GitHub Actions 不能读取浏览器 localStorage，所以邮件检查历史与网页通知中心目前明确分开保存。

检查脚本可单独运行：`node scripts/check-sources.mjs`。
