import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  Menu,
  CircleUserRound,
  LogOut,
  X,
  CarFront,
  Users,
  LoaderCircle,
} from "lucide-react";
import CarCard from "@/components/cards/CarCard";
import InventoryCard from "@/components/cards/InventoryCard";
import RepairItemDetailDialog from "@/components/dialogs/RepairItemDetailDialog";
import StatusCard from "@/components/cards/StatusCard";
import { getInventory } from "@/api/inventory";
import { formatCurrency, formatDate, formatTime } from "@/utils/formats";
import useRepairStore from "@/stores/useRepairStore";
import useAuthStore from "@/stores/useAuthStore";
import { Success, Wrench, Paid } from "@/components/icons/Icons";
import BrandIcons from "@/components/icons/BrandIcons";

const Dashboard = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [inventory, setInventory] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isItemDetailOpen, setIsItemDetailOpen] = useState(false);
  const navigate = useNavigate();
  const { logout, user } = useAuthStore();
  const {
    fetchRepairs,
    getRepairCountByStatus,
    getTodaySales,
    getRepairsByStatus,
  } = useRepairStore();

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchRepairs();
    fetchInventory();
  }, [fetchRepairs]);

  const fetchInventory = async () => {
    try {
      const res = await getInventory(null, null);
      setInventory(res.data || []);
    } catch (error) {
      console.log(error);
    }
  };

  // ยอดขายวันนี้
  const todaySales = getTodaySales();

  // นับการซ่อมตามสถานะ
  const inProgressCount = getRepairCountByStatus("IN_PROGRESS");
  const completedCount = getRepairCountByStatus("COMPLETED");
  const paidCount = getRepairCountByStatus("PAID");

  // ดึงรายการซ่อมทั้งหมดตามสถานะ
  const inProgressRepairs = getRepairsByStatus("IN_PROGRESS");
  const completedRepairs = getRepairsByStatus("COMPLETED");
  const paidRepairs = getRepairsByStatus("PAID");

  // กรองสินค้าที่ไม่ใช่บริการ
  const stockItems = inventory.filter((i) => i?.category?.name !== "บริการ");
  const outOfStockItems = stockItems.filter(
    (i) => Number(i?.stockQuantity || 0) <= 0,
  );
  const lowStockItems = stockItems.filter((i) => {
    const qty = Number(i?.stockQuantity || 0);
    const min = Number(i?.minStockLevel || 0);
    return qty > 0 && min > 0 && qty <= min;
  });

  // แสดงยี่ห้อ+รุ่น หรือแค่รุ่นถ้ายี่ห้อเป็น "อื่นๆ"
  const getDisplayBrand = (vehicleBrand) => {
    const brand = vehicleBrand?.brand || "";
    const model = vehicleBrand?.model || "";

    if (brand === "อื่นๆ" || brand === "อื่น ๆ") {
      return model;
    }
    return `${brand} ${model}`.trim();
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      localStorage.setItem("justLoggedOut", "true");
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="w-full">
      {/* Desktop View */}
      <div className="hidden w-full px-[20px] xl:block">
        {/* สถานะการซ่อม */}
        <div className="bg-surface shadow-primary mt-[24px] mb-[24px] w-full rounded-[10px] p-[16px]">
          <p className="text-subtle-dark text-[22px] font-medium">
            สถานะการซ่อม
          </p>

          {/* การ์ดสถานะ */}
          <div className="mt-[16px] grid grid-cols-3 gap-[16px]">
            <Link to="/repairs?status=in-progress">
              <StatusCard
                bg="progress"
                icon={Wrench}
                label={"กำลังซ่อม"}
                amount={inProgressCount}
              />
            </Link>
            <Link to="/repairs?status=completed">
              <StatusCard
                bg="completed"
                icon={Success}
                label={"ซ่อมเสร็จสิ้น"}
                amount={completedCount}
              />
            </Link>
            <Link to="/repairs?status=paid">
              <StatusCard
                bg="paid"
                icon={Paid}
                label={"ชำระเงินแล้ว"}
                amount={paidCount}
              />
            </Link>
          </div>

          {/* รายการซ่อมล่าสุด */}
          <div className="mt-[16px] grid grid-cols-3 gap-[16px]">
            {/* กำลังซ่อม */}
            <div className="flex flex-col gap-[12px]">
              {inProgressRepairs.length > 0 ? (
                inProgressRepairs.map((repair) => (
                  <Link key={repair.id} to={`/repairs/${repair.id}`}>
                    <CarCard
                      bg="progress"
                      icon={
                        <BrandIcons
                          brand={repair.vehicle?.vehicleBrand?.brand}
                          color="#ffb000"
                        />
                      }
                      licensePlate={
                        repair.vehicle?.licensePlate?.plate &&
                        repair.vehicle?.licensePlate?.province
                          ? `${repair.vehicle.licensePlate.plate} ${repair.vehicle.licensePlate.province}`
                          : "ไม่ระบุทะเบียนรถ"
                      }
                      brand={getDisplayBrand(repair.vehicle?.vehicleBrand)}
                      time={repair.createdAt && formatTime(repair.createdAt)}
                      price={parseFloat(repair.totalPrice)}
                    />
                  </Link>
                ))
              ) : (
                <p className="text-subtle-light py-[24px] text-center text-[20px]">
                  ไม่มีรายการซ่อม
                </p>
              )}
            </div>

            {/* ซ่อมเสร็จสิ้น */}
            <div className="flex flex-col gap-[12px]">
              {completedRepairs.length > 0 ? (
                completedRepairs.map((repair) => (
                  <Link key={repair.id} to={`/repairs/${repair.id}`}>
                    <CarCard
                      bg="completed"
                      icon={
                        <BrandIcons
                          brand={repair.vehicle?.vehicleBrand?.brand}
                          color="#22c55e"
                        />
                      }
                      licensePlate={
                        repair.vehicle?.licensePlate?.plate &&
                        repair.vehicle?.licensePlate?.province
                          ? `${repair.vehicle.licensePlate.plate} ${repair.vehicle.licensePlate.province}`
                          : "ไม่ระบุทะเบียนรถ"
                      }
                      brand={getDisplayBrand(repair.vehicle?.vehicleBrand)}
                      time={
                        repair.completedAt && formatTime(repair.completedAt)
                      }
                      price={parseFloat(repair.totalPrice)}
                    />
                  </Link>
                ))
              ) : (
                <p className="text-subtle-light py-[24px] text-center text-[20px]">
                  ไม่มีรายการซ่อม
                </p>
              )}
            </div>

            {/* ชำระเงินแล้ว */}
            <div className="flex flex-col gap-[12px]">
              {paidRepairs.length > 0 ? (
                paidRepairs.map((repair) => (
                  <Link key={repair.id} to={`/repairs/${repair.id}`}>
                    <CarCard
                      bg="paid"
                      icon={
                        <BrandIcons
                          brand={repair.vehicle?.vehicleBrand?.brand}
                        />
                      }
                      licensePlate={
                        repair.vehicle?.licensePlate?.plate &&
                        repair.vehicle?.licensePlate?.province
                          ? `${repair.vehicle.licensePlate.plate} ${repair.vehicle.licensePlate.province}`
                          : "ไม่ระบุทะเบียนรถ"
                      }
                      brand={getDisplayBrand(repair.vehicle?.vehicleBrand)}
                      time={repair.paidAt && formatTime(repair.paidAt)}
                      price={parseFloat(repair.totalPrice)}
                    />
                  </Link>
                ))
              ) : (
                <p className="text-subtle-light py-[24px] text-center text-[20px]">
                  ไม่มีรายการซ่อม
                </p>
              )}
            </div>
          </div>
        </div>

        {/* แจ้งเตือนสต็อก */}
        {(outOfStockItems.length > 0 || lowStockItems.length > 0) && (
          <div className="bg-surface shadow-primary mb-[16px] w-full rounded-[10px] p-[16px]">
            <p className="text-subtle-dark flex items-center gap-2 text-[22px] font-medium">
              แจ้งเตือนสต็อก
            </p>
            <div className="mt-[16px]">
              <div>
                {outOfStockItems.slice(0, 5).map((item) => (
                  <div
                    key={`desk-out-${item.id}`}
                    onClick={() => {
                      setSelectedItem(item);
                      setIsItemDetailOpen(true);
                    }}
                  >
                    <InventoryCard
                      item={item}
                      brand={item.brand}
                      name={item.name}
                      unit={item.unit}
                      sellingPrice={item.sellingPrice}
                      stockQuantity={item.stockQuantity}
                      minStockLevel={item.minStockLevel}
                      typeSpecificData={item.typeSpecificData}
                      secureUrl={item.secureUrl}
                      category={item.category?.name}
                    />
                  </div>
                ))}
                {lowStockItems.slice(0, 5).map((item) => (
                  <div
                    key={`desk-low-${item.id}`}
                    onClick={() => {
                      setSelectedItem(item);
                      setIsItemDetailOpen(true);
                    }}
                  >
                    <InventoryCard
                      item={item}
                      brand={item.brand}
                      name={item.name}
                      unit={item.unit}
                      sellingPrice={item.sellingPrice}
                      stockQuantity={item.stockQuantity}
                      minStockLevel={item.minStockLevel}
                      typeSpecificData={item.typeSpecificData}
                      secureUrl={item.secureUrl}
                      category={item.category?.name}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile View */}
      <div className="xl:hidden">
        <div
          className={`w-full ${
            user?.role === "ADMIN" ? "h-[222px] md:h-[228px]" : "h-[134px]"
          } bg-gradient-primary px-[20px] pt-[16px]`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-surface text-[32px] font-semibold md:text-[34px]">
                มณเฑียรการยาง
              </p>
              <p className="text-surface text-[20px] font-medium md:text-[22px]">
                วันที่ {formatDate(new Date())}
              </p>
            </div>

            {/* เมนูแฮมเบอร์เกอร์ */}
            <div>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label="เปิดเมนู"
                className="bg-surface mt-2 flex h-12 w-12 items-center justify-center rounded-xl backdrop-blur-sm duration-500"
              >
                <Menu className="text-primary h-6 w-6" />
              </button>

              {/* เมนูสไลด์อิน */}
              <div
                className={`bg-surface fixed inset-0 z-50 transform duration-500 ease-in-out ${
                  isMenuOpen ? "translate-x-0" : "translate-x-full"
                } ${!isMenuOpen ? "pointer-events-none" : ""}`}
              >
                <div className="bg-gradient-primary h-[104px] px-[20px] py-[16px]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center justify-center gap-[16px]">
                      <div className="bg-surface/20 flex h-12 w-12 items-center justify-center rounded-full">
                        <CircleUserRound className="text-surface h-7 w-7" />
                      </div>
                      <div>
                        <p className="text-surface text-[20px] font-semibold md:text-[22px]">
                          {user?.fullName}
                        </p>
                        <p className="text-surface text-[18px] md:text-[20px]">
                          {user?.role === "ADMIN" ? "แอดมิน" : "พนักงาน"}
                        </p>
                      </div>
                    </div>

                    {/* ปิดเมนู */}
                    <button
                      onClick={() => setIsMenuOpen(false)}
                      aria-label="ปิดเมนู"
                      className="bg-surface flex h-12 w-12 items-center justify-center rounded-xl"
                    >
                      <X className="text-primary h-6 w-6" />
                    </button>
                  </div>
                </div>
                <div className="bg-surface -mt-[16px] rounded-tl-2xl rounded-tr-2xl px-[20px] py-[16px]">
                  <div>
                    {/* จัดการยี่ห้อและรุ่นรถ */}
                    <Link
                      to="/vehicles/brands"
                      onClick={() => setIsMenuOpen(false)}
                      className="bg-surface shadow-primary mb-[16px] flex w-full items-center gap-[16px] rounded-[12px] p-[16px] duration-300"
                    >
                      <div className="bg-primary flex h-[48px] w-[48px] items-center justify-center rounded-[10px]">
                        <CarFront className="text-surface h-6 w-6" />
                      </div>
                      <p className="text-normal text-[18px] font-semibold md:text-[20px]">
                        จัดการยี่ห้อและรุ่นรถ
                      </p>
                    </Link>

                    {/* จัดการบัญชีพนักงาน */}
                    {user?.role === "ADMIN" && (
                      <Link
                        to="/admin/employees"
                        onClick={() => setIsMenuOpen(false)}
                        className="bg-surface shadow-primary mb-[16px] flex w-full items-center gap-[16px] rounded-[12px] p-[16px] duration-300"
                      >
                        <div className="bg-status-completed flex h-[48px] w-[48px] items-center justify-center rounded-[10px]">
                          <Users className="text-surface h-6 w-6" />
                        </div>
                        <p className="text-normal text-[18px] font-semibold md:text-[20px]">
                          จัดการบัญชีพนักงาน
                        </p>
                      </Link>
                    )}
                  </div>

                  {/* ออกจากระบบ */}
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className={`bg-surface shadow-primary flex w-full items-center gap-[16px] rounded-[12px] p-[16px] duration-300 ${
                      isLoggingOut ? "cursor-not-allowed opacity-50" : ""
                    }`}
                  >
                    <div className="bg-destructive flex h-[48px] w-[48px] items-center justify-center rounded-[10px]">
                      {isLoggingOut ? (
                        <LoaderCircle className="text-surface h-6 w-6 animate-spin" />
                      ) : (
                        <LogOut className="text-surface h-6 w-6" />
                      )}
                    </div>
                    <p className="text-normal text-[18px] font-semibold md:text-[20px]">
                      {isLoggingOut ? "ออกจากระบบ..." : "ออกจากระบบ"}
                    </p>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ยอดขายวันนี้ */}
          {user?.role === "ADMIN" && (
            <Link
              to="/admin/reports/sales?period=daily"
              className="bg-surface shadow-primary mx-auto mt-[16px] flex h-[80px] w-full items-center justify-between rounded-[10px] px-[16px]"
            >
              <p className="text-normal text-[22px] font-semibold md:text-[24px]">
                ยอดขายวันนี้
              </p>
              <p className="text-primary text-[30px] font-semibold md:text-[32px]">
                {formatCurrency(todaySales)}
              </p>
            </Link>
          )}
        </div>
        {/* สถานะการซ่อม */}
        <div className="bg-surface -mt-[16px] flex min-h-[calc(100svh-206px)] w-full flex-col gap-[16px] rounded-tl-2xl rounded-tr-2xl px-[20px] pb-[96px] md:min-h-[calc(100svh-212px)]">
          <p className="text-normal pt-[16px] text-[22px] font-semibold md:text-[24px]">
            สถานะการซ่อม
          </p>

          {/* กำลังซ่อม */}
          <Link to="/repairs?status=in-progress">
            <CarCard
              bg="progress"
              icon={Wrench}
              status={"กำลังซ่อม"}
              amount={inProgressCount > 0 ? inProgressCount : "0"}
            />
          </Link>

          {/* ซ่อมเสร็จสิ้น */}
          <Link to="/repairs?status=completed">
            <CarCard
              bg="completed"
              icon={Success}
              status={"ซ่อมเสร็จสิ้น"}
              amount={completedCount > 0 ? completedCount : "0"}
            />
          </Link>

          {/* ชำระเงินแล้ว */}
          <Link to="/repairs?status=paid">
            <CarCard
              bg="paid"
              icon={Paid}
              status={"ชำระเงินแล้ว"}
              amount={paidCount > 0 ? paidCount : "0"}
            />
          </Link>

          {/* แจ้งเตือนสต็อก */}
          {(outOfStockItems.length > 0 || lowStockItems.length > 0) && (
            <div className="pb-[16px]">
              <p className="text-normal pt-[8px] text-[22px] font-semibold md:text-[24px]">
                แจ้งเตือนสต็อก
              </p>
              {outOfStockItems.slice(0, 5).map((item) => (
                <div
                  key={`m-out-${item.id}`}
                  onClick={() => {
                    setSelectedItem(item);
                    setIsItemDetailOpen(true);
                  }}
                >
                  <InventoryCard
                    item={item}
                    brand={item.brand}
                    name={item.name}
                    unit={item.unit}
                    sellingPrice={item.sellingPrice}
                    stockQuantity={item.stockQuantity}
                    minStockLevel={item.minStockLevel}
                    typeSpecificData={item.typeSpecificData}
                    secureUrl={item.secureUrl}
                    category={item.category?.name}
                  />
                </div>
              ))}
              {lowStockItems.slice(0, 5).map((item) => (
                <div
                  key={`m-low-${item.id}`}
                  onClick={() => {
                    setSelectedItem(item);
                    setIsItemDetailOpen(true);
                  }}
                >
                  <InventoryCard
                    item={item}
                    brand={item.brand}
                    name={item.name}
                    unit={item.unit}
                    sellingPrice={item.sellingPrice}
                    stockQuantity={item.stockQuantity}
                    minStockLevel={item.minStockLevel}
                    typeSpecificData={item.typeSpecificData}
                    secureUrl={item.secureUrl}
                    category={item.category?.name}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
        <RepairItemDetailDialog
          item={selectedItem}
          open={isItemDetailOpen}
          onOpenChange={setIsItemDetailOpen}
          onStockUpdate={fetchInventory}
        />
      </div>
    </div>
  );
};
export default Dashboard;
