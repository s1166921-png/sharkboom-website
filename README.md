# 鲨保保 SharkBoom 官网

正式首页选用 3D 鲨鱼版本，展示五类险种、服务介绍与联系入口，已移除页面顶部的风格切换栏。

- `/`、`/motion-3d` 鲨鲨航海：真实 3D 卡通鲨鱼自动循环游动，可调整视角。
- `/professional` 蓝白专业：品牌盾牌、清晰卡片与咨询导向。
- `/ocean` 深海科技：深色全球航线、编号列表与国际化表达。
- `/editorial` 温暖编辑：米白留白、衬线标题与港口摄影。

三个原始模板作为设计归档保存在仓库及 GitHub Pages 中；独立服务器只导出正式 3D 首页。关于品牌区域使用原始静态 Logo，五类险种入口位于保障方案标题下方。
原始 Logo 从用户提供的附件恢复，保持原图；品牌主色为 #0055BB，辅助色为 #E64A20。

四个模板共用真实联系入口：工作手机号 19386967340、邮箱 huan@seamew.net，以及用户提供的微信二维码。正式 3D 首页支持按险种填写资料、在浏览器本地导出 `.xlsx`，或同意说明后提交订单。独立服务器提供 `/admin` 管理员登录和 `/orders` 客户专属进度页，支持人工审核、报价、费用确认、官方渠道支付核验和出单跟进。商户未配置时禁用支付；保险不自动生效，出单由人工跟进。GitHub Pages 只提供静态设计预览，订单服务在正式官网运行。

险种顺序为 VIES、产品责任险、TRO、货运险、贸易信用险。前三个有条件的参考价格按业务方提供的口径展示，贸易信用险留空；TRO 支持风险检测指引，导出信息表后展示 AI 律师服务入口。外部链接由业务方确认后填写在 `app/motion/service-links.ts`；未配置时明确显示顾问对接入口。微信联系人目前为用户提供的昵称，复制内容提示扫码添加，不将昵称声称为微信号。

运行 `npm run test:intake` 检查 Excel，`npm run test:orders` 检查订单权限、报价状态机与支付密码学校验。资料和业务流程共用 `shared/intake-plans.json`，避免前后端字段不一致。后台运行、账号、备份与商户配置见 [deploy/ORDERS.md](deploy/ORDERS.md)。

## 本地运行

Node.js 22.13 或更高版本。

```sh
npm ci
npm run dev
npm run build
```

## 设计素材

`public/hero-professional.png`：原创蓝色鲨鱼盾牌、橙色球体与货物，浅蓝工作室光线。
`public/hero-ocean.png`：原创深蓝地球与橙色跨境航线，左侧预留标题空间。
`public/hero-editorial.png`：原创暖色晨光港口摄影，蓝橙集装箱与国际货轮。
`public/og.png`：配有品牌名称和服务定位的原创社交分享卡片。

以上四张图片通过内置 ImageGen 生成。原始 Logo 为用户素材，未重新绘制。

`public/contact/wechat-sharkboom.jpg`：用户提供的微信联系二维码原图，保持原始文件，未重新绘制。

## 发布

正式部署目标：`https://sharkboom.meiouyuncang.com/`。构建命令为 `npm run build:server`，需设置 `SITE_ORIGIN`；独立子站产物位于 `out-server/`，服务器配置与更新说明见 [deploy/README.md](deploy/README.md)。

网站地址：https://s1166921-png.github.io/sharkboom-website/

代码仓库：https://github.com/s1166921-png/sharkboom-website

推送到 `main` 后，GitHub Actions 自动安装依赖、导出静态页面并部署到 GitHub Pages。仓库 Settings → Pages 的来源为 GitHub Actions。首次发布通常需要等待工作流完成。

本地生成同样的静态文件：

```sh
npm ci
npm run build:pages
```

输出在 `out/`。`GITHUB_REPOSITORY`、`GITHUB_PAGES_BASE_PATH` 和 `GITHUB_PAGES_ORIGIN` 可覆盖仓库名称、子路径与站点来源；Logo、模板导航、字体和 3D 模型均适配子路径。

原 Sites 构建保持兼容：`npm run build` 仍生成 vinext / Cloudflare Worker 版本，原预览站访问权限保持不变。
