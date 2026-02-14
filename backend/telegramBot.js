/**
 * Claude Cockpit - Telegram Bot 遠端控制模組
 *
 * 指令：
 *   /status  - 查看系統狀態（CPU、記憶體、Claude 活躍度、角色）
 *   /run <cmd> - 對所有活躍終端執行指定命令
 *   /help    - 顯示可用指令
 *
 * 任意文字訊息：直接轉發到所有活躍終端機（等同 /run）
 * 安全：只有 MY_CHAT_ID 的訊息才會被處理
 */

'use strict';

const { Telegraf } = require('telegraf');

const BOT_TOKEN = process.env.TG_BOT_TOKEN;
const MY_CHAT_ID = process.env.MY_CHAT_ID;

/** @type {Telegraf | null} */
let bot = null;

/**
 * 傳送訊息到 Telegram（忽略未配置錯誤）
 *
 * @param {string} text - 要傳送的訊息
 */
async function sendTelegram(text) {
  if (!bot || !MY_CHAT_ID) return;
  try {
    await bot.telegram.sendMessage(MY_CHAT_ID, text, { parse_mode: 'Markdown' });
  } catch (err) {
    console.error('❌ Telegram sendMessage error:', err.message);
  }
}

/**
 * 將文字轉發到所有活躍 PTY session
 *
 * @param {Map<string, import('node-pty').IPty>} sessions
 * @param {string} text
 * @returns {number} 成功送出的 session 數量
 */
function writeToSessions(sessions, text) {
  let sent = 0;
  sessions.forEach((ptyProcess) => {
    try {
      if (!ptyProcess.killed) {
        ptyProcess.write(text + '\r');
        sent++;
      }
    } catch (err) {
      console.error('❌ Telegram write to PTY error:', err.message);
    }
  });
  return sent;
}

/**
 * 初始化並啟動 Telegram Bot
 *
 * @param {{
 *   getActiveSessions: () => Map<string, import('node-pty').IPty>,
 *   getRoles: () => Array<{id: string, title: string, status: string}>,
 *   getHealth: () => {cpuPercent: number, memPercent: number, claudeActive: boolean} | null
 * }} ctx - 注入的依賴
 * @returns {Telegraf | null} bot 實例（配置缺失時回傳 null）
 */
/**
 * 送出指令並等待 5 秒，將新輸出回傳 Telegram
 *
 * @param {import('telegraf').Context} ctx
 * @param {string} cmd
 * @param {Map} sessions
 * @param {(cb: Function) => Function} subscribeOutput
 */
async function sendCommandAndCapture(ctx, cmd, sessions, subscribeOutput) {
  const sent = writeToSessions(sessions, cmd);
  await ctx.reply(`🚀 已執行：\`${cmd}\` (${sent} 個終端)\n⏳ 等待輸出中（最多 5 秒）...`, { parse_mode: 'Markdown' });

  const capturedLines = [];
  const unsubscribe = subscribeOutput((line) => {
    capturedLines.push(line);
  });

  await new Promise(resolve => setTimeout(resolve, 5000));
  unsubscribe();

  if (capturedLines.length === 0) {
    await ctx.reply('⏱ 5 秒內無新輸出');
    return;
  }

  const text = capturedLines.slice(-30).join('\n').slice(0, 3500);
  await ctx.reply(`📟 *執行結果：*\n\`\`\`\n${text}\n\`\`\``, { parse_mode: 'Markdown' });
}

function initTelegramBot({ getActiveSessions, getRoles, getHealth, getOutputBuffer, subscribeOutput }) {
  if (!BOT_TOKEN) {
    console.warn('⚠️  TG_BOT_TOKEN 未設定，Telegram Bot 已停用');
    return null;
  }

  if (!MY_CHAT_ID) {
    console.warn('⚠️  MY_CHAT_ID 未設定，Telegram Bot 無法發送通知');
  }

  bot = new Telegraf(BOT_TOKEN);

  // 安全中介層：只允許 MY_CHAT_ID 操作
  bot.use((ctx, next) => {
    if (MY_CHAT_ID && ctx.chat && ctx.chat.id.toString() !== MY_CHAT_ID) {
      return ctx.reply('⛔ 未授權的存取');
    }
    return next();
  });

  // /start
  bot.start((ctx) => {
    ctx.reply(
      '🚀 *Claude Cockpit 已連線*\n\n傳送任意文字即可直接輸入到終端機。\n輸入 /help 查看指令列表。',
      { parse_mode: 'Markdown' }
    );
  });

  // /help
  bot.command('help', async (ctx) => {
    await ctx.reply(
      '*Claude Cockpit Bot 指令*\n\n' +
      '`/status` — 查看系統狀態\n' +
      '`/run <命令>` — 執行命令並回傳輸出\n' +
      '`/last` — 查看最近 20 行輸出\n' +
      '`/help` — 顯示此說明\n\n' +
      '💡 *直接輸入文字* 即轉發到終端並等待回應',
      { parse_mode: 'Markdown' }
    );
  });

  // /last — 查看最近輸出
  bot.command('last', async (ctx) => {
    const lines = getOutputBuffer();
    if (lines.length === 0) {
      await ctx.reply('⚠️ 目前沒有輸出記錄，請先在 Web UI 開啟終端');
      return;
    }
    const text = lines.slice(-20).join('\n').slice(0, 3500);
    await ctx.reply(`📋 *最近輸出（最後 ${Math.min(lines.length, 20)} 行）：*\n\`\`\`\n${text}\n\`\`\``, { parse_mode: 'Markdown' });
  });

  // /status
  bot.command('status', async (ctx) => {
    const roles = getRoles();
    const health = getHealth();
    const sessions = getActiveSessions();

    const roleLines = roles
      .map(r => {
        const emoji = r.status === 'RUNNING' ? '🟡' : r.status === 'DONE' ? '🟢' : '⚪';
        return `${emoji} *${r.title}*: ${r.status}`;
      })
      .join('\n');

    const claudeEmoji = health?.claudeActive ? '🟢 活躍' : health ? '🔴 無回應' : '⚪ 未知';
    const healthLine = health
      ? `🖥 CPU: ${health.cpuPercent.toFixed(1)}% | RAM: ${health.memPercent.toFixed(1)}%\n🤖 Claude: ${claudeEmoji}`
      : '🖥 系統資訊尚未取得';

    const sessionLine = `🔌 活躍連線: ${sessions.size} 個`;

    await ctx.reply(
      `*Claude Cockpit 狀態*\n\n${healthLine}\n${sessionLine}\n\n*角色狀態：*\n${roleLines}`,
      { parse_mode: 'Markdown' }
    );
  });

  // /run <cmd>
  bot.command('run', async (ctx) => {
    const text = ctx.message.text || '';
    const cmd = text.replace(/^\/run\s*/i, '').trim();

    if (!cmd) {
      await ctx.reply('❗ 使用方式：`/run <命令>`', { parse_mode: 'Markdown' });
      return;
    }

    const sessions = getActiveSessions();
    if (sessions.size === 0) {
      await ctx.reply('⚠️ 目前沒有活躍的終端連線，請先開啟 Web UI');
      return;
    }

    await sendCommandAndCapture(ctx, cmd, sessions, subscribeOutput);
  });

  // 任意文字訊息：直接轉發到終端並等待回應
  bot.on('text', async (ctx) => {
    const cmd = (ctx.message.text || '').trim();
    if (!cmd) return;

    const sessions = getActiveSessions();
    if (sessions.size === 0) {
      await ctx.reply('⚠️ 目前沒有活躍的終端連線，請先開啟 Web UI');
      return;
    }

    await sendCommandAndCapture(ctx, cmd, sessions, subscribeOutput);
  });

  // 啟動 bot（使用 long polling）
  bot.launch().then(() => {
    console.log('✓ Telegram Bot 已啟動');
  }).catch((err) => {
    console.error('❌ Telegram Bot 啟動失敗:', err.message);
  });

  // 處理關閉訊號
  process.once('SIGINT', () => bot && bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot && bot.stop('SIGTERM'));

  return bot;
}

module.exports = { initTelegramBot, sendTelegram };
