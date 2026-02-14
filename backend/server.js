const path = require('path');
const fs = require('fs');
const os = require('os');

// 載入環境變數
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pty = require('node-pty');
const { Server } = require('socket.io');
const http = require('http');
const { initTelegramBot, sendTelegram } = require('./telegramBot');

// 驗證必要的環境變數
function validateEnvironment() {
  const warnings = [];

  if (!process.env.BACKEND_PORT) {
    warnings.push('BACKEND_PORT not set, using default from config.json');
  }

  if (!process.env.GIT_BASH_PATH) {
    warnings.push('GIT_BASH_PATH not set, using default from config.json');
  }

  if (!process.env.TG_BOT_TOKEN) {
    warnings.push('TG_BOT_TOKEN not set, Telegram Bot disabled');
  }

  if (!process.env.MY_CHAT_ID) {
    warnings.push('MY_CHAT_ID not set, Telegram notifications disabled');
  }

  if (warnings.length > 0) {
    console.warn('⚠️  Environment warnings:');
    warnings.forEach(w => console.warn(`   - ${w}`));
    console.warn('   Consider creating .env file from .env.example');
    console.warn('');
  }
}

validateEnvironment();

// 載入配置檔案（加入錯誤處理）
let config;
try {
  const configPath = path.join(__dirname, '..', 'config.json');
  const configContent = fs.readFileSync(configPath, 'utf8');
  config = JSON.parse(configContent);
  console.log('✓ 成功載入 config.json');
} catch (error) {
  console.error('❌ 無法載入 config.json:', error.message);
  console.error('請確認 config.json 存在且格式正確');
  process.exit(1);
}

// 驗證 Git Bash 路徑
const BASH_PATH = config.backend.bashPath;
if (!fs.existsSync(BASH_PATH)) {
  console.error(`❌ Git Bash 路徑不存在: ${BASH_PATH}`);
  console.error('請修改 config.json 中的 backend.bashPath');
  console.error('常見路徑:');
  console.error('  - C:\\Program Files\\Git\\bin\\bash.exe');
  console.error('  - C:\\Program Files (x86)\\Git\\bin\\bash.exe');
  process.exit(1);
}

// 解析允許的來源
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
  : ['http://localhost:5173'];

console.log('✓ Allowed CORS origins:', allowedOrigins);

const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // 允許沒有 origin 的請求（例如：Postman、curl）
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`⚠️  Blocked CORS request from: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const PORT = config.backend.port;

// 全局 PTY session 追蹤（socketId -> ptyProcess）
/** @type {Map<string, import('node-pty').IPty>} */
const activeSessions = new Map();

// 追蹤每個 session 的最後輸出時間（socketId -> timestamp）
/** @type {Map<string, number>} */
const lastOutputTimes = new Map();

// 全局角色狀態（供 Telegram Bot 查詢）
const globalRoles = config.roles.map(r => ({
  id: r.id,
  title: r.title,
  status: 'IDLE'
}));

// 最新心跳資料（供 Telegram Bot 查詢）
/** @type {{ cpuPercent: number, memPercent: number, claudeActive: boolean } | null} */
let latestHealth = null;

// Claude 異常警報狀態（避免重複發送）
let claudeInactiveAlertSent = false;

// 重要輸出關鍵字（觸發 Telegram 通知）
const IMPORTANT_KEYWORDS = ['ERROR', 'FATAL', 'DONE', 'COMPLETED', '❌', '✓', '✗'];

// 全域輸出 buffer（ANSI 去除後，最多 100 行）
const OUTPUT_BUFFER_MAX = 100;
const outputBuffer = [];

// 輸出訂閱者（callback set，供 Telegram Bot 即時監聽）
/** @type {Set<(line: string) => void>} */
const outputSubscribers = new Set();

/**
 * 將終端輸出追加到全域 buffer，並通知所有訂閱者
 * @param {string} data - 原始終端輸出（含 ANSI escape code）
 */
function appendOutputBuffer(data) {
  const stripped = data.replace(/\x1b\[[0-9;]*[mGKHFJ]/g, '').replace(/\r/g, '');
  const lines = stripped.split('\n').filter(l => l.trim());
  for (const line of lines) {
    outputBuffer.push(line);
    if (outputBuffer.length > OUTPUT_BUFFER_MAX) outputBuffer.shift();
    outputSubscribers.forEach(cb => cb(line));
  }
}

// Claude 活躍度閾值（30 秒內有輸出視為活躍）
const CLAUDE_ACTIVE_THRESHOLD_MS = 30_000;

io.on('connection', (socket) => {
  console.log(`✓ Client connected [${socket.id}]`);

  let ptyProcess;

  try {
    ptyProcess = pty.spawn(BASH_PATH, [], {
      name: config.backend.terminal.name,
      cols: config.backend.terminal.cols,
      rows: config.backend.terminal.rows,
      cwd: process.env.HOME || process.env.USERPROFILE,
      env: process.env
    });

    activeSessions.set(socket.id, ptyProcess);
    lastOutputTimes.set(socket.id, Date.now());
    console.log(`✓ Terminal created for client [${socket.id}]`);
  } catch (error) {
    console.error(`❌ 無法建立終端機 [${socket.id}]:`, error.message);
    socket.emit('error', { message: '無法建立終端機連線，請檢查 Git Bash 路徑' });
    socket.disconnect();
    return;
  }

  // 監聽 pty 錯誤
  ptyProcess.on('error', (err) => {
    console.error(`❌ Terminal error [${socket.id}]:`, err.message);
    socket.emit('error', { message: '終端機發生錯誤' });
  });

  // 發送終端輸出到前端
  ptyProcess.onData((data) => {
    // 更新最後輸出時間（Claude 活躍度依據）
    lastOutputTimes.set(socket.id, Date.now());
    claudeInactiveAlertSent = false; // 重置警報狀態

    socket.emit('output', data);

    // 狀態解析邏輯
    parseStatus(data, socket);

    // 追加到全域輸出 buffer
    appendOutputBuffer(data);

    // 重要輸出推送到 Telegram
    const stripped = data.replace(/\x1b\[[0-9;]*m/g, '').trim();
    if (stripped && IMPORTANT_KEYWORDS.some(kw => stripped.includes(kw))) {
      const preview = stripped.slice(0, 200);
      sendTelegram(`📟 *Terminal [${socket.id.slice(0, 6)}]*\n\`\`\`\n${preview}\n\`\`\``);
    }
  });

  // 接收前端輸入
  socket.on('input', (data) => {
    if (typeof data !== 'string') {
      console.error(`❌ Invalid input data type from [${socket.id}]:`, typeof data);
      return;
    }

    if (ptyProcess && !ptyProcess.killed) {
      ptyProcess.write(data);
    }
  });

  // 處理終端大小調整
  socket.on('resize', ({ cols, rows }) => {
    if (typeof cols !== 'number' || typeof rows !== 'number') {
      console.error(`❌ Invalid resize dimensions type from [${socket.id}]`);
      return;
    }

    if (cols < 1 || cols > 500 || rows < 1 || rows > 500) {
      console.error(`❌ Invalid resize dimensions from [${socket.id}]: ${cols}x${rows}`);
      return;
    }

    if (ptyProcess && !ptyProcess.killed) {
      try {
        ptyProcess.resize(cols, rows);
      } catch (error) {
        console.error(`❌ Resize error [${socket.id}]:`, error.message);
      }
    }
  });

  // 客戶端斷線處理
  socket.on('disconnect', () => {
    console.log(`✗ Client disconnected [${socket.id}]`);
    activeSessions.delete(socket.id);
    lastOutputTimes.delete(socket.id);

    if (ptyProcess && !ptyProcess.killed) {
      try {
        ptyProcess.kill();
        console.log(`✓ Terminal closed for [${socket.id}]`);
      } catch (error) {
        console.error(`❌ Error killing terminal [${socket.id}]:`, error.message);
      }
    }
  });
});

/**
 * 解析終端機輸出並更新角色狀態
 *
 * 根據終端機輸出內容中的關鍵字，自動偵測並更新對應角色的狀態。
 * 會檢查角色關鍵字（如 [PM]、[RD] 等）和狀態關鍵字（如 DONE、RUNNING）。
 *
 * @param {string} data - 終端機輸出的資料
 * @param {import('socket.io').Socket} socket - Socket.io 連線實例，用於發送狀態更新
 */
function parseStatus(data, socket) {
  const roles = config.roles;
  const statusKeywords = config.statusKeywords;

  // 檢查角色關鍵字
  roles.forEach(role => {
    role.keywords.forEach(keyword => {
      if (data.includes(keyword)) {
        socket.emit('status-update', {
          role: role.id,
          status: 'RUNNING',
          title: role.title
        });

        // 同步更新全局角色狀態
        const gr = globalRoles.find(r => r.id === role.id);
        if (gr) gr.status = 'RUNNING';
      }
    });
  });

  // 檢查狀態關鍵字
  if (statusKeywords.done.some(keyword => data.includes(keyword))) {
    socket.emit('status-update', { status: 'DONE' });
  } else if (statusKeywords.running.some(keyword => data.includes(keyword))) {
    socket.emit('status-update', { status: 'RUNNING' });
  } else if (statusKeywords.idle.some(keyword => data.includes(keyword))) {
    socket.emit('status-update', { status: 'IDLE' });
  }
}

/**
 * 取得 CPU 使用率百分比（對比兩次取樣的差值）
 *
 * @returns {Promise<number>} CPU 使用率（0-100）
 */
function getCpuPercent() {
  return new Promise((resolve) => {
    const sample1 = os.cpus();
    setTimeout(() => {
      const sample2 = os.cpus();
      let totalDiff = 0;
      let idleDiff = 0;

      sample1.forEach((cpu, i) => {
        const s1 = cpu.times;
        const s2 = sample2[i].times;
        const total = (s2.user - s1.user) + (s2.nice - s1.nice) +
                      (s2.sys - s1.sys) + (s2.idle - s1.idle) + (s2.irq - s1.irq);
        totalDiff += total;
        idleDiff += (s2.idle - s1.idle);
      });

      const cpuPercent = totalDiff === 0 ? 0 : ((totalDiff - idleDiff) / totalDiff) * 100;
      resolve(Math.round(cpuPercent * 10) / 10);
    }, 200);
  });
}

/**
 * 取得記憶體使用率百分比
 *
 * @returns {number} 記憶體使用率（0-100）
 */
function getMemPercent() {
  const total = os.totalmem();
  const free = os.freemem();
  return Math.round(((total - free) / total) * 1000) / 10;
}

// Heartbeat：每 10 秒廣播系統狀態
const HEARTBEAT_INTERVAL = 10_000;

setInterval(async () => {
  try {
    const cpuPercent = await getCpuPercent();
    const memPercent = getMemPercent();

    // 計算 Claude 活躍度：任一 session 在 30 秒內有輸出即視為活躍
    const now = Date.now();
    let claudeActive = false;
    if (lastOutputTimes.size > 0) {
      for (const ts of lastOutputTimes.values()) {
        if (now - ts < CLAUDE_ACTIVE_THRESHOLD_MS) {
          claudeActive = true;
          break;
        }
      }
    }

    latestHealth = { cpuPercent, memPercent, claudeActive };
    io.emit('heartbeat', { cpuPercent, memPercent, claudeActive });

    // Telegram 警報：有活躍 session 但 Claude 已停止回應
    if (activeSessions.size > 0 && !claudeActive && !claudeInactiveAlertSent) {
      claudeInactiveAlertSent = true;
      sendTelegram('⚠️ *Claude Cockpit 警告*\n偵測到 Claude Code 回應延遲超過 30 秒，請確認系統狀態。');
    }
  } catch (err) {
    console.error('❌ Heartbeat error:', err.message);
  }
}, HEARTBEAT_INTERVAL);

// 初始化 Telegram Bot
initTelegramBot({
  getActiveSessions: () => activeSessions,
  getRoles: () => globalRoles,
  getHealth: () => latestHealth,
  getOutputBuffer: () => [...outputBuffer],
  subscribeOutput: (cb) => {
    outputSubscribers.add(cb);
    return () => outputSubscribers.delete(cb);
  }
});

server.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   Claude Cockpit Backend Server v1.0.0  ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
  console.log(`✓ Server running on port ${PORT}`);
  console.log(`✓ Using Git Bash at: ${BASH_PATH}`);
  console.log(`✓ Terminal size: ${config.backend.terminal.cols}x${config.backend.terminal.rows}`);
  console.log('');
  console.log('Waiting for client connections...');
  console.log('');
});

// 處理未捕獲的錯誤
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
