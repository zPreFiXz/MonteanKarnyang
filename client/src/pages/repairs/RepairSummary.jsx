import { useLocation, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import FormButton from "@/components/forms/FormButton";
import RepairItemCard from "@/components/cards/RepairItemCard";
import { formatCurrency, getProvinceName } from "@/utils/formats";
import { createRepair, updateRepair } from "@/api/repair";
import { toast } from "sonner";
import {
  Edit,
  ChevronLeft,
  SquareArrowLeft,
  SquareArrowRight,
  CircleEllipsis,
  Wrench,
  ClipboardList,
} from "lucide-react";

const RepairSummary = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { repairData, repairItems, editRepairId } = location.state || {};
  const origin = location.state?.origin || location.state?.from;
  const statusSlug = location.state?.statusSlug;
  const vehicleId = location.state?.vehicleId;

  useEffect(() => {
    window.scrollTo(0, 0);

    if (!repairData || !repairItems) {
      navigate("/repairs/new", { replace: true });
    }
  }, [repairData, repairItems, navigate]);

  if (!repairData || !repairItems) {
    return null;
  }

  const totalPrice = repairItems.reduce(
    (total, item) => total + item.sellingPrice * item.quantity,
    0,
  );

  const getItemsBySide = (side) => {
    return repairItems.filter((item) => item.side === side);
  };

  const leftItems = getItemsBySide("left");
  const rightItems = getItemsBySide("right");
  const otherItems = getItemsBySide("other");
  const generalItems = repairItems.filter(
    (item) => !item.side || item.side === "general",
  );

  const handleConfirmRepair = async () => {
    setIsSubmitting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const repair = {
        fullName: repairData.fullName,
        address: repairData.address,
        phoneNumber: repairData.phoneNumber,
        brand: repairData.brand,
        model: repairData.model,
        plate: `${repairData.plateLetters}-${repairData.plateNumbers}`,
        province: getProvinceName(repairData.province),
        description: repairData.description,
        totalPrice: totalPrice,
        source: repairData.source,
        repairItems: repairItems.map((item) => {
          const isPart = !!(item.partNumber && item.brand);
          return {
            ...(isPart ? { partId: item.id } : { serviceId: item.id }),
            unitPrice: Number(item.sellingPrice),
            quantity: item.quantity,
            ...(item.side ? { side: item.side } : {}),
            ...(!isPart && item.name ? { customName: item.name } : {}),
          };
        }),
      };

      if (editRepairId) {
        await updateRepair(editRepairId, repair);
        toast.success("แก้ไขรายการซ่อมเรียบร้อยแล้ว");
        if (statusSlug) {
          navigate(`/repairs?status=${statusSlug}`);
        } else if (vehicleId) {
          navigate(`/vehicles/${vehicleId}`);
        } else if (origin === "repair-status") {
          navigate(`/repairs?status=in-progress`);
        } else {
          navigate(`/repairs/${editRepairId}`);
        }
      } else {
        await createRepair(repair);
        toast.success("สร้างรายการซ่อมเรียบร้อยแล้ว");
        const isDesktop = window.innerWidth >= 1280;
        navigate(isDesktop ? "/" : "/repairs?status=in-progress");
      }
    } catch (error) {
      console.log(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoBack = () => {
    const from = location.state?.from;
    const backState = {
      repairData,
      repairItems,
      scrollToBottom: true,
      editRepairId,
      origin,
      statusSlug,
      vehicleId,
      ...(!repairData.fullName || !repairData.fullName.trim()
        ? { hideMoreFields: true }
        : {}),
    };

    if (from === "suspension") {
      navigate("/inspections/suspension", { state: backState, replace: true });
    } else {
      navigate("/repairs/new", { state: backState, replace: true });
    }
  };

  return (
    <div className="bg-gradient-primary shadow-primary flex min-h-[100svh] flex-col xl:min-h-[calc(100vh-73px)] xl:flex-row xl:items-start xl:gap-[16px] xl:bg-transparent xl:px-[16px] xl:pt-[24px] xl:pb-[24px] xl:shadow-none">
      {/* ข้อมูลลูกค้าและรถยนต์ */}
      <div className="xl:shadow-primary flex flex-1 flex-col xl:h-fit xl:w-1/2 xl:flex-initial xl:rounded-2xl xl:bg-white">
        <div className="flex items-center gap-[8px] px-[20px] pt-[16px]">
          <button
            onClick={() => handleGoBack()}
            className="bg-surface/20 xl:bg-primary/10 flex h-[40px] w-[40px] cursor-pointer items-center justify-center rounded-full"
          >
            <ChevronLeft className="text-surface xl:hidden" />
            <ChevronLeft className="text-primary hidden xl:block" />
          </button>
          <div>
            <p className="text-surface xl:text-primary text-[24px] font-semibold md:text-[26px]">
              สรุปรายการซ่อม
            </p>
          </div>
        </div>

        {/* Mobile */}
        <div className="bg-surface mt-[16px] flex w-full flex-1 flex-col rounded-tl-2xl rounded-tr-2xl pt-[16px] xl:mt-0 xl:rounded-none xl:bg-transparent xl:shadow-none">
          {/* ข้อมูลลูกค้า */}
          <div className="px-[20px]">
            <div className="mb-[16px]">
              <p className="text-normal mb-[8px] text-[22px] font-semibold md:text-[24px]">
                ข้อมูลลูกค้า
              </p>
              <div className="space-y-[8px] rounded-[10px] bg-gray-50 p-[16px]">
                <div className="flex justify-between">
                  <p className="text-subtle-dark text-[18px] font-medium md:text-[20px]">
                    ชื่อลูกค้า:
                  </p>
                  <p className="text-normal text-[18px] font-semibold md:text-[20px]">
                    {repairData.fullName || "ไม่ระบุ"}
                  </p>
                </div>
                <div className="flex justify-between">
                  <p className="text-subtle-dark text-[18px] font-medium md:text-[20px]">
                    ที่อยู่:
                  </p>
                  <p className="text-normal max-w-[250px] text-right text-[18px] font-semibold break-words md:text-[20px]">
                    {repairData.address || "ไม่ระบุ"}
                  </p>
                </div>
                <div className="flex justify-between">
                  <p className="text-subtle-dark text-[18px] font-medium md:text-[20px]">
                    หมายเลขโทรศัพท์:
                  </p>
                  <p className="text-normal text-[18px] font-semibold md:text-[20px]">
                    {repairData.phoneNumber || "ไม่ระบุ"}
                  </p>
                </div>
              </div>
            </div>

            {/* ข้อมูลรถยนต์ */}
            <div className="mb-[16px]">
              <p className="text-normal mb-[8px] text-[22px] font-semibold md:text-[24px]">
                ข้อมูลรถยนต์
              </p>
              <div className="space-y-[8px] rounded-[10px] bg-gray-50 p-[16px]">
                <div className="flex justify-between">
                  <p className="text-subtle-dark text-[18px] font-medium md:text-[20px]">
                    ยี่ห้อ-รุ่น:
                  </p>
                  <p className="text-normal text-[18px] font-semibold md:text-[20px]">
                    {repairData.brand} {repairData.model}
                  </p>
                </div>
                <div className="flex justify-between">
                  <p className="text-subtle-dark text-[18px] font-medium md:text-[20px]">
                    ทะเบียนรถ:
                  </p>
                  <p className="text-normal text-[18px] font-semibold md:text-[20px]">
                    {repairData.plateLetters &&
                    repairData.plateNumbers &&
                    getProvinceName(repairData.province)
                      ? `${repairData.plateLetters}-${
                          repairData.plateNumbers
                        } ${getProvinceName(repairData.province)}`
                      : "ไม่ระบุ"}
                  </p>
                </div>
                <div className="flex items-start justify-between">
                  <p className="text-subtle-dark flex-shrink-0 text-[18px] font-medium md:text-[20px]">
                    รายละเอียดการซ่อม:
                  </p>
                  <p className="text-normal min-w-0 text-right text-[18px] leading-relaxed font-semibold break-words md:text-[20px]">
                    {repairData.description || "ไม่ระบุ"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* รายการซ่อม */}
          <div className="xl:hidden">
            <div className="mb-[16px]">
              <div className="mb-[16px] flex items-center justify-between px-[20px]">
                <p className="text-[22px] font-semibold md:text-[24px]">
                  รายการซ่อม
                </p>
                <button
                  onClick={() => handleGoBack()}
                  className="text-primary flex cursor-pointer items-center gap-[4px] text-[20px] font-semibold md:text-[22px]"
                >
                  <Edit className="h-5 w-5" />
                  แก้ไขรายการซ่อม
                </button>
              </div>

              {/* รายการฝั่งซ้าย */}
              {leftItems.length > 0 && (
                <div className="mb-[16px]">
                  <p className="text-primary mb-[8px] flex items-center gap-[4px] text-[20px] font-semibold md:text-[22px]">
                    <SquareArrowLeft className="mt-[2px]" />
                    รายการซ่อมฝั่งซ้าย
                  </p>
                  <div className="space-y-[12px]">
                    {leftItems.map((item, index) => (
                      <RepairItemCard
                        key={`left-${index}`}
                        item={item}
                        variant="summary"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* รายการฝั่งขวา */}
              {rightItems.length > 0 && (
                <div className="mb-[16px]">
                  <p className="text-primary mb-[8px] flex items-center gap-[4px] text-[20px] font-semibold md:text-[22px]">
                    <SquareArrowRight className="mt-[2px]" />
                    รายการซ่อมฝั่งขวา
                  </p>
                  <div className="space-y-[12px]">
                    {rightItems.map((item, index) => (
                      <RepairItemCard
                        key={`right-${index}`}
                        item={item}
                        variant="summary"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* รายการอื่นๆ */}
              {otherItems.length > 0 && (
                <div className="mb-[16px]">
                  <p className="text-primary mb-[8px] flex items-center gap-[4px] text-[20px] font-semibold md:text-[22px]">
                    <CircleEllipsis className="mt-[2px]" />
                    รายการซ่อมอื่นๆ
                  </p>
                  <div className="space-y-[12px]">
                    {otherItems.map((item, index) => (
                      <RepairItemCard
                        key={`other-${index}`}
                        item={item}
                        variant="summary"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* รายการซ่อมเพิ่มเติม */}
              {generalItems.length > 0 && (
                <div className="mb-[16px] px-[20px]">
                  {location.state?.from === "suspension" && (
                    <p className="text-primary mb-[8px] flex items-center gap-[4px] text-[20px] font-semibold md:text-[22px]">
                      <Wrench className="mb-[2px] inline" />
                      รายการซ่อมเพิ่มเติม
                    </p>
                  )}
                  <div className="space-y-[12px]">
                    {generalItems.map((item, index) => (
                      <RepairItemCard
                        key={`general-${index}`}
                        item={item}
                        variant="summary"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* สรุปยอดรวม */}
            <div className="border-primary/20 from-primary/10 to-primary/5 mx-[20px] my-[16px] rounded-[12px] border bg-gradient-to-r p-[16px]">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <p className="text-subtle-dark text-[20px] font-semibold md:text-[22px]">
                    รวม {repairItems.length} รายการ
                  </p>
                </div>
                <div className="flex flex-col items-end">
                  <p className="text-primary text-[24px] font-semibold md:text-[26px]">
                    {formatCurrency(totalPrice)}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex justify-center pb-[112px]">
              <FormButton
                label={editRepairId ? "บันทึก" : "สร้างรายการซ่อม"}
                isLoading={isSubmitting}
                onClick={handleConfirmRepair}
              />
            </div>
          </div>

          <div className="hidden pb-[24px] xl:block" />
        </div>
      </div>

      {/* Desktop: รายการซ่อม */}
      <div className="hidden w-1/2 xl:block">
        <div className="bg-surface shadow-primary h-fit rounded-2xl">
          <div className="flex items-center justify-between px-[20px] pt-[16px]">
            <div className="flex items-center gap-[8px]">
              <div className="bg-primary/10 flex h-[40px] w-[40px] items-center justify-center rounded-full">
                <ClipboardList className="text-primary h-5 w-5" />
              </div>
              <p className="text-[22px] font-semibold md:text-[24px]">
                รายการซ่อม
              </p>
            </div>
            <button
              onClick={() => handleGoBack()}
              className="text-primary flex cursor-pointer items-center gap-[4px] text-[20px] font-semibold md:text-[22px]"
            >
              <Edit className="h-5 w-5" />
              แก้ไขรายการซ่อม
            </button>
          </div>
          <div className="px-[20px] pt-[16px]">
            {/* รายการฝั่งซ้าย */}
            {leftItems.length > 0 && (
              <div className="mb-[16px]">
                <p className="text-primary mb-[8px] flex items-center gap-[4px] text-[20px] font-semibold md:text-[22px]">
                  <SquareArrowLeft className="mt-[2px]" />
                  รายการซ่อมฝั่งซ้าย
                </p>
                <div className="space-y-[12px]">
                  {leftItems.map((item, index) => (
                    <RepairItemCard
                      key={`left-${index}`}
                      item={item}
                      variant="summary"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* รายการฝั่งขวา */}
            {rightItems.length > 0 && (
              <div className="mb-[16px]">
                <p className="text-primary mb-[8px] flex items-center gap-[4px] text-[20px] font-semibold md:text-[22px]">
                  <SquareArrowRight className="mt-[2px]" />
                  รายการซ่อมฝั่งขวา
                </p>
                <div className="space-y-[12px]">
                  {rightItems.map((item, index) => (
                    <RepairItemCard
                      key={`right-${index}`}
                      item={item}
                      variant="summary"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* รายการอื่นๆ */}
            {otherItems.length > 0 && (
              <div className="mb-[16px]">
                <p className="text-primary mb-[8px] flex items-center gap-[4px] text-[20px] font-semibold md:text-[22px]">
                  <CircleEllipsis className="mt-[2px]" />
                  รายการซ่อมอื่นๆ
                </p>
                <div className="space-y-[12px]">
                  {otherItems.map((item, index) => (
                    <RepairItemCard
                      key={`other-${index}`}
                      item={item}
                      variant="summary"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* รายการซ่อมเพิ่มเติม */}
            {generalItems.length > 0 && (
              <div className="mb-[16px]">
                {location.state?.from === "suspension" && (
                  <p className="text-primary mb-[8px] flex items-center gap-[4px] text-[20px] font-semibold md:text-[22px]">
                    <Wrench className="mb-[2px] inline" />
                    รายการซ่อมเพิ่มเติม
                  </p>
                )}
                <div className="space-y-[12px]">
                  {generalItems.map((item, index) => (
                    <RepairItemCard
                      key={`general-${index}`}
                      item={item}
                      variant="summary"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Desktop: สรุปยอดรวม */}
          <div className="border-primary/20 from-primary/10 to-primary/5 mx-[20px] my-[16px] rounded-[12px] border bg-gradient-to-r p-[16px]">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <p className="text-subtle-dark text-[20px] font-semibold md:text-[22px]">
                  รวม {repairItems.length} รายการ
                </p>
              </div>
              <div className="flex flex-col items-end">
                <p className="text-primary text-[24px] font-semibold md:text-[26px]">
                  {formatCurrency(totalPrice)}
                </p>
              </div>
            </div>
          </div>
          <div className="flex justify-center pb-[16px]">
            <FormButton
              label={editRepairId ? "บันทึก" : "สร้างรายการซ่อม"}
              isLoading={isSubmitting}
              onClick={handleConfirmRepair}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default RepairSummary;
