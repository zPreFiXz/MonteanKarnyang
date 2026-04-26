const prisma = require("../config/prisma");

exports.getRepairs = async (req, res, next) => {
  try {
    const repairs = await prisma.repair.findMany({
      include: {
        vehicle: {
          include: {
            licensePlate: {
              select: {
                plate: true,
                province: true,
              },
            },
            vehicleBrand: {
              select: {
                brand: true,
                model: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(repairs);
  } catch (error) {
    next(error);
  }
};

exports.getRepairById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const repair = await prisma.repair.findUnique({
      where: { id: Number(id) },
      include: {
        vehicle: {
          include: {
            licensePlate: {
              select: {
                plate: true,
                province: true,
              },
            },
            vehicleBrand: {
              select: {
                brand: true,
                model: true,
              },
            },
          },
        },
        customer: true,
        user: {
          select: {
            fullName: true,
            nickname: true,
          },
        },
        repairItems: {
          include: {
            part: {
              include: {
                category: true,
              },
            },
            service: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    });

    res.json(repair);
  } catch (error) {
    next(error);
  }
};

exports.createRepair = async (req, res, next) => {
  try {
    const {
      fullName,
      address,
      phoneNumber,
      brand,
      model,
      plate,
      province,
      description,
      totalPrice,
      source,
      repairItems,
    } = req.body;

    let vehicle;
    let customer;
    let licensePlate;
    let vehicleBrand;

    vehicleBrand = await prisma.vehicleBrand.findUnique({
      where: {
        brand_model: {
          brand,
          model,
        },
      },
    });

    if (!vehicleBrand) {
      vehicleBrand = await prisma.vehicleBrand.create({
        data: {
          brand,
          model,
        },
      });
    }

    if (plate && province) {
      licensePlate = await prisma.licensePlate.findUnique({
        where: {
          plate_province: {
            plate,
            province,
          },
        },
      });

      if (licensePlate) {
        vehicle = await prisma.vehicle.findFirst({
          where: {
            licensePlateId: licensePlate.id,
            vehicleBrandId: vehicleBrand.id,
          },
        });

        if (!vehicle) {
          vehicle = await prisma.vehicle.create({
            data: {
              vehicleBrandId: vehicleBrand.id,
              licensePlateId: licensePlate.id,
            },
          });
        }
      } else {
        licensePlate = await prisma.licensePlate.create({
          data: {
            plate,
            province,
          },
        });

        vehicle = await prisma.vehicle.create({
          data: {
            vehicleBrandId: vehicleBrand.id,
            licensePlateId: licensePlate.id,
          },
        });
      }
    } else {
      vehicle = await prisma.vehicle.findFirst({
        where: {
          vehicleBrandId: vehicleBrand.id,
          licensePlateId: null,
        },
      });

      if (!vehicle) {
        vehicle = await prisma.vehicle.create({
          data: {
            vehicleBrandId: vehicleBrand.id,
            licensePlateId: null,
          },
        });
      }
    }

    if (phoneNumber) {
      customer = await prisma.customer.findUnique({
        where: { phoneNumber: phoneNumber },
      });

      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            fullName: fullName || null,
            address: address || null,
            phoneNumber: phoneNumber,
          },
        });
      } else if (fullName || address) {
        customer = await prisma.customer.update({
          where: { id: customer.id },
          data: {
            fullName: fullName || null,
            address: address || customer.address,
          },
        });
      }
    } else if (fullName && !phoneNumber) {
      customer = await prisma.customer.findFirst({
        where: {
          fullName,
        },
      });
      const isSameCustomer = customer.fullName === fullName;

      if (!isSameCustomer) {
        customer = await prisma.customer.create({
          data: {
            fullName: fullName,
            address: address || null,
            phoneNumber: null,
          },
        });
      }
    }

    const repair = await prisma.repair.create({
      data: {
        description: description || null,
        totalPrice,
        source: source,
        user: { connect: { id: req.user.id } },
        vehicle: { connect: { id: vehicle.id } },
        ...(customer ? { customer: { connect: { id: customer.id } } } : {}),
      },
    });

    if (repairItems) {
      const repairItemsData = repairItems.map((item) => ({
        customName: item.customName || null,
        side: item.side || null,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        repairId: repair.id,
        partId: item.partId,
        serviceId: item.serviceId,
      }));

      await prisma.repairItem.createMany({
        data: repairItemsData,
      });

      for (const item of repairItems) {
        if (item.partId) {
          await prisma.part.update({
            where: { id: item.partId },
            data: {
              stockQuantity: {
                decrement: item.quantity,
              },
            },
          });
        }
      }
    }

    res.json({ message: "สร้างรายการซ่อมเรียบร้อยแล้ว" });
  } catch (error) {
    next(error);
  }
};

exports.updateRepair = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      fullName,
      address,
      phoneNumber,
      brand,
      model,
      plate,
      province,
      description,
      totalPrice,
      source,
      repairItems,
    } = req.body;

    let vehicleBrand = await prisma.vehicleBrand.findUnique({
      where: { brand_model: { brand, model } },
    });

    if (!vehicleBrand) {
      vehicleBrand = await prisma.vehicleBrand.create({
        data: { brand, model },
      });
    }

    let vehicle;
    if (plate && province) {
      let licensePlate = await prisma.licensePlate.findUnique({
        where: { plate_province: { plate, province } },
      });
      if (!licensePlate) {
        licensePlate = await prisma.licensePlate.create({
          data: { plate, province },
        });
      }

      const repair = await prisma.repair.findUnique({
        where: { id: Number(id) },
        select: { vehicleId: true },
      });
      vehicle = await prisma.vehicle.upsert({
        where: { id: repair.vehicleId },
        update: {
          vehicleBrandId: vehicleBrand.id,
          licensePlateId: licensePlate.id,
        },
        create: {
          vehicleBrandId: vehicleBrand.id,
          licensePlateId: licensePlate.id,
        },
      });
    } else {
      let existingVehicle = await prisma.vehicle.findUnique({
        where: {
          vehicleBrandId: vehicleBrand.id,
          licensePlateId: null,
        },
      });

      const repair = await prisma.repair.findUnique({
        where: { id: Number(id) },
        select: { vehicleId: true },
      });

      if (existingVehicle && existingVehicle.id !== repair.vehicleId) {
        vehicle = existingVehicle;
      } else {
        vehicle = await prisma.vehicle.update({
          where: { id: repair.vehicleId },
          data: {
            vehicleBrandId: vehicleBrand.id,
            licensePlateId: null,
          },
        });
      }
    }

    let customer = null;
    if (phoneNumber) {
      customer = await prisma.customer.findUnique({
        where: { phoneNumber },
      });
      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            fullName: fullName || null,
            address: address || null,
            phoneNumber,
          },
        });
      } else if (fullName || address) {
        customer = await prisma.customer.update({
          where: { id: customer.id },
          data: {
            fullName: fullName || null,
            address: address || customer.address,
          },
        });
      }
    } else if (fullName && !phoneNumber) {
      customer = await prisma.customer.findFirst({ where: { fullName } });
      if (!customer) {
        customer = await prisma.customer.create({
          data: { fullName, address: address || null, phoneNumber: null },
        });
      }
    }

    const existingItems = await prisma.repairItem.findMany({
      where: { repairId: Number(id) },
      include: { part: true },
    });

    for (const item of existingItems) {
      if (item.partId) {
        await prisma.part.update({
          where: { id: item.partId },
          data: { stockQuantity: { increment: item.quantity } },
        });
      }
    }

    await prisma.repairItem.deleteMany({ where: { repairId: Number(id) } });

    if (Array.isArray(repairItems)) {
      const dataItems = repairItems.map((item) => ({
        customName: item.customName || null,
        side: item.side || null,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        repairId: Number(id),
        partId: item.partId,
        serviceId: item.serviceId,
      }));
      if (dataItems.length) {
        await prisma.repairItem.createMany({ data: dataItems });
      }
      for (const item of repairItems) {
        if (item.partId) {
          await prisma.part.update({
            where: { id: item.partId },
            data: { stockQuantity: { decrement: item.quantity } },
          });
        }
      }
    }

    await prisma.repair.update({
      where: { id: Number(id) },
      data: {
        description: description || null,
        totalPrice,
        source,
        vehicle: { connect: { id: vehicle.id } },
        ...(customer
          ? { customer: { connect: { id: customer.id } } }
          : { customer: { disconnect: true } }),
      },
      include: {
        vehicle: {
          include: {
            licensePlate: {
              select: { plate: true, province: true },
            },
            vehicleBrand: { select: { brand: true, model: true } },
          },
        },
        customer: true,
        user: { select: { fullName: true, nickname: true } },
        repairItems: {
          include: {
            part: { include: { category: true } },
            service: { include: { category: true } },
          },
        },
      },
    });

    res.json({ message: "แก้ไขรายการซ่อมเรียบร้อยแล้ว" });
  } catch (error) {
    next(error);
  }
};

exports.updateRepairStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nextStatus, paymentMethod } = req.body;

    const repair = await prisma.repair.findUnique({
      where: { id: Number(id) },
    });

    const data = {};

    if (nextStatus === "COMPLETED") {
      data.status = "COMPLETED";
      data.completedAt = new Date();
    } else if (nextStatus === "PAID") {
      data.status = "PAID";
      data.paidAt = new Date();

      if (repair.status === "IN_PROGRESS" && !repair.completedAt) {
        data.completedAt = new Date();
      }

      const validPaymentMethods = ["CASH", "CREDIT_CARD", "BANK_TRANSFER"];
      if (paymentMethod && validPaymentMethods.includes(paymentMethod)) {
        data.paymentMethod = paymentMethod;
      }
    }

    await prisma.repair.update({
      where: { id: Number(id) },
      data,
    });

    res.json({
      message: "อัปเดตสถานะการซ่อมเรียบร้อยแล้ว",
    });
  } catch (error) {
    next(error);
  }
};
