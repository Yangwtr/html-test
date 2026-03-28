# 三光寶貝 AI 訓練基地（最小版原型）

## 你會得到什麼
- ✅ 上傳詩詞百寶箱檔（示意：顯示檔名）
- ✅ Excel 匯入 Q&A（欄位：intent / question / answer）
- ✅ 手動新增 Q&A → 草稿
- ✅ 教師審核：草稿 → 已審核
- ✅ 互動問答：只用「已審核」題庫回答（相似度匹配示意）
- ✅ 右下角：會動的三光寶貝 + 對話泡泡

## 安裝與啟動
```bash
npm install
npm run dev
```

## 圖片位置
- 三光寶貝圖片放在：`public/sanguang-baobei.png`
- 你也可以換成自己的版本，只要檔名相同即可。

## Excel 欄位格式
第一列請包含：
- intent
- question
- answer
