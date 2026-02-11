const pty = require('node-pty');
const { Server } = require('socket.io');
const http = require('http');
const fs = require('fs');
const path = require('path');

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

const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const PORT = config.backend.port;

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
    socket.emit('output', data);

    // 狀態解析邏輯
    parseStatus(data, socket);
  });

  // 發送終端輸出到前端
  ptyProcess.onData((data) => {
    socket.emit('output', data);

    // 狀態解析邏輯
    parseStatus(data, socket);
  });

  // 接收前端輸入
  socket.on('input', (data) => {
    if (ptyProcess && !ptyProcess.killed) {
      ptyProcess.write(data);
    }
  });

  // 處理終端大小調整
  socket.on('resize', ({ cols, rows }) => {
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

// 狀態解析函數
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
