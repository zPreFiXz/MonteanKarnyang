const ZKLib = require("node-zklib");
const config = require("./config");

const logKey = (log) =>
  `${log?.deviceUserId || ""}-${log?.recordTime || ""}`;

const withTimeout = (promise, ms) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("FETCH_TIMEOUT")), ms),
    ),
  ]);

const createDevice = () => {
  const { ip, port, socketTimeoutMs, inportTimeoutMs, fetchTimeoutMs } = config.device;
  let zk = null;

  const disconnect = async () => {
    if (!zk) return;
    try {
      await zk.disconnect();
    } catch (err) {
      console.warn("Disconnect error:", err.message);
    }
    zk = null;
  };

  const connect = async () => {
    await disconnect();
    
    zk = new ZKLib(ip, port, socketTimeoutMs, inportTimeoutMs);
    await zk.createSocket();
    console.log(`Connected successfully to ${ip}:${port}`);
  };

  const fetchLogs = async () => {
    if (!zk) throw new Error("ZKLib not connected");
    const data = await withTimeout(zk.getAttendances(), fetchTimeoutMs);
    return data?.data || [];
  };

  return { connect, disconnect, fetchLogs };
};

const getNewLogs = (allLogs, lastKey) => {
  if (!allLogs.length) return [];

  const idx = lastKey
    ? allLogs.findIndex((log) => logKey(log) === lastKey)
    : allLogs.length - 1;

  return idx >= 0 ? allLogs.slice(idx + 1) : allLogs.slice(-1);
};

module.exports = { createDevice, getNewLogs, logKey };
