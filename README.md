# 三光仲夏音樂會｜平板主持手卡

這個 repo 用來放置三光仲夏音樂會主持人平板手卡網頁。

## 網頁入口

GitHub Pages 部署完成後，主要網址：

```text
https://yangwtr.github.io/html-test/
```

直接開主持手卡：

```text
https://yangwtr.github.io/html-test/sankuang-midsummer-host-card.html
```

## 主要檔案

- `index.html`：GitHub Pages 首頁，會自動轉到主持手卡。
- `sankuang-midsummer-host-card.html`：主持手卡主檔。
- `AGENTS.md`：給 Codex 的修改規則。
- `.github/workflows/pages.yml`：GitHub Pages 自動部署設定。

## 用 Codex 修改的建議說法

可以直接對 Codex 說：

> 請修改 `sankuang-midsummer-host-card.html`，維持平板主持手卡設計，不要拆檔。請把第幾段串場改成……，修改完成後直接 commit 到 main。

或：

> 請優化 `sankuang-midsummer-host-card.html` 的平板閱讀體驗，維持每段串場獨立切換、字體大小調整、救援短句、全螢幕功能，修改後 commit 到 main。

## 部署方式

已加入 GitHub Pages workflow。之後只要 push 或 Codex commit 到 `main`，GitHub Actions 會自動部署。

若第一次使用 GitHub Pages，請到：

`Settings → Pages → Build and deployment → Source`

選擇：

`GitHub Actions`

之後每次修改 `main` 都會自動更新網頁。
