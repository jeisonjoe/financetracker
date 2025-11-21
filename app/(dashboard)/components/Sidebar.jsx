"use client";

import Link from "next/link";
import { RiMenu2Line } from "react-icons/ri";
import { usePathname, useRouter } from "next/navigation";
import { nav, navBottom } from "@/app/utils/navItems";
import { toast } from "sonner";
import { supabase } from "@/app/supabase/supabase-client";
import { useAuth } from "@/app/contexts/AuthContext";
import { BiLogOut } from "react-icons/bi";
import { useState } from "react";
import ActionModal from "@/app/components/ActionModal";

export default function Sidebar() {
  const [showLogout, setShowLogout] = useState(false);
  const pathname = usePathname();
  const { logout } = useAuth();

  const router = useRouter();

  const handleLogout = () => {
    logout();
    setShowLogout(false);
    router.push("/");
  };

  return (
    <aside className="sidebar w-[330px] bg-white h-screen">
      <div className="flex flex-col gap-8 h-full justify-between p-8">
        <div className="flex flex-col gap-12">
          {/* Sidebar header */}
          <div className="flex gap-6 items-center">
            <div className="p-5 rounded-full border border-zinc-200">
              <RiMenu2Line size={18} />
            </div>
            <div className="flex flex-col ">
              <span className="text-lg">Fintrack</span>
              <span className="text-lg text-sidebar-sec">Dashboard</span>
            </div>
          </div>

          {/* Nav Menu */}
          <nav className="flex flex-col gap-2">
            {nav.map((item, i) => {
              return (
                <Link
                  key={item.name + i}
                  href={item.url}
                  className={` px-5 py-2.5 rounded-lg text-lg hover:bg-nav-hover transition-colors ease-in-out duration-500  ${
                    pathname === item.url ? "bg-nav-active" : "bg-transparent"
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Nav */}
        <nav className="flex flex-col gap-2">
          {navBottom.map((item, i) => {
            return (
              <Link
                key={item.name + i}
                href={item.url}
                className={`bg-transparent px-5 py-2.5 rounded-lg text-lg flex gap-4 items-center  hover:bg-nav-hover transition-colors ease-in-out duration-500 `}
              >
                <item.icon size={20} />
                {item.name}
              </Link>
            );
          })}
          <div
            className={`bg-transparent px-5 py-2.5 rounded-lg text-lg flex gap-4 items-center cursor-pointer hover:bg-nav-hover transition-colors ease-in-out duration-500 `}
            onClick={() => setShowLogout(true)}
          >
            <BiLogOut size={20} />
            Logout
          </div>
        </nav>
      </div>
      <ActionModal
        content={"Are you sure?"}
        secAction={() => setShowLogout(false)}
        primaryAction={handleLogout}
        primaryBtnText={"Logout"}
        secBtnText={"Cancel"}
        isOpen={showLogout}
      />
    </aside>
  );
}
