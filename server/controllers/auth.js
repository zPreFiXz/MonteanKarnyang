const prisma = require("../config/prisma");
const createError = require("../utils/createError");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      createError(400, "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
    }

    const checkPassword = bcrypt.compareSync(password, user.password);

    if (!checkPassword) {
      createError(400, "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
    }

    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.json({
      message: "เข้าสู่ระบบเรียบร้อยแล้ว",
      payload,
    });
  } catch (error) {
    next(error);
  }
};

exports.logout = (req, res, next) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
    });

    res.json({ message: "ออกจากระบบเรียบร้อยแล้ว" });
  } catch (error) {
    next(error);
  }
};

exports.currentUser = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        email: req.user.email,
      },
      select: {
        id: true,
        email: true,
        role: true,
        fullName: true,
      },
    });

    res.json(user);
  } catch (error) {
    next(error);
  }
};
