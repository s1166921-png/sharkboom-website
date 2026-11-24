# 订单后台与官方支付

正式客户入口：`https://sharkboom.meiouyuncang.com/orders`；管理入口：`https://sharkboom.meiouyuncang.com/admin`。

## 当前功能与边界

- 资料提交、人工审核/补充资料、分项人民币报价、客户确认、私密订单链接、收款核验记录、出单跟进。
- 原本的本地 Excel 导出保留；只有勾选说明并点击提交才上传服务器。
- 管理员密码采用 scrypt；首次登录强制改密；会话 Secure/HttpOnly/SameSite=Strict，8 小时到期，改密撤销全部会话；POST 同源校验与 CSRF；登录限流。
- SQLite WAL 事务持久化。客户资料、报价、支付单内容、审计细节使用 AES-256-GCM 加密。链接仅保存 SHA256，随机密钥在 URL fragment，不进入请求路径/访问日志。
- 管理员可以重置客户私密链接，旧链接立即失效，操作留痕。需人工核实客户身份后私下发送；链接持有者可访问该订单。
- 真实收款必须配置经授权的官方商户，后台不能手动标记已收款，也不接受截图替代渠道核验。
- 已确认报价锁定；保费和服务费各自生成支付单，可以对应不同收款主体。报价仅 CNY 按分计价，不自动换算外币展示起价。
- 未收款的确认报价需要变更或已过期时，管理员须先通过官方核查关闭所有支付单，再说明原因撤回报价；原报价及确认时间存档，新报价重新确认。已有收款的订单禁止通过该入口改价，需人工处理退款或变更。
- 支付由已验签的渠道回调/查询确认，校验订单号、金额、币种、商户，并幂等写入唯一交易号。微信 Native 二维码，支付宝 PC / 手机网站官方收银台。微信 JSAPI/H5、服务商/子商户模式未实现，若商户为该模式需要增加对应适配后开启。
- 微信 Native 需要使用微信扫一扫扫描另一设备展示的二维码，不支持长按或相册识别。同一手机上的微信支付应另外接入具有相应权限的 H5/JSAPI，或选择其他已开通渠道。用户提供的固定收款码图片不能替代 Native 下单响应或商户 API 配置。
- 每分钟公平轮询最多 20 笔待支付单补偿遗漏回调；后台可主动查询。生成但未在渠道创建的订单，须在链接有效期及安全缓冲结束（35 分钟）后，经渠道确认不存在才能关闭重试。退款/退保由人工按约定在官方商户/保险机构平台办理；当前不提供在线退款 API，也不将退款、结算或发票自动同步为完成。
- 全额核验收款后才允许登记出单；收款不是承保生效。正式文件由顾问交付，网站记录正式编号、机构与生效日期。

## 服务

独立 systemd `sharkboom-orders.service`，非 root 用户 `sharkboom`，监听 `127.0.0.1:3198`。不替换静态 3D 站点，不占用其他业务端口。

- 代码 `/opt/sharkboom-orders/current`，仅服务端运行依赖（独立 server/package-lock.json）。
- 数据 `/var/lib/sharkboom/orders.db`，目录 0700、文件 0600。
- 设置 `/etc/sharkboom/config.json`，0400/0640，仅 root 与服务用户可读；数据密钥 `/etc/sharkboom/data.key`，不与数据库备份放在同一目录。
- 初次启动需要 `adminUsername` 和随机 `bootstrapPassword`。数据库管理员创建完成后从配置中移除初始密码；正常重启不需要该字段。账号恢复需服务器授权管理员通过离线工具重设哈希，并撤销会话，不可删除数据库重新初始化。
- Nginx 同域代理 `/api/`、`/admin`、`/orders`、`/portal/`，私有页面/响应 no-store/noindex，CSP 限制到本站。
- `sharkboom-backup.timer` 每天备份 SQLite 一致快照，保留 30 天；数据内容仍是加密的。需要服务器管理员另行将备份复制到异地私有存储，并单独备份加密密钥；仅同机备份不能抵御整机丢失。

## 收款启用前配置

`merchants: []` 表示尚未开通。可先完成资料、审核、报价、确认，但没有支付入口。每个收款主体记录 `id`（如 premium/service）、法定 `name`、允许的 `kinds: ["premium"]` 或 `["service"]`，以及以下任一配置。已发布报价的收款名称必须与配置完全一致。

微信直连 Native：`wechat.enabled`、`appId`、`mchId`、`serialNo`、商户 `privateKey`、32 字节 `apiV3Key`，以及 `publicKeys: {"平台证书序列号或 PUB_KEY_ID": "验签公钥 PEM"}`。必须来自商户平台，支持保留多把公钥以便轮换。商户行业、收款授权和 AppID 绑定需由业务主体确认。

支付宝直连网站支付：`alipay.enabled`、`appId`、`sellerId`、应用 `privateKey`、`alipayPublicKey`、`keyType: "PKCS8"`。当前使用普通公钥 RSA2 模式；若商户应用为证书模式需扩展证书配置后启用。必须按商户已签约且生效的产品明确填写 `products`：电脑网站支付为 `["page"]`、手机网站支付为 `["wap"]`，两者均已开通才填写 `["page", "wap"]`。缺失或空数组不提供新的支付宝支付入口；后台仍可核验既有支付单。客户端按设备展示相应入口，服务端在创建支付单前再次核查，不能靠修改前端绕过产品权限。请勿仅凭企业固定收款码推定已开通网站支付。

全部密钥仅配置到服务器私有文件，严禁填进前端、仓库、客户表单或公开消息。开发阶段可用自生成密码学夹具测试，不能把模拟支付当作生产收款。

正式回调路径：`/api/payments/wechat/{收款主体id}` 与 `/api/payments/alipay/{收款主体id}`。服务端创建支付单时自动传递，无需客户填写。配置后需要使用对应商户完成小额真实收款、回调、主动查询、重复回调、原渠道退款与对账测试；目前没有商户参数，尚未做真实交易验证。

官方依据：[微信 Native API](https://pay.wechatpay.cn/doc/v3/merchant/4012791877)、[微信回调与查单](https://pay.wechatpay.cn/doc/v3/merchant/4012075249)、[支付宝官方 Node SDK](https://github.com/alipay/alipay-sdk-nodejs-all)。

## 检查与运维

`npm run test:orders` 验证访问隔离、会话/CSRF/改密、金额/报价状态机、RSA/AES 回调、重复流水、订单匹配和公平查款；`npm audit --prefix server --omit=dev` 检查实际后台依赖。

重启：`systemctl restart sharkboom-orders`；检查：`systemctl status sharkboom-orders` 与 `curl http://127.0.0.1:3198/api/health`；日志禁止记录完整表单、私密链接、密码或密钥。还原备份前先停止服务并保存现有库，通过原加密密钥验证后切换。业务备份、保存期限、隐私主体与收款主体的正式文案需业务方提供准确名称，不在开发中杜撰。
