# 鲨保保官网首页风格提案

本项目提供四个可切换的响应式首页方向，共用已确认的五类险种内容。

- `/`、`/motion-3d` 鲨鲨航海：真实 3D 卡通鲨鱼自动循环游动，可调整视角。
- `/professional` 蓝白专业：品牌盾牌、清晰卡片与咨询导向。
- `/ocean` 深海科技：深色全球航线、编号列表与国际化表达。
- `/editorial` 温暖编辑：米白留白、衬线标题与港口摄影。

保留三个原始模板；旧版环球护航已移除。关于品牌区域使用原始静态 Logo，五类险种入口位于保障方案标题下方。
原始 Logo 从用户提供的附件恢复，保持原图；品牌主色为 #0055BB，辅助色为 #E64A20。

四个模板共用真实联系入口：工作手机号 19386967340、邮箱 huan@seamew.net，以及用户提供的微信二维码。页面不采集客户表单信息，在线投保渠道与内容管理后台暂未接入。

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
