const prisma = require("../config/prisma");
const createError = require("../utils/createError");
const bcrypt = require("bcryptjs");

exports.getUsers = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        role: {
          in: ["EMPLOYEE", "ADMIN"],
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(users);
  } catch (error) {
    next(error);
  }
};

exports.createUser = async (req, res, next) => {
  try {
    const {
      email,
      password,
      fullName,
      nickname,
      role,
      phoneNumber,
      dateOfBirth,
    } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (user) {
      createError(400, "อีเมลนี้มีอยู่ในระบบแล้ว");
    }

    const hashPassword = bcrypt.hashSync(password, 10);

    await prisma.user.create({
      data: {
        email,
        password: hashPassword,
        fullName,
        nickname,
        role,
        phoneNumber,
        dateOfBirth: new Date(dateOfBirth),
      },
    });

    res.json({ message: "เพิ่มบัญชีผู้ใช้งานเรียบร้อยแล้ว" });
  } catch (error) {
    next(error);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      email,
      fullName,
      nickname,
      role,
      phoneNumber,
      dateOfBirth,
      password,
    } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: Number(id) },
    });

    if (!user) {
      createError(404, "ไม่พบบัญชีผู้ใช้งาน");
    }

    if (email && email !== user.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email },
      });

      if (emailExists) {
        createError(400, "อีเมลนี้มีอยู่ในระบบแล้ว");
      }
    }

    if (role) {
      const validRoles = ["EMPLOYEE", "ADMIN"];
      if (!validRoles.includes(role)) {
        createError(400, "บทบาทไม่ถูกต้อง");
      }
    }

    const updateData = {};
    if (email) updateData.email = email;
    if (fullName) updateData.fullName = fullName;
    if (nickname) updateData.nickname = nickname;
    if (role) updateData.role = role;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber || null;
    if (dateOfBirth) updateData.dateOfBirth = new Date(dateOfBirth);

    if (password) {
      updateData.password = bcrypt.hashSync(password, 10);
    }

    await prisma.user.update({
      where: { id: Number(id) },
      data: updateData,
    });

    res.json({ message: "แก้ไขบัญชีผู้ใช้งานเรียบร้อยแล้ว" });
  } catch (error) {
    next(error);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.user.delete({
      where: { id: Number(id) },
    });

    res.json({ message: "ลบบัญชีผู้ใช้งานเรียบร้อยแล้ว" });
  } catch (error) {
    next(error);
  }
};
