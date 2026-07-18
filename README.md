# 呼吸練習

用音檔與圓圈動畫引導呼吸的簡單網頁 App，可加到手機主畫面離線使用。

- 可自訂 吸氣 / 閉氣 / 呼氣 / 閉氣 秒數與練習總時間
- 閉氣秒數設為 0 會自動跳過該階段（可做單純的吸-呼練習）
- 練習時間到會先做完當前整輪循環，才播放結束音
- 設定會自動記憶，下次開啟直接沿用

## 本機測試

```
npx serve -l 3000 .
```

瀏覽器開 http://localhost:3000 。

**請勿用 `file://` 直接開啟 index.html** —— 部分手機瀏覽器在 `file://` 下無法載入音檔，且 Service Worker 也不會運作。

## 執行測試

```
node tests/engine.test.js
```

## 部署（擇一，皆為免費靜態空間）

- **GitHub Pages**：把整個資料夾推到 GitHub repo → Settings → Pages → 選擇 branch 與根目錄，即可取得網址。
- **Netlify / Cloudflare Pages**：直接拖曳整個資料夾上傳，即可取得網址。

部署後把網址傳給任何人，手機或桌機瀏覽器打開就能用，不需安裝。Android Chrome 可從選單「加到主畫面」，之後即使沒有網路也能使用。

## 更新音檔

替換 `sound/` 內對應檔案（檔名保持不變），並把 `service-worker.js` 開頭的 `CACHE` 版本號遞增（例如 `breath-v1` → `breath-v2`），舊使用者才會取得新版音檔。

## 檔案結構

| 路徑 | 用途 |
|---|---|
| `index.html` | 頁面骨架（設定畫面 + 練習畫面） |
| `style.css` | 版面與圓圈動畫樣式 |
| `src/engine.js` | 純邏輯：階段序列展開、設定正規化 |
| `app.js` | DOM 綁定、音檔播放、練習流程控制 |
| `manifest.json` / `service-worker.js` | PWA 與離線快取 |
| `sound/` | 五個引導音檔 |
| `tests/engine.test.js` | 引擎單元測試（純 Node，無外部套件） |
