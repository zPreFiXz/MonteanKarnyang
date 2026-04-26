import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router";
import { LoaderCircle, ChevronLeft } from "lucide-react";
import CarCard from "@/components/cards/CarCard";
import { getRepairs } from "@/api/repair";
import { formatTime } from "@/utils/formats";
import BrandIcons from "@/components/icons/BrandIcons";

const getDisplayBrand = (vehicleBrand) => {
  const brand = vehicleBrand?.brand || "";
  const model = vehicleBrand?.model || "";

  if (brand === "อื่นๆ" || brand === "อื่น ๆ") {
    return model;
  }
  return `${brand} ${model}`.trim();
};

const RepairStatus = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const status = searchParams.get("status") || "in-progress";
  const [repairs, setRepairs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchRepairs();
  }, []);

  const fetchRepairs = async () => {
    setIsLoading(true);
    try {
      const res = await getRepairs();
      setRepairs(res.data);
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };

  const currentRepairs = repairs
    .filter((repair) => {
      const dbStatus = repair.status?.toLowerCase().replace("_", "-");
      const isStatusMatch = dbStatus === status;

      if (status === "paid" && isStatusMatch) {
        const today = new Date();
        const paidDate = new Date(repair.paidAt);

        const isSameDay =
          today.getFullYear() === paidDate.getFullYear() &&
          today.getMonth() === paidDate.getMonth() &&
          today.getDate() === paidDate.getDate();

        return isSameDay;
      }

      return isStatusMatch;
    })
    .sort((a, b) => {
      if (status === "paid") {
        return new Date(b.paidAt) - new Date(a.paidAt);
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

  const getStatusTitle = () => {
    switch (status) {
      case "in-progress":
        return "รายการกำลังซ่อม";
      case "completed":
        return "รายการซ่อมเสร็จสิ้น";
      case "paid":
        return "รายการชำระเงินแล้ว";
      default:
        return null;
    }
  };

  const getStatusColor = (repairStatus) => {
    const status = repairStatus?.toLowerCase().replace("_", "-");
    switch (status) {
      case "in-progress":
        return "#ffb000";
      case "completed":
        return "#22c55e";
      case "paid":
        return "#1976d2";
      default:
        return null;
    }
  };

  const getStatusBg = (repairStatus) => {
    const status = repairStatus?.toLowerCase().replace("_", "-");
    switch (status) {
      case "in-progress":
        return "progress";
      case "completed":
        return "completed";
      case "paid":
        return "paid";
      default:
        return null;
    }
  };

  const getEmptyMessage = () => {
    switch (status) {
      case "in-progress":
        return "ไม่มีรายการที่กำลังซ่อม";
      case "completed":
        return "ไม่มีรายการที่ซ่อมเสร็จสิ้น";
      case "paid":
        return "ไม่มีรายการที่ชำระเงินแล้ว";
      default:
        return null;
    }
  };

  return (
    <div className="bg-gradient-primary shadow-primary h-[142px] w-full">
      <div className="flex items-center gap-[8px] px-[20px] pt-[16px]">
        <button
          onClick={() => navigate("/dashboard")}
          className="text-surface mt-[2px] cursor-pointer"
        >
          <ChevronLeft />
        </button>
        <p className="text-surface text-[24px] font-semibold md:text-[26px]">
          สถานะการซ่อม
        </p>
      </div>
      <div className="mx-[20px] mt-[16px] flex justify-center gap-[16px]">
        <Link
          to="/repairs?status=in-progress"
          className={`flex h-[45px] w-[106px] items-center justify-center rounded-[10px] border-2 text-[18px] font-semibold duration-300 md:w-[120px] md:text-[20px] ${
            status === "in-progress"
              ? "text-surface bg-status-progress border-white"
              : "border-subtle-light text-subtle-light bg-surface"
          }`}
        >
          กำลังซ่อม
        </Link>
        <Link
          to="/repairs?status=completed"
          className={`flex h-[45px] w-[106px] items-center justify-center rounded-[10px] border-2 text-[18px] font-semibold duration-300 md:w-[120px] md:text-[20px] ${
            status === "completed"
              ? "text-surface bg-status-completed border-white"
              : "border-subtle-light text-subtle-light bg-surface"
          }`}
        >
          ซ่อมเสร็จสิ้น
        </Link>
        <Link
          to="/repairs?status=paid"
          className={`flex h-[45px] w-[106px] items-center justify-center rounded-[10px] border-2 text-[18px] font-semibold duration-300 md:w-[120px] md:text-[20px] ${
            status === "paid"
              ? "text-surface bg-status-paid border-white"
              : "border-subtle-light text-subtle-light bg-surface"
          }`}
        >
          ชำระเงินแล้ว
        </Link>
      </div>
      <div className="bg-surface shadow-primary mt-[16px] min-h-[calc(100vh-126px)] w-full rounded-tl-2xl rounded-tr-2xl px-[20px] pb-[112px]">
        <p className="text-normal pt-[16px] text-[22px] font-semibold md:text-[24px]">
          {getStatusTitle()}
        </p>
        {isLoading ? (
          <div className="flex h-[435px] items-center justify-center">
            <LoaderCircle className="text-primary h-8 w-8 animate-spin" />
          </div>
        ) : currentRepairs.length === 0 ? (
          <div className="flex h-[435px] items-center justify-center">
            <p className="text-subtle-light text-[20px] md:text-[22px]">
              {getEmptyMessage()}
            </p>
          </div>
        ) : (
          currentRepairs.map((item, index) => (
            <Link
              key={index}
              to={`/repairs/${item.id}`}
              state={{ from: "repair-status", statusSlug: status }}
              className="bg-surface shadow-primary mt-[16px] block h-[80px] w-full rounded-[10px]"
            >
              <CarCard
                bg={getStatusBg(item.status)}
                icon={
                  <BrandIcons
                    brand={item.vehicle.vehicleBrand.brand}
                    color={getStatusColor(item.status)}
                  />
                }
                licensePlate={
                  item.vehicle.licensePlate?.plate &&
                  item.vehicle.licensePlate?.province
                    ? `${item.vehicle.licensePlate.plate} ${item.vehicle.licensePlate.province}`
                    : "ไม่ระบุทะเบียนรถ"
                }
                brand={getDisplayBrand(item.vehicle.vehicleBrand)}
                time={item.createdAt && formatTime(item.createdAt)}
                price={Number(item.totalPrice) || 0}
              />
            </Link>
          ))
        )}
      </div>
    </div>
  );
};

export default RepairStatus;
