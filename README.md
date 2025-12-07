# wpf的镜头 (Smart Lens)

這是一個完全本地運行的 AI 圖像識別應用。
This is a fully local AI image recognition app.

## 📂 項目結構 (Project Structure)

为了避免混淆，主要代码已整合至 `src/` 目录：
To avoid confusion, all active code is consolidated in the `src/` directory:

- **`src/App.tsx`**: 主程序逻辑 (Main Application Logic)
- **`src/services/`**: AI 与数据服务 (AI & Data Services)
- **`src/main.tsx`**: 程序入口 (Entry Point)

*根目录下的 `.tsx` 和 `services/` 文件是冗余的，下载后建议保留 `src/` 目录，根目录的重复文件可删除。*

## 🚀 如何部署到 GitHub (How to Deploy)

1. **下載代碼**：點擊右上角的下載按鈕並解壓。
   Download the code and unzip it.

2. **上傳到 GitHub**：
   - 創建一個新的 GitHub Repository。
   - 將解壓後的文件夾中的所有文件直接上傳到該 Repository（确保 package.json 在根目录）。
   
3. **設置 GitHub Pages**：
   - 進入 Repository 的 **Settings** (設置)。
   - 點擊左側菜單的 **Pages**。
   - 在 **Build and deployment** 下：
     - Source 選擇 **GitHub Actions**。
     - GitHub 通常會自動檢測到 `package.json` 並建議配置 (Static HTML 或 Node.js)。如果沒有，選擇 **Static HTML** 也可以尝试，或者使用默认的 **Node.js** workflow。

## 🛡️ 隱私與費用 (Privacy & Cost)

- **100% 免費**：不需要任何 API Key。
- **本地運行**：所有 AI 識別（TensorFlow.js & Tesseract.js）都在您的瀏覽器中運行。
- **隱私安全**：圖片數據不會發送到任何服務器。
