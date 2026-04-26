import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router";
import { getRepairById, updateRepairStatus } from "@/api/repair";
import {
  formatDate,
  formatTime,
  formatCurrency,
  getProvinceIdByName,
} from "@/utils/formats";
import {
  ChevronLeft,
  CreditCard,
  Clock,
  CheckCircle2,
  LoaderCircle,
  CircleUserRound,
  MapPin,
  Phone,
  Edit,
  SquareArrowLeft,
  SquareArrowRight,
  CircleEllipsis,
  Wrench,
  Printer,
} from "lucide-react";
import BrandIcons from "@/components/icons/BrandIcons";
import FormButton from "@/components/forms/FormButton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import RepairItemCard from "@/components/cards/RepairItemCard";
import PrintPreviewDialog from "@/components/dialogs/PrintPreviewDialog";

const RepairDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [repair, setRepair] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUpdatingSkip, setIsUpdatingSkip] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  const [isPrinting, setIsPrinting] = useState(false);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);

    fetchRepairDetail();
  }, [id]);

  const fetchRepairDetail = async () => {
    setIsLoading(true);
    try {
      const res = await getRepairById(id);
      setRepair(res.data);
      setSelectedPaymentMethod(res.data.paymentMethod);
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };

  const DEFAULT_STATUS_INFO = {
    text: "ไม่ทราบสถานะ",
    color: "text-subtle-dark",
    bg: "bg-gray-200",
    iconColor: "#6b7280",
    icon: CircleEllipsis,
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case "IN_PROGRESS":
        return {
          text: "กำลังซ่อม",
          color: "text-status-progress",
          bg: "bg-status-progress",
          iconColor: "#ffb000",
          icon: Clock,
        };
      case "COMPLETED":
        return {
          text: "ซ่อมเสร็จสิ้น",
          color: "text-status-completed",
          bg: "bg-status-completed",
          iconColor: "#22c55e",
          icon: CheckCircle2,
        };
      case "PAID":
        return {
          text: "ชำระเงินแล้ว",
          color: "text-status-paid",
          bg: "bg-status-paid",
          iconColor: "#1976d2",
          icon: CreditCard,
        };
    }
    return DEFAULT_STATUS_INFO;
  };

  const getPaymentMethodText = (method) => {
    switch (method) {
      case "CASH":
        return "เงินสด";
      case "BANK_TRANSFER":
        return "โอนเงิน";
      case "CREDIT_CARD":
        return "บัตรเครดิต";
    }
  };

  const getNextStatus = (currentStatus) => {
    switch (currentStatus) {
      case "IN_PROGRESS":
        return "COMPLETED";
      case "COMPLETED":
        return "PAID";
    }
  };

  const getNextStatusText = (currentStatus) => {
    switch (currentStatus) {
      case "IN_PROGRESS":
        return "เสร็จสิ้นการซ่อม";
      case "COMPLETED":
        return "ยืนยันการชำระเงิน";
    }
  };

  const getNextStatusButtonClass = (currentStatus) => {
    switch (currentStatus) {
      case "IN_PROGRESS":
        return "bg-status-completed";
      case "COMPLETED":
        return "bg-status-paid";
    }
  };

  const handleUpdateStatus = async (skipToCompleted = false) => {
    if (!repair) return;

    if (skipToCompleted && isUpdatingSkip) return;
    if (!skipToCompleted && isUpdating) return;

    const nextStatus = skipToCompleted ? "PAID" : getNextStatus(repair.status);
    if (!nextStatus) return;

    const needsPaymentMethod =
      nextStatus === "PAID" ||
      (repair.status === "COMPLETED" && nextStatus === "PAID");

    try {
      if (skipToCompleted) {
        setIsUpdatingSkip(true);
      } else {
        setIsUpdating(true);
      }

      const updateData = { nextStatus: nextStatus };

      if (needsPaymentMethod) {
        updateData.paymentMethod = selectedPaymentMethod;
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const res = await updateRepairStatus(repair.id, updateData);
      setRepair(res.data);

      if (skipToCompleted) {
        toast.success("ซ่อมเสร็จสิ้นและชำระเงินเรียบร้อยแล้ว");
      } else if (nextStatus === "COMPLETED") {
        toast.success("ซ่อมเสร็จเรียบร้อยแล้ว");
      } else if (nextStatus === "PAID") {
        toast.success("ชำระเงินเรียบร้อยแล้ว");
      }

      const statusSlug = nextStatus.toLowerCase().replace("_", "-");
      navigate(`/repairs?status=${statusSlug}`);
    } catch (error) {
      console.log(error);
    } finally {
      setIsUpdating(false);
      setIsUpdatingSkip(false);
    }
  };

  const statusInfo = getStatusInfo(repair?.status) ?? DEFAULT_STATUS_INFO;
  const StatusIcon = statusInfo?.icon;

  const handleEditRepair = () => {
    if (!repair) return;

    const plate = repair?.vehicle?.licensePlate?.plate || "";
    const [plateLetters = "", plateNumbers = ""] = plate.split("-");
    const provinceName = repair?.vehicle?.licensePlate?.province || "";

    const repairData = {
      fullName: repair?.customer?.fullName || "",
      address: repair?.customer?.address || "",
      phoneNumber: repair?.customer?.phoneNumber || "",
      brand: repair?.vehicle?.vehicleBrand?.brand || "",
      model: repair?.vehicle?.vehicleBrand?.model || "",
      plateLetters,
      plateNumbers,
      province: getProvinceIdByName(provinceName),
      description: repair?.description || "",
    };

    const usedQtyByPartId = (repair?.repairItems || []).reduce((acc, ri) => {
      if (ri.part?.id) {
        acc[ri.part.id] = (acc[ri.part.id] || 0) + (ri.quantity || 1);
      }
      return acc;
    }, {});

    const normalizedItems = (repair?.repairItems || []).map((ri) => {
      if (ri.part) {
        const baseStock = ri.part.stockQuantity ?? 0;
        const restoredStock = baseStock + (usedQtyByPartId[ri.part.id] || 0);
        return {
          id: ri.part.id,
          partNumber: ri.part.partNumber,
          brand: ri.part.brand || "",
          name: ri.part.name || "",
          sellingPrice: Number(ri.unitPrice),
          stockQuantity: restoredStock,
          unit: ri.part.unit,
          category: ri.part.category,
          secureUrl: ri.part.secureUrl || null,
          typeSpecificData: ri.part.typeSpecificData || null,
          quantity: ri.quantity || 1,
          side: ri.side,
        };
      }
      return {
        id: ri.service?.id,
        brand: "",
        name: ri.customName || ri.service?.name || "",
        sellingPrice: Number(ri.unitPrice),
        category: ri.service?.category,
        secureUrl: null,
        quantity: ri.quantity || 1,
        side: ri.side,
      };
    });

    if (repair.source === "SUSPENSION") {
      const savedItems = [];

      const lrGroups = {};

      normalizedItems.forEach((item) => {
        const st = item?.typeSpecificData?.suspensionType;
        const itemSide = item.side;

        if (!st || itemSide === null) {
          savedItems.push({ ...item });
          return;
        }

        if (
          itemSide === "left" ||
          itemSide === "right" ||
          itemSide === "other"
        ) {
          savedItems.push({ ...item, side: itemSide });
          return;
        }

        if (st === "left-right") {
          const key = `${item.id}-${item.sellingPrice}`;
          if (!lrGroups[key]) {
            lrGroups[key] = { base: item, count: 0 };
          }
          lrGroups[key].count += item.quantity || 1;
          return;
        }

        if (["left", "right", "other"].includes(st)) {
          const count = item.quantity || 1;
          for (let i = 0; i < count; i++) {
            savedItems.push({ ...item, quantity: 1, side: st });
          }
          return;
        }

        savedItems.push({ ...item });
      });

      let assignLeftoverToLeft = true;
      Object.values(lrGroups).forEach(({ base, count }) => {
        const pairs = Math.floor(count / 2);
        const remainder = count % 2;
        for (let i = 0; i < pairs; i++) {
          savedItems.push({ ...base, quantity: 1, side: "left" });
          savedItems.push({ ...base, quantity: 1, side: "right" });
        }
        if (remainder === 1) {
          savedItems.push({
            ...base,
            quantity: 1,
            side: assignLeftoverToLeft ? "left" : "right",
          });
          assignLeftoverToLeft = !assignLeftoverToLeft;
        }
      });

      navigate("/inspections/suspension", {
        state: {
          repairData: { ...repairData },
          repairItems: savedItems,
          editRepairId: repair.id,
          from: location.state?.from,
          statusSlug: location.state?.statusSlug,
          vehicleId: location.state?.vehicleId,
          hideMoreFields: !repairData.fullName?.trim(),
        },
      });
      return;
    }

    navigate("/repairs/new", {
      state: {
        repairData: { ...repairData },
        repairItems: normalizedItems,
        scrollToBottom: true,
        editRepairId: repair.id,
        from: location.state?.from,
        statusSlug: location.state?.statusSlug,
        vehicleId: location.state?.vehicleId,
        hideMoreFields: !repairData.fullName?.trim(),
      },
    });
  };

  const handleGoBack = () => {
    if (
      location.state?.returnTo &&
      location.state.returnTo.includes("/admin/reports/sales")
    ) {
      navigate(location.state.returnTo, {
        state: { currentDate: location.state.currentDate },
      });
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="bg-gradient-primary shadow-primary h-[87px] w-full">
      <div className="flex items-center gap-[8px] px-[20px] pt-[16px]">
        <button
          onClick={handleGoBack}
          className="text-surface mt-[2px] cursor-pointer"
        >
          <ChevronLeft />
        </button>
        <p className="text-surface text-[24px] font-semibold md:text-[26px]">
          รายละเอียดการซ่อม
        </p>
      </div>
      <div className="bg-surface shadow-primary mt-[16px] min-h-[calc(100vh-65px)] rounded-tl-2xl rounded-tr-2xl pt-[16px] pb-[112px] xl:pb-[16px]">
        {isLoading ? (
          <div className="flex h-[579px] items-center justify-center">
            <LoaderCircle className="text-primary h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div>
            <div className="mb-[16px] flex items-center justify-between px-[20px]">
              <p
                className={`text-[22px] leading-tight font-semibold md:text-[24px] ${statusInfo.color}`}
              >
                รหัสการซ่อม: {repair.id}
              </p>
              <div className="flex items-center gap-2">
                <div className={`rounded-full p-1 ${statusInfo.bg}`}>
                  <StatusIcon size={18} className="text-surface" />
                </div>
                <p
                  className={`text-[20px] font-semibold md:text-[22px] ${statusInfo.color}`}
                >
                  {statusInfo.text}
                </p>
              </div>
            </div>
            <div className="my-[16px] flex items-center gap-[8px] px-[20px]">
              <div
                className={`flex aspect-square h-[45px] w-[45px] items-center justify-center rounded-full ${statusInfo.bg}`}
              >
                <BrandIcons
                  brand={repair.vehicle?.vehicleBrand.brand}
                  color={statusInfo.iconColor}
                />
              </div>
              <div className="flex flex-col">
                <p
                  className={`text-[22px] font-semibold md:text-[24px] ${statusInfo.color} leading-tight`}
                >
                  {repair?.vehicle?.licensePlate?.plate &&
                  repair?.vehicle?.licensePlate?.province
                    ? `${repair.vehicle.licensePlate.plate} ${repair.vehicle.licensePlate.province}`
                    : "ไม่ระบุทะเบียนรถ"}
                </p>
                <p className="text-subtle-dark text-[18px] leading-tight font-medium md:text-[20px]">
                  {repair.vehicle?.vehicleBrand.brand}{" "}
                  {repair.vehicle?.vehicleBrand.model}
                </p>
              </div>
            </div>
            {repair.customer && (
              <div>
                <div className="mb-[16px] flex items-start gap-[8px] px-[20px]">
                  <div
                    className={`mt-[6px] flex aspect-square h-[45px] w-[45px] items-center justify-center rounded-full ${statusInfo.bg}`}
                  >
                    <CircleUserRound color="#ffffff" />
                  </div>
                  {repair.customer.fullName &&
                  !repair.customer.phoneNumber &&
                  !repair.customer.address ? (
                    <div className="mt-[4px] flex h-[45px] items-center justify-center">
                      <p
                        className={`text-[22px] font-semibold md:text-[24px] ${statusInfo.color} leading-tight`}
                      >
                        {repair.customer.fullName}
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      {repair.customer.fullName && (
                        <p
                          className={`text-[22px] font-semibold md:text-[24px] ${statusInfo.color} leading-tight`}
                        >
                          {repair.customer.fullName}
                        </p>
                      )}
                      <div className="mt-[4px] flex flex-wrap items-start gap-[8px]">
                        {repair.customer.phoneNumber && (
                          <div className="flex flex-shrink-0 items-center gap-[4px]">
                            <Phone size={16} className="text-subtle-dark" />
                            <a
                              href={`tel:${repair.customer.phoneNumber}`}
                              className="text-subtle-dark text-[18px] leading-tight font-medium underline decoration-dashed md:text-[20px]"
                            >
                              {repair.customer.phoneNumber}
                            </a>
                          </div>
                        )}
                        {repair.customer.address && (
                          <div className="flex items-start gap-[4px]">
                            <MapPin
                              size={16}
                              className="text-subtle-dark mt-[2px] flex-shrink-0"
                            />
                            <p className="text-subtle-dark text-[18px] leading-tight font-medium md:text-[20px]">
                              {repair.customer.address}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            {repair.repairItems && (
              <div className="mb-[16px] px-[20px]">
                <div className="mb-[8px] flex items-center justify-between">
                  <p className="text-normal text-[22px] font-semibold md:text-[24px]">
                    รายการซ่อม
                  </p>
                  <button
                    onClick={handleEditRepair}
                    className="text-primary flex cursor-pointer items-center gap-[4px] text-[20px] font-semibold md:text-[22px]"
                  >
                    <Edit className="h-5 w-5" />
                    แก้ไขรายการซ่อม
                  </button>
                </div>
                {repair.source === "SUSPENSION" ? (
                  <div className="space-y-[16px]">
                    {(() => {
                      const suspensionItems = (repair.repairItems || []).filter(
                        (ri) =>
                          ri.part?.typeSpecificData?.suspensionType || ri.side,
                      );
                      const generalItems = (repair.repairItems || []).filter(
                        (ri) =>
                          !ri.part?.typeSpecificData?.suspensionType &&
                          !ri.side,
                      );

                      const leftItems = [];
                      const rightItems = [];
                      const otherItems = [];

                      const lrGroups = {};

                      suspensionItems.forEach((ri) => {
                        if (ri.side === "left") {
                          leftItems.push(ri);
                          return;
                        }
                        if (ri.side === "right") {
                          rightItems.push(ri);
                          return;
                        }
                        if (ri.side === "other") {
                          otherItems.push(ri);
                          return;
                        }

                        const st = ri.part.typeSpecificData.suspensionType;
                        const qty = ri.quantity || 1;
                        if (st === "left-right") {
                          const key = `${ri.part.id}-${ri.unitPrice}`;
                          if (!lrGroups[key]) {
                            lrGroups[key] = { base: ri, count: 0 };
                          }
                          lrGroups[key].count += qty;
                          return;
                        }
                        if (st === "left") {
                          leftItems.push(ri);
                          return;
                        }
                        if (st === "right") {
                          rightItems.push(ri);
                          return;
                        }
                        if (st === "other") {
                          otherItems.push(ri);
                          return;
                        }
                        otherItems.push(ri);
                      });

                      let assignLeftoverToLeft = true;
                      Object.values(lrGroups).forEach(({ base, count }) => {
                        const pairs = Math.floor(count / 2);
                        const remainder = count % 2;
                        for (let i = 0; i < pairs; i++) {
                          leftItems.push({ ...base, quantity: 1 });
                          rightItems.push({ ...base, quantity: 1 });
                        }
                        if (remainder === 1) {
                          if (assignLeftoverToLeft) {
                            leftItems.push({ ...base, quantity: 1 });
                          } else {
                            rightItems.push({ ...base, quantity: 1 });
                          }
                          assignLeftoverToLeft = !assignLeftoverToLeft;
                        }
                      });

                      return (
                        <div>
                          {leftItems.length > 0 && (
                            <div className="mb-[8px]">
                              <p className="text-primary mb-[8px] flex items-center gap-[4px] text-[20px] font-semibold md:text-[22px]">
                                <SquareArrowLeft className="mt-[2px]" />
                                รายการซ่อมฝั่งซ้าย
                              </p>
                              <div className="space-y-[12px]">
                                {leftItems.map((item, idx) => (
                                  <RepairItemCard
                                    key={`left-${idx}`}
                                    item={item}
                                    variant="detail"
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                          {rightItems.length > 0 && (
                            <div className="mb-[8px]">
                              <p className="text-primary mb-[8px] flex items-center gap-[4px] text-[20px] font-semibold md:text-[22px]">
                                <SquareArrowRight className="mt-[2px]" />
                                รายการซ่อมฝั่งขวา
                              </p>
                              <div className="space-y-[12px]">
                                {rightItems.map((item, idx) => (
                                  <RepairItemCard
                                    key={`right-${idx}`}
                                    item={item}
                                    variant="detail"
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                          {otherItems.length > 0 && (
                            <div className="mb-[8px]">
                              <p className="text-primary mb-[8px] flex items-center gap-[4px] text-[20px] font-semibold md:text-[22px]">
                                <CircleEllipsis className="mt-[2px]" />
                                รายการซ่อมอื่นๆ
                              </p>
                              <div className="space-y-[12px]">
                                {otherItems.map((item, idx) => (
                                  <RepairItemCard
                                    key={`other-${idx}`}
                                    item={item}
                                    variant="detail"
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                          {generalItems.length > 0 && (
                            <div className="mb-[8px]">
                              <p className="text-primary mb-[8px] flex items-center gap-[4px] text-[20px] font-semibold md:text-[22px]">
                                <Wrench className="mt-[2px]" />
                                รายการซ่อมเพิ่มเติม
                              </p>
                              <div className="space-y-[12px]">
                                {generalItems.map((item, idx) => (
                                  <RepairItemCard
                                    key={`general-${idx}`}
                                    item={item}
                                    variant="detail"
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="space-y-[16px]">
                    {repair.repairItems.map((item, index) => (
                      <RepairItemCard
                        key={index}
                        item={item}
                        variant="detail"
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="border-primary/20 from-primary/10 to-primary/5 mx-[20px] mb-[16px] rounded-[12px] border bg-gradient-to-r p-[16px]">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <p className="text-subtle-dark text-[20px] font-semibold md:text-[22px]">
                    รวม {repair.repairItems?.length || 0} รายการ
                  </p>
                </div>
                <div className="flex flex-col items-end">
                  <p className="text-primary text-[24px] font-semibold md:text-[26px]">
                    {formatCurrency(Number(repair.totalPrice))}
                  </p>
                </div>
              </div>
            </div>
            {repair.description && (
              <div className="mb-[16px] px-[20px]">
                <p className="text-normal mb-[16px] text-[22px] font-semibold md:text-[24px]">
                  รายละเอียดเพิ่มเติม
                </p>
                <div className="rounded-[10px] bg-gray-50 p-[16px]">
                  <p className="text-normal text-[18px] leading-relaxed font-medium md:text-[20px]">
                    {repair.description}
                  </p>
                </div>
              </div>
            )}
            <div className="mb-[16px] px-[20px]">
              <p className="text-normal mb-[8px] text-[22px] font-semibold md:text-[24px]">
                การชำระเงิน
              </p>
              <div className="space-y-[8px] rounded-[10px] bg-gray-50 p-[16px]">
                <div className="flex items-center justify-between">
                  <p className="text-subtle-dark text-[18px] font-medium md:text-[20px]">
                    วิธีชำระเงิน:
                  </p>
                  {repair.status !== "PAID" ? (
                    <Select
                      value={selectedPaymentMethod}
                      onValueChange={(value) => setSelectedPaymentMethod(value)}
                    >
                      <SelectTrigger className="text-normal focus:ring-primary/20 focus:border-primary bg-surface w-auto min-w-[140px] cursor-pointer rounded-[20px] border px-[12px] py-[8px] text-[18px] font-medium duration-300 ease-in-out focus:border-2 focus:ring-3 focus:outline-none">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="font-athiti font-medium">
                        <SelectItem
                          className="cursor-pointer text-[18px] md:text-[20px]"
                          value="CASH"
                        >
                          เงินสด
                        </SelectItem>
                        <SelectItem
                          className="cursor-pointer text-[18px] md:text-[20px]"
                          value="BANK_TRANSFER"
                        >
                          โอนเงิน
                        </SelectItem>
                        <SelectItem
                          className="cursor-pointer text-[18px] md:text-[20px]"
                          value="CREDIT_CARD"
                        >
                          บัตรเครดิต
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-normal text-[18px] font-semibold md:text-[20px]">
                      {getPaymentMethodText(repair.paymentMethod)}
                    </p>
                  )}
                </div>
                <div className="flex justify-between">
                  <p className="text-subtle-dark text-[18px] font-medium md:text-[20px]">
                    สถานะ:
                  </p>
                  <p
                    className={`text-[18px] font-semibold md:text-[20px] ${
                      repair.paidAt
                        ? "text-status-paid"
                        : "text-status-progress"
                    }`}
                  >
                    {repair.paidAt ? "ชำระเงินแล้ว" : "รอชำระเงิน"}
                  </p>
                </div>
              </div>
            </div>
            <div className="mb-[16px] px-[20px]">
              <p className="text-normal mb-[8px] text-[22px] font-semibold md:text-[24px]">
                เวลาดำเนินการ
              </p>
              <div className="space-y-[8px] rounded-[10px] bg-gray-50 p-[16px]">
                <div className="flex justify-between">
                  <p className="text-subtle-dark text-[18px] font-medium md:text-[20px]">
                    เริ่มซ่อม:
                  </p>
                  <p className="text-normal text-[18px] font-medium md:text-[20px]">
                    {formatDate(repair.createdAt)} |{" "}
                    {formatTime(repair.createdAt)} น.
                  </p>
                </div>
                {repair.completedAt && (
                  <div className="flex justify-between">
                    <p className="text-subtle-dark text-[18px] font-medium md:text-[20px]">
                      ซ่อมเสร็จ:
                    </p>
                    <p className="text-normal text-[18px] font-medium md:text-[20px]">
                      {formatDate(repair.completedAt)} |{" "}
                      {formatTime(repair.completedAt)} น.
                    </p>
                  </div>
                )}
                {repair.paidAt && (
                  <div className="flex justify-between">
                    <p className="text-subtle-dark text-[18px] font-medium md:text-[20px]">
                      ชำระเงิน:
                    </p>
                    <p className="text-normal text-[18px] font-medium md:text-[20px]">
                      {formatDate(repair.paidAt)} | {formatTime(repair.paidAt)}{" "}
                      น.
                    </p>
                  </div>
                )}
              </div>
            </div>
            {repair.user && (
              <div className="px-[20px]">
                <p className="text-normal mb-[8px] text-[22px] font-semibold md:text-[24px]">
                  ผู้รับงานซ่อม
                </p>
                <div className="rounded-[10px] bg-gray-50 p-[16px]">
                  <p className="text-normal text-[18px] font-medium md:text-[20px]">
                    {repair.user.fullName} ({repair.user.nickname})
                  </p>
                </div>
              </div>
            )}
            {repair.status === "PAID" && (
              <div className="mt-[16px] px-[20px]">
                <button
                  onClick={() => setIsPrintDialogOpen(true)}
                  className="bg-primary hover:bg-primary/90 flex w-full cursor-pointer items-center justify-center gap-[8px] rounded-[10px] py-[12px] text-white duration-300"
                >
                  <Printer className="h-5 w-5" />
                  <span className="text-[20px] font-semibold md:text-[22px]">
                    พิมพ์ใบเสร็จ
                  </span>
                </button>
              </div>
            )}
            {getNextStatus(repair.status) && (
              <div className="mt-[16px] flex flex-col gap-[16px] pr-[40px]">
                <FormButton
                  label={getNextStatusText(repair.status)}
                  isLoading={isUpdating}
                  disabled={isUpdating}
                  onClick={() => handleUpdateStatus(false)}
                  className={getNextStatusButtonClass(repair.status)}
                />
                {repair.status === "IN_PROGRESS" && (
                  <FormButton
                    label="เสร็จสิ้นการซ่อมและชำระเงิน"
                    isLoading={isUpdatingSkip}
                    disabled={isUpdatingSkip}
                    onClick={() => handleUpdateStatus(true)}
                    className="bg-status-paid mt-0"
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>
      <PrintPreviewDialog
        isOpen={isPrintDialogOpen}
        onClose={() => setIsPrintDialogOpen(false)}
        repairId={repair?.id}
      />
    </div>
  );
};

export default RepairDetail;
