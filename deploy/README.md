# 鲨保保独立子站部署

目标域名：`https://sharkboom.meiouyuncang.com/`。

正式子站只导出 3D 鲨鱼首页，保留五类险种详情和真实联系方式。原始三个设计模板的源码保存在仓库中。

## 构建

Node.js 22.13 或以上版本，安装依赖后执行：

```sh
SITE_ORIGIN=https://sharkboom.meiouyuncang.com npm run build:server
STANDALONE_SITE=true node --test tests/github-pages.test.mjs
```

PowerShell 对应命令：

```powershell
$env:SITE_ORIGIN='https://sharkboom.meiouyuncang.com'
npm.cmd run build:server
$env:STANDALONE_SITE='true'
node --test tests/github-pages.test.mjs
Remove-Item Env:STANDALONE_SITE
```

产物位于 `out-server/`，使用根路径资源，可直接由 Nginx 提供服务。服务器只需要静态文件，无需运行 Node.js 或连接数据库。

## 服务器布局

- 每次构建上传到 `/var/www/sharkboom/releases/<版本号>/`。
- `/var/www/sharkboom/current` 指向当前发布目录，通过替换软链接切换版本。
- 新虚拟主机配置见 `deploy/nginx.conf`，验证 `nginx -t` 后再重载。
- DNS 主机记录为 `sharkboom`，A 记录指向部署服务器；通过现有 Certbot 的 webroot 模式签发证书，验证目录为 `/var/www/letsencrypt`。
- 证书续期使用 Certbot 定时任务，新证书的 deploy hook 执行 `nginx -t && systemctl reload nginx`。
- `/professional`、`/ocean`、`/editorial`、`/motion-3d` 旧入口统一跳转到首页。

首页 HTML 每次访问会重新验证，带内容哈希的脚本和模型长期缓存，Logo 与微信二维码使用短期缓存。

服务器登录信息和 DNS 凭据只从用户提供的本机文件或服务器已有的域名工具配置读取，均不写入仓库和发布产物。

相关配置参考：[Nginx 响应头与缓存](https://nginx.org/en/docs/http/ngx_http_headers_module.html)、[阿里云 DNS API](https://help.aliyun.com/en/dns/api-alidns-2015-01-09-overview)。
