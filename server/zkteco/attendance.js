const config = require("./config");
const { getDateKey, getDayRange, getMinuteOfDay } = require("./time");

const { attendance: rules } = config;

const createEmployeeCache = (prisma) => {
  const cache = new Map();
  let loadedAt = 0;

  const warm = async (force = false) => {
    const now = Date.now();
    if (!force && cache.size && now - loadedAt < rules.employeeCacheTtlMs) return;

    const employees = await prisma.employee.findMany({
      where: { isActive: true },
      select: { id: true, fullName: true, nickname: true, zkUserId: true },
    });

    cache.clear();
    for (const emp of employees) {
      if (emp.zkUserId) cache.set(String(emp.zkUserId), emp);
    }
    loadedAt = now;
  };

  const find = async (zkUserId) => {
    if (!zkUserId) return null;
    const key = String(zkUserId);

    await warm();
    if (cache.has(key)) return cache.get(key);

    const emp = await prisma.employee.findUnique({
      where: { zkUserId: key },
      select: { id: true, fullName: true, nickname: true },
    });

    if (emp) cache.set(key, emp);
    return emp;
  };

  return { warm, find };
};

const lunchReturnStatus = (eventTime, lunchOutTime) => {
  const restMin = Math.max(
    0,
    Math.floor((new Date(eventTime) - new Date(lunchOutTime)) / 60_000),
  );
  const lateMin = Math.max(0, restMin - rules.lunchBreakMinutes);
  return lateMin > 0
    ? `กลับจากพักเที่ยง (สาย ${lateMin} นาที)`
    : `กลับจากพักเที่ยง (พัก ${restMin} นาที)`;
};

const resolveStatus = async (prisma, employeeId, recordTime) => {
  if (!employeeId) return "เข้างาน";

  const eventTime = recordTime || new Date();
  const minutes = getMinuteOfDay(eventTime);
  const { start, end } = getDayRange(getDateKey(eventTime));

  const records = await prisma.attendance.findMany({
    where: { employeeId, scanTime: { gte: start, lte: end } },
    orderBy: { scanTime: "asc" },
    select: { scanTime: true },
  });

  if (!records.length) {
    return minutes > rules.lateAfterMinutes
      ? `เข้างาน (สาย ${minutes - rules.lateAfterMinutes} นาที)`
      : "เข้างาน";
  }

  if (records.length === 1) return rules.stepStatuses[1];
  if (records.length === 2) return lunchReturnStatus(eventTime, records[1].scanTime);
  return rules.stepStatuses[3];
};

const save = (prisma, employeeId, status, scanTime) =>
  prisma.attendance.create({
    data: { employeeId: employeeId || null, status, scanTime },
  });

module.exports = { createEmployeeCache, resolveStatus, save };
