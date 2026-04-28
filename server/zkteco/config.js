const config = {
  device: {
    ip: process.env.ZKTECO_DEVICE_IP || "192.168.1.101",
    port: Number(process.env.ZKTECO_DEVICE_PORT || 4370),
    socketTimeoutMs: 10_000,
    inportTimeoutMs: 4_000,
    pollIntervalMs: 30_000,
    fetchTimeoutMs: 20_000,
    reconnectDelayMs: 10_000,
    dedupeWindowMs: 2 * 60 * 1_000,
  },

  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    chatIds: [...new Set(
      (process.env.TELEGRAM_CHAT_IDS || "")
        .split(/[\s,]+/)
        .map((id) => id.trim())
        .filter(Boolean),
    )],
    requestTimeoutMs: 5_000,
    textLimit: 4_096,
  },

  attendance: {
    lateAfterMinutes: 8 * 60,
    lunchBreakMinutes: 60,
    stepStatuses: ["เข้างาน", "พักเที่ยง", "กลับจากพักเที่ยง", "เลิกงาน"],
    employeeCacheTtlMs: 5 * 60 * 1_000,
    summaryAfterMinutes: 18 * 60,
  },
};

module.exports = config;
