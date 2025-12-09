"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Unlock, Activity } from "lucide-react";

interface Cabinet {
  id: number;
  cabinet_id: string;
  name: string;
  location: string;
  status: string;
  online_status: string;
  owner_id: number | null;
}

export default function DashboardPage() {
  const [cabinets, setCabinets] = useState<Cabinet[]>([]);
  const [loading, setLoading] = useState(true);
  const [userCount, setUserCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    fetchDashboardData();
  }, [router]);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem("token");

      const cabinetsResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/cabinets`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const cabinetsData = await cabinetsResponse.json();
      setCabinets(cabinetsData);

      try {
        const usersResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/users`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const usersData = await usersResponse.json();
        setUserCount(usersData.length);
      } catch (error) {
        console.log(" Not admin, skipping user count");
      }
    } catch (error) {
      console.error(" Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLock = async (cabinetId: number, currentStatus: string) => {
    try {
      const token = localStorage.getItem("token");
      const action = currentStatus === "locked" ? "unlock" : "lock";

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/cabinets/${cabinetId}/${action}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        fetchDashboardData();
      } else {
        const error = await response.json();
        alert("Lỗi: " + error.error);
      }
    } catch (error) {
      console.error(" Error toggling lock:", error);
      alert("Lỗi kết nối");
    }
  };

  const lockedCount = cabinets.filter((c) => c.status === "locked").length;
  const unlockedCount = cabinets.filter(
    (c) => c.status === "unlocked"
  ).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Quản lý tủ thông minh PTIT</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng số tủ</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{cabinets.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Đang khóa</CardTitle>
              <Lock className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {lockedCount}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Đang mở</CardTitle>
              <Unlock className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {unlockedCount}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Người dùng</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {userCount > 0 ? userCount : "--"}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Danh sách tủ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading ? (
                <p className="text-center text-gray-500">Đang tải...</p>
              ) : cabinets.length === 0 ? (
                <p className="text-center text-gray-500">Chưa có tủ nào</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {cabinets.map((cabinet, index) => (
                    <Card key={`cabinet-${cabinet.id}-${index}`}>
                      <CardHeader>
                        <CardTitle className="text-lg">
                          {cabinet.name}
                        </CardTitle>
                        <p className="text-sm text-gray-600">
                          {cabinet.location}
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Trạng thái:</span>
                          <div className="flex items-center gap-2">
                            {cabinet.status === "locked" ? (
                              <>
                                <Lock className="h-4 w-4 text-red-500" />
                                <span className="text-sm font-semibold text-red-500">
                                  Đã khóa
                                </span>
                              </>
                            ) : (
                              <>
                                <Unlock className="h-4 w-4 text-green-500" />
                                <span className="text-sm font-semibold text-green-500">
                                  Đã mở
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <Button
                          className="w-full bg-linear-to-r from-[#E4002B] to-[#FF6B35]"
                          onClick={() =>
                            handleToggleLock(
                              cabinet.id,
                              cabinet.status
                            )
                          }
                          disabled={cabinet.online_status === "offline"}
                        >
                          {cabinet.status === "locked" ? (
                            <>
                              <Unlock className="h-4 w-4 mr-2" />
                              Mở khóa từ xa
                            </>
                          ) : (
                            <>
                              <Lock className="h-4 w-4 mr-2" />
                              Khóa từ xa
                            </>
                          )}
                        </Button>
                        {cabinet.online_status === "offline" && (
                          <p className="text-xs text-red-500 text-center">
                            Thiết bị offline
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
