import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  LogOut,
  User,
  Shield,
  Eye,
  MoreVertical,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const Header = () => {
  const { profile, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [openSantri, setOpenSantri] = useState(false);

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-green-100 shadow-soft relative z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">

          {/* KIRI - Logo & Tombol Mobile */}
          <div className="flex items-center space-x-3">
            {/* Tombol menu utama untuk semua layar */}
            <button
              onClick={() => setOpen(!open)}
              className="p-2 rounded-lg hover:bg-green-50 text-green-800 transition-colors"
            >
              <MoreVertical className="w-6 h-6" />
            </button>

            {/* Path logo aku sesuaikan dengan yang di AuthPage biar pasti muncul */}
            <img src="/logo mahad.png" alt="Logo Mahad" className="h-9 w-auto object-contain" 
              onError={(e) => e.currentTarget.style.display = 'none'} 
            />

            <h1 className="text-lg font-bold text-green-900 hidden sm:block tracking-wide font-serif">
              SIMATREN AL-JAWAHIR
            </h1>
          </div>

          {/* KANAN - KHUSUS DESKTOP (Sembunyi di HP biar nggak nabrak) */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
              <User className="h-4 w-4 text-green-700" />
              <span className="font-medium text-gray-700">{profile?.full_name || "Pengurus"}</span>

              <span className="text-gray-300">|</span>

              {isAdmin ? (
                <span className="flex items-center text-green-700 text-xs font-bold">
                  <Shield className="h-4 w-4 mr-1" /> Admin
                </span>
              ) : (
                <span className="flex items-center text-blue-600 text-xs font-bold">
                  <Eye className="h-4 w-4 mr-1" /> Viewer
                </span>
              )}
            </div>

            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => signOut()} 
              className="hover:bg-red-50 hover:text-red-600 hover:border-red-200 shadow-sm transition-all"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Keluar
            </Button>
          </div>
        </div>
      </div>

      {/* DROPDOWN MENU (Sidebar mini) */}
      {open && (
        <div className="absolute left-4 top-16 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 overflow-hidden animate-in slide-in-from-top-2">
          
          {/* INFO PENGGUNA - KHUSUS MOBILE (Muncul di dalam menu saat di HP) */}
          <div className="md:hidden flex flex-col p-3 mb-2 bg-green-50/50 rounded-xl border border-green-100">
             <div className="flex items-center gap-2 mb-1.5">
                <div className="bg-green-100 p-1.5 rounded-full">
                  <User className="h-4 w-4 text-green-700" />
                </div>
                <span className="text-sm font-bold text-green-900 capitalize truncate">
                  {profile?.full_name || "Pengurus"}
                </span>
             </div>
             <div>
              {isAdmin ? (
                  <span className="inline-flex items-center text-green-700 text-[10px] font-bold bg-green-200/50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    <Shield className="h-3 w-3 mr-1" /> Admin
                  </span>
                ) : (
                  <span className="inline-flex items-center text-blue-700 text-[10px] font-bold bg-blue-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    <Eye className="h-3 w-3 mr-1" /> Viewer
                  </span>
                )}
             </div>
          </div>

          <div className="md:hidden h-px bg-gray-100 my-2"></div>

          {/* KEUANGAN */}
          <button
            onClick={() => {
              navigate("/?tab=transactions");
              setOpen(false);
            }}
            className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-green-50 hover:text-green-800 text-sm font-medium text-gray-700 transition-colors"
          >
            Keuangan
          </button>

          {/* DATA SANTRI */}
          <button
            onClick={() => setOpenSantri(!openSantri)}
            className="w-full flex justify-between items-center px-3 py-2.5 rounded-xl hover:bg-green-50 hover:text-green-800 text-sm font-medium text-gray-700 transition-colors"
          >
            Data Santri
            <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${openSantri ? 'rotate-90 text-green-600' : 'text-gray-400'}`} />
          </button>

          {openSantri && (
            <div className="ml-4 mt-1 space-y-1 border-l-2 border-green-100 pl-2 mb-2">
              {[7, 8, 9, 10, 11, 12].map((kls) => (
                <button
                  key={kls}
                  onClick={() => {
                    navigate(`/?tab=santri&kelas=${kls}`);
                    setOpen(false);
                    setOpenSantri(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-green-50 hover:text-green-700 text-sm text-gray-600 transition-colors"
                >
                  Kelas {kls}
                </button>
              ))}
            </div>
          )}

          {/* PENGGUNA */}
          {isAdmin && (
            <button
              onClick={() => {
                navigate("/?tab=pengguna");
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-green-50 hover:text-green-800 text-sm font-medium text-gray-700 transition-colors"
            >
              Manajemen Pengurus
            </button>
          )}

          {/* TOMBOL LOGOUT KHUSUS MOBILE */}
          <div className="md:hidden h-px bg-gray-100 my-2"></div>
          <button
              onClick={() => {
                signOut();
                setOpen(false);
              }}
              className="md:hidden w-full flex items-center px-3 py-2.5 mt-1 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 text-sm font-bold transition-colors"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Keluar Akun
          </button>

        </div>
      )}
    </header>
  );
};

export default Header;
