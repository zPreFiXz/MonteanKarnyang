const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
const { readdirSync } = require("fs");
const handleError = require("./middlewares/error");

const app = express();
dotenv.config();

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());

// Routing
readdirSync("./routes").map((r) => {
  app.use("/api", require("./routes/" + r));
});

// Error handling
app.use(handleError);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
