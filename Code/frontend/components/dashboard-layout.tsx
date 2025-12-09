"use client";

import type React from "react";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  History,
  User,
  LogOut,
  Menu,
  X,
  Settings,
  Lock,
  Bell,
} from "lucide-react";


export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userRole, setUserRole] = useState<string>("user");

  useEffect(() => {
    const user = localStorage.getItem("user");
    if (user) {
      const userData = JSON.parse(user);
      setUserRole(userData.role);

      // Check quyền
      const isAdminRoute = pathname.startsWith("/admin");
      if (isAdminRoute && userData.role !== "admin") {
        router.push("/unauthorized");
      }
    } else {
      router.push("/login"); // Chưa login → đẩy về login
    }
  }, [pathname]);


  const userNavigation = [
    { name: "Tủ của tôi", href: "/my-cabinets", icon: Lock },
    { name: "Lịch sử", href: "/history", icon: History },
    { name: "Cảnh báo", href: "/alerts", icon: Bell },
    { name: "Hồ sơ", href: "/profile", icon: User },
  ];

  const adminNavigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Lịch sử", href: "/history", icon: History },
    { name: "Cảnh báo", href: "/alerts", icon: Bell },
    { name: "Hồ sơ", href: "/profile", icon: User },
  ];

  const adminOnlyNavigation = [
    { name: "Quản lý Users", href: "/admin/users", icon: Users },
    { name: "Quản lý Devices", href: "/admin/devices", icon: Lock },
    // { name: "Cài đặt", href: "/admin/settings", icon: Settings },
  ];

  const navigation = userRole === "admin" ? adminNavigation : userNavigation;

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-linear-to-br from-[#E4002B] to-[#FF6B35] rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">SC</span>
          </div>
          <span className="font-bold text-gray-900">Smart Cabinet</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-full flex flex-col">
          <div className="p-6 border-b">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-linear-to-br from-[#E4002B] to-[#FF6B35] rounded-lg flex items-center justify-center">
                <span className="text-white text-lg font-bold">SC</span>
              </div>
              <div>
                <h1 className="font-bold text-gray-900">Smart Cabinet</h1>
                <p className="text-xs text-gray-600">PTIT IoT System</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? "bg-linear-to-r from-[#E4002B] to-[#FF6B35] text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}

            {userRole === "admin" && (
              <>
                <div className="pt-4 pb-2 px-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase">
                    ADMIN
                  </p>
                </div>
                {adminOnlyNavigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        isActive
                          ? "bg-linear-to-r from-[#E4002B] to-[#FF6B35] text-white"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="font-medium">{item.name}</span>
                    </Link>
                  );
                })}
              </>
            )}
          </nav>

          <div className="p-4 border-t">
            <Button
              variant="outline"
              className="w-full justify-start bg-transparent"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5 mr-3" />
              Đăng xuất
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:pl-64">
        <div className="p-6 lg:p-8 pt-20 lg:pt-8">{children}</div>
      </main>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
