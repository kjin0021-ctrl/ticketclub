# Security Policy

## Supported version

当前项目处于 `0.x` 阶段，只为最新的默认分支提供安全修复。

## Reporting a vulnerability

请使用 GitHub 仓库的 **Private vulnerability reporting** 提交安全问题，不要创建公开 Issue。报告应包含影响范围、复现步骤和建议修复方式；请勿附带真实账号密码、Cookie 或访问令牌。

## Secrets and personal data

- `.env*`、本地检查状态和构建产物已默认忽略。
- Amadeus 凭据只应保存在服务端环境变量。
- SMTP 凭据只应保存在 GitHub Actions Secrets；Gmail 请使用 App Password。
- 地点照片、精确地址和空闲时间默认保存在浏览器 localStorage。共享截图或导出文件前请自行脱敏。
- TicketClub 不需要也不应收集 X 登录 Cookie。

## Responsible integrations

仅连接你有权访问的公开信息源，并遵守来源网站的服务条款、robots 规则和适用法律。项目不接受绕过验证码、访问控制、速率限制或付费接口的代码。
