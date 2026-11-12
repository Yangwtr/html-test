# AI-Agent-Team 風險與待辦追蹤

更新日期：2026-11-12
範圍：`AI-Agent-Team` 分支（不包含 `main`）

> 狀態說明：以下項目尚未經過完整驗收。GitHub Actions 未取得可確認的成功或失敗執行結果；不得將「程式已提交」視為「測試已通過」。

## P0 — 優先排除阻塞

- [ ] **確認 GitHub Actions 是否啟動**：檢查 `.github/workflows/ai-agent-team-check.yml` 的 push、pull_request、workflow_dispatch 觸發條件、Actions 啟用狀態、權限及執行紀錄。
  - 完成條件：取得對應提交 SHA 的 run ID、執行狀態與連結。
- [ ] **取得完整測試報告**：下載 `ai-agent-team-test-results` artifact，核對 `node --test` 的測試總數、通過數、失敗數與錯誤訊息。
  - 完成條件：測試報告可追溯到指定提交 SHA。
- [ ] **修復測試失敗並重跑**：逐項修正、重新執行所有 `ai-agent-team/*.test.mjs`。
  - 完成條件：最新提交的完整測試全部通過，且無跳過關鍵測試。

## P1 — 可靠性與安全

- [ ] **驗證中斷恢復**：重啟後補建遺漏工作、重播已完成但未交接的工作，且不得重複推進舊一輪審查。
- [ ] **驗證租約與重試**：舊 worker 回報必須被拒絕；租約過期與死信處理需可稽核。外部副作用不保證 exactly-once，需冪等鍵及外部去重。
- [ ] **強化審查證據**：不能只信任傳入的 `reviewer` 或 `reviewId` 字串；應核對 GitHub 審查身分、commit SHA、PR 與結論。
- [ ] **強化 CI 證據**：不能只信任傳入的 `runId` 或 `conclusion` 字串；應向 GitHub 核對 workflow run 與受測 commit。
- [ ] **驗證人工批准邊界**：目前 `actor='human'` 或 `approved:true` 不等同於已驗證的真人身分；正式上線須由受信任的核准流程確認。

## P2 — 連線與上線

- [ ] **逐一接入 Claude、Codex、Gemini**：先確認訂閱／API 使用權限、費用上限及執行環境；不得默默呼叫付費 API。
- [ ] **遷移私有儲存庫並保護密鑰**：現有 `html-test` 為公開儲存庫；正式使用前處理權限、密鑰與分支保護。
- [ ] **上線前驗收**：端到端實測、成本防護、緊急停止及人工合併批准；不得自動合併至 `main`。

## 目前已提交的實作（不代表已驗收）

- 任務總控、工作佇列、失敗復原、驗證閘門與測試案例。
- GitHub Actions 工作流程已加入 TAP 測試紀錄、artifact 與摘要。
- 尚未取得可確認的完整 GitHub Actions 測試結果。
- Claude／Codex／Gemini 真實執行器尚未連線。

## 追蹤規則

每完成一項，記錄：負責人、提交 SHA、測試／審查證據連結、日期與結果；沒有證據不得勾選。保留人工合併批准，不得將模擬測試當作真實 AI 服務驗證。
