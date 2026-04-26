const config = require("./config");
const { createDevice, getNewLogs, logKey } = require("./device");
const { createEmployeeCache, resolveStatus, save } = require("./attendance");
const { displayName, scanMessage, dailySummary } = require("./formatter");
const telegram = require("./telegram");
const { getDateKey, getMinuteOfDay } = require("./time");

const createDeduper = (windowMs) => {
  const seen = new Map();
  return (key) => {
    const now = Date.now();
    for (const [k, t] of seen) {
      if (now - t > windowMs) seen.delete(k);
    }
    if (seen.has(key)) return true;
    seen.set(key, now);
    return false;
  };
};

const startZktecoService = async (prisma) => {
  const { device: deviceCfg, attendance: attCfg } = config;

  if (!deviceCfg.ip) throw new Error("Missing ZKTECO_DEVICE_IP");
  if (!Number.isFinite(deviceCfg.port) || deviceCfg.port <= 0) {
    throw new Error("Invalid ZKTECO_DEVICE_PORT");
  }

  const device = createDevice();
  const employees = createEmployeeCache(prisma);
  const isDupe = createDeduper(deviceCfg.dedupeWindowMs);
  const chains = new Map();

  let lastSeenKey = "";
  let polling = false;
  let reconnecting = false;
  let connected = false;
  let lastSummaryDate = "";

  const processLog = (log) => {
    const key = logKey(log);
    if (isDupe(key)) return;

    const empId = String(log?.deviceUserId || "");
    const recordTime = log?.recordTime || new Date();

    const prev = chains.get(empId) || Promise.resolve();
    const task = prev
      .catch(() => {})
      .then(async () => {
        const emp = await employees.find(empId);
        const status = emp?.id
          ? await resolveStatus(prisma, emp.id, recordTime)
          : "เข้างาน";

        const name = emp
          ? displayName(emp)
          : `ไม่พบข้อมูลพนักงาน (${empId || "-"})`;

        telegram
          .send(scanMessage(name, empId, status, recordTime))
          .catch((err) => console.error("Telegram:", err.message));

        try {
          await save(prisma, emp?.id, status, recordTime);
        } catch (err) {
          console.error("Save failed:", err.message);
        }
      })
      .finally(() => {
        if (chains.get(empId) === task) chains.delete(empId);
      });

    chains.set(empId, task);
  };

  const poll = async () => {
    if (polling || reconnecting || !connected) return;
    polling = true;

    try {
      const logs = await device.fetchLogs();
      for (const log of getNewLogs(logs, lastSeenKey)) {
        processLog(log);
        lastSeenKey = logKey(log);
      }
    } catch (err) {
      if (err.message === "FETCH_TIMEOUT") {
        console.warn(`Fetch timeout (>${deviceCfg.fetchTimeoutMs}ms)`);
      } else {
        console.error("Polling:", err.message);
        scheduleReconnect(err.message);
      }
    } finally {
      polling = false;
    }
  };

  const checkDailySummary = async () => {
    const now = new Date();
    const dateKey = getDateKey(now);
    if (getMinuteOfDay(now) < attCfg.summaryAfterMinutes) return;
    if (lastSummaryDate === dateKey) return;

    try {
      await telegram.send(await dailySummary(prisma, dateKey));
      lastSummaryDate = dateKey;
      console.log(`Daily summary sent: ${dateKey}`);
    } catch (err) {
      console.error("Daily summary failed:", err.message);
    }
  };

  const connect = async () => {
    await device.connect();
    const logs = await device.fetchLogs();
    if (logs.length) lastSeenKey = logKey(logs[logs.length - 1]);

    employees
      .warm(true)
      .catch((err) => console.warn("Cache warmup:", err.message));

    connected = true;
    reconnecting = false;
  };

  const scheduleReconnect = (reason) => {
    if (reconnecting) return;
    reconnecting = true;
    connected = false;

    console.error(
      `Reconnecting in ${deviceCfg.reconnectDelayMs}ms (${reason})`,
    );

    setTimeout(async () => {
      try {
        await connect();
      } catch (err) {
        reconnecting = false;
        scheduleReconnect(err.message);
      }
    }, deviceCfg.reconnectDelayMs);
  };

  setInterval(poll, deviceCfg.pollIntervalMs);
  setInterval(checkDailySummary, 60_000);

  connect()
    .then(() => {
      checkDailySummary();
    })
    .catch((err) => {
      console.error("Initialization failed:", err.message);
      scheduleReconnect(err.message);
    });
};

module.exports = { startZktecoService };
