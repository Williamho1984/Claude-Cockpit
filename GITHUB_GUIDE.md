# Claude Cockpit UI - GitHub 上傳指南

## 🎯 準備上傳到 GitHub

### 步驟 1: 初始化 Git 倉庫

```bash
cd "e:\何偉豪\Claude Cockpit"

# 初始化 Git
git init

# 確認 .gitignore 正確（已包含）
# 會自動排除 node_modules, dist, .env 等
```

### 步驟 2: 建立 GitHub 倉庫

1. 前往 https://github.com/new
2. 填寫倉庫資訊：
   - **Repository name**: `claude-cockpit-ui`（或您喜歡的名稱）
   - **Description**: `專業的 Web UI 控制台，用於與 Claude Code 進行互動`
   - **Public** 或 **Private**（建議 Private）
   - ❌ **不要**勾選 "Add a README file"（我們已經有了）
   - ❌ **不要**勾選 "Add .gitignore"（我們已經有了）
3. 點擊 "Create repository"

### 步驟 3: 提交程式碼

```bash
# 添加所有檔案
git add .

# 查看將要提交的檔案
git status

# 確認不包含：
# - node_modules/
# - dist/
# - .env

# 提交
git commit -m "Initial commit: Claude Cockpit UI v1.0.0

- 完整的前後端程式碼
- React + TypeScript + Tailwind CSS 前端
- Node.js + Socket.io 後端
- 完整的文件與啟動腳本
- 程式碼審查與修復"

# 設定主分支名稱
git branch -M main

# 連接到 GitHub（替換成您的倉庫 URL）
git remote add origin https://github.com/YOUR_USERNAME/claude-cockpit-ui.git

# 推送到 GitHub
git push -u origin main
```

### 步驟 4: 驗證上傳

前往您的 GitHub 倉庫頁面，確認：
- ✅ 所有檔案都已上傳
- ✅ README.md 正確顯示
- ✅ 沒有 node_modules 資料夾
- ✅ 檔案數量約 25-30 個

---

## 🔐 如果使用 HTTPS 需要 Token

GitHub 已不支援密碼認證，需要使用 Personal Access Token：

### 建立 Token

1. 前往 https://github.com/settings/tokens
2. 點擊 "Generate new token" → "Generate new token (classic)"
3. 設定：
   - **Note**: `Claude Cockpit Upload`
   - **Expiration**: 選擇期限
   - **Select scopes**: 勾選 `repo`
4. 點擊 "Generate token"
5. **複製 Token**（只會顯示一次！）

### 使用 Token

```bash
# 方法 1: 在 URL 中包含 Token
git remote set-url origin https://YOUR_TOKEN@github.com/YOUR_USERNAME/claude-cockpit-ui.git
git push -u origin main

# 方法 2: 使用 Git Credential Manager（推薦）
git push -u origin main
# 會彈出視窗要求輸入帳號密碼
# Username: YOUR_USERNAME
# Password: YOUR_TOKEN
```

---

## 🔑 或使用 SSH（推薦）

### 設定 SSH Key

```bash
# 1. 生成 SSH Key
ssh-keygen -t ed25519 -C "your_email@example.com"
# 按 Enter 使用預設位置
# 設定密碼（可選）

# 2. 複製公鑰
cat ~/.ssh/id_ed25519.pub
# 或 Windows
type %USERPROFILE%\.ssh\id_ed25519.pub

# 3. 新增到 GitHub
# 前往 https://github.com/settings/keys
# 點擊 "New SSH key"
# 貼上公鑰內容

# 4. 測試連線
ssh -T git@github.com

# 5. 使用 SSH URL
git remote set-url origin git@github.com:YOUR_USERNAME/claude-cockpit-ui.git
git push -u origin main
```

---

## 📦 在另一台終端機下載

```bash
# Clone 專案
git clone https://github.com/YOUR_USERNAME/claude-cockpit-ui.git
cd claude-cockpit-ui

# 安裝依賴
cd backend && npm install
cd ../frontend && npm install

# 調整 config.json 中的 bashPath

# 啟動
.\start.ps1  # Windows
./start.sh   # Linux/Mac
```

---

## 🎯 完整指令總結

```bash
# === 在當前終端機 ===

# 1. 初始化 Git
cd "e:\何偉豪\Claude Cockpit"
git init

# 2. 提交程式碼
git add .
git commit -m "Initial commit: Claude Cockpit UI v1.0.0"

# 3. 連接 GitHub（替換 URL）
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/claude-cockpit-ui.git

# 4. 推送
git push -u origin main

# === 在另一台終端機 ===

# 1. Clone
git clone https://github.com/YOUR_USERNAME/claude-cockpit-ui.git
cd claude-cockpit-ui

# 2. 安裝依賴
cd backend && npm install
cd ../frontend && npm install

# 3. 啟動
.\start.ps1
```

---

## ✅ 檢查清單

上傳前確認：
- [ ] `.gitignore` 存在且正確
- [ ] 沒有 `node_modules` 資料夾
- [ ] 沒有 `.env` 檔案（如果有敏感資訊）
- [ ] `README.md` 已更新
- [ ] 所有文件檔案都存在

上傳後確認：
- [ ] GitHub 上可以看到所有檔案
- [ ] README.md 正確顯示
- [ ] 檔案總數約 25-30 個
- [ ] 大小約 200KB（不含 node_modules）

---

## 💡 提示

1. **第一次推送**可能需要輸入 GitHub 帳號密碼（或 Token）
2. **建議使用 SSH**，之後推送不需要輸入密碼
3. **Private 倉庫**可以保護您的程式碼
4. **定期 commit**，保持版本歷史

---

## 🆘 常見問題

### Q: git push 要求輸入密碼但不接受？
**A**: GitHub 已不支援密碼，請使用 Personal Access Token 或 SSH。

### Q: 上傳很慢？
**A**: 確認沒有包含 node_modules（應該被 .gitignore 排除）。

### Q: 忘記排除 node_modules 怎麼辦？
**A**: 
```bash
git rm -r --cached node_modules
git commit -m "Remove node_modules"
git push
```

---

準備好了嗎？開始上傳吧！🚀
