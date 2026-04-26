const { formatThaiDate, formatThaiDateTime, getDayRange } = require("./time");

const displayName = (emp) => {
  if (!emp) return "-";
  return emp.nickname ? `${emp.fullName} (${emp.nickname})` : emp.fullName;
};

const bulletList = (items, max = 15) =>
  items.length
    ? items
        .slice(0, max)
        .map((n) => `• ${n}`)
        .join("\n")
    : "- ไม่มี";

const scanMessage = (empName, empId, status, recordTime) => {
  const [dateOnly = "-", timePart = ""] = String(
    formatThaiDateTime(recordTime),
  ).split(" เวลา ");

  const header =
    status.startsWith("พักเที่ยง") || status.startsWith("กลับจากพักเที่ยง")
      ? "🍱 แจ้งเตือนเวลาพักเที่ยง"
      : "⏰ แจ้งเตือนเวลาเข้า-ออกงาน";

  return [
    header,
    "",
    `🆔 รหัส: ${empId || "-"}`,
    `👤 พนักงาน: ${empName}`,
    `📌 สถานะ: ${status}`,
    "",
    `📅 วันที่: ${dateOnly}`,
    `🕒 เวลา: ${timePart || "-"}`,
  ].join("\n");
};

const dailySummary = async (prisma, dateKey) => {
  const { start, end } = getDayRange(dateKey);
  const thaiDate = formatThaiDate(start);

  const employees = await prisma.employee.findMany({
    where: { isActive: true },
    orderBy: [{ fullName: "asc" }, { id: "asc" }],
    select: { id: true, fullName: true, nickname: true },
  });

  const attendances = await prisma.attendance.findMany({
    where: {
      employeeId: { in: employees.map((e) => e.id) },
      scanTime: { gte: start, lte: end },
    },
    select: { employeeId: true, status: true, scanTime: true },
    orderBy: { scanTime: "asc" },
  });

  const grouped = new Map(
    employees.map((e) => [
      e.id,
      { ...e, scans: [] },
    ]),
  );

  for (const att of attendances) {
    const item = grouped.get(att.employeeId);
    if (item) item.scans.push(att);
  }

  const stats = { onTime: [], absent: [], halfDay: [], late: [], lunchOvertime: [], forgotScan: [] };

  for (const emp of grouped.values()) {
    const name = displayName(emp);
    const scans = emp.scans;

    if (scans.length === 0) {
      stats.absent.push(name);
      continue;
    }

    let isLate = false;
    let lateText = "";
    let isLunchOT = false;
    let lunchOTText = "";

    for (const scan of scans) {
      if (scan.status.startsWith("เข้างาน (สาย")) {
        isLate = true;
        lateText = scan.status;
      }
      if (scan.status.startsWith("กลับจากพักเที่ยง") && scan.status.includes("สาย")) {
        isLunchOT = true;
        lunchOTText = scan.status;
      }
    }

    if (scans.length === 4 && !isLate && !isLunchOT) {
      stats.onTime.push(name);
    } else if (scans.length === 2 && scans[0].status.startsWith("เข้างาน") && scans[1].status.startsWith("พักเที่ยง")) {
      stats.halfDay.push(isLate ? `${name} - ${lateText}` : name);
    } else {
      let isForgotScan = scans.length !== 4;

      if (isLate) stats.late.push(`${name} - ${lateText}`);
      if (isLunchOT) stats.lunchOvertime.push(`${name} - ${lunchOTText}`);
      
      if (isForgotScan) {
        const expected = ["เข้างาน", "พักเที่ยง", "กลับจากพักเที่ยง", "เลิกงาน"];
        let missing = [];
        for (let i = scans.length; i < 4; i++) {
          missing.push(expected[i]);
        }
        
        let missingText = "";
        if (missing.length > 0) {
          missingText = ` (ลืม: ${missing.join(", ")})`;
        }
        
        stats.forgotScan.push(`${name}${missingText}`);
      }
    }
  }

  const totalAllEmployees = await prisma.employee.count();

  const message = [
    "📊 รายงานสรุปเวลาเข้า-ออกงาน",
    "",
    `🗓 วันที่: ${thaiDate}`,
    `👥 พนักงานทั้งหมด: ${totalAllEmployees} คน`,
  ];

  if (stats.onTime.length > 0) {
    message.push(
      "",
      `✅ ตรงเวลา (${stats.onTime.length} คน)`,
      bulletList(stats.onTime)
    );
  }

  if (stats.absent.length > 0) {
    message.push(
      "",
      `❌ ขาด/ลา (${stats.absent.length} คน)`,
      bulletList(stats.absent)
    );
  }

  if (stats.halfDay.length > 0) {
    message.push(
      "",
      `🌤️ ลาครึ่งวัน (${stats.halfDay.length} คน)`,
      bulletList(stats.halfDay)
    );
  }

  if (stats.late.length > 0) {
    message.push(
      "",
      `⏱️ มาสาย (${stats.late.length} คน)`,
      bulletList(stats.late)
    );
  }

  if (stats.lunchOvertime.length > 0) {
    message.push(
      "",
      `🍱 พักเกินเวลา (${stats.lunchOvertime.length} คน)`,
      bulletList(stats.lunchOvertime)
    );
  }

  if (stats.forgotScan.length > 0) {
    message.push(
      "",
      `⚠️ ลืมสแกน (${stats.forgotScan.length} คน)`,
      bulletList(stats.forgotScan)
    );
  }

  return message.join("\n");
};

module.exports = { displayName, scanMessage, dailySummary };
