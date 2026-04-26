const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
require("events").EventEmitter.defaultMaxListeners = 0;

const { PrismaClient } = require("@prisma/client");
const { startZktecoService } = require("./zkteco/index");

const prisma = new PrismaClient();

startZktecoService(prisma).catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
