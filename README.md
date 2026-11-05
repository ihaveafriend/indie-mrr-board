# 公开收入观察 · Indie MRR Board

中文优先的静态站：展示 TrustMRR 公开首页 Top50 验证 MRR，并说明「收银台反查」方法与局限。

## 本地路径

- 源码 / 可编辑文件：`/workspace/indie-mrr-board/`
- 可部署目录：`/workspace/indie-mrr-board/dist/`

## 站内内容

1. **首页榜单**：TrustMRR Top50（搜索、按 MRR/环比/名称排序），每行链到 TrustMRR `source_url`
2. **方法说明**：TrustMRR 验证收入 vs Similarweb 收银台域名引荐反查 vs 人工路径
3. **收银台反查预留**：`data/checkout_referrals.json`（空数组 + schema 注释）
4. **页脚**：来源、抓取日期（Asia/Singapore）、免责声明、非官方声明

## 数据

- `data/trustmrr_top50.json` — 抓取日期 2026-11-05
- 不包含 msfdcszhd.com / topcheckouts.com 的文案或整站镜像
- 仓库内无 API key

## 部署

已用 flypod 匿名部署（免费、无需账号）：

```bash
npx --yes flypod ./dist
```

匿名站点约 **14 天**后过期；运行 `flypod login` 可认领永久保留。

其他曾尝试：

- Surge：需 `surge login` / `SURGE_TOKEN`
- Netlify `--allow-anonymous`：成功但带站点密码且约 60 分钟内需认领
- cloudflared / localtunnel：本环境出站隧道 TLS 失败
