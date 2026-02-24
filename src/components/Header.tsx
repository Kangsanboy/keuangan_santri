import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  LogOut,
  Shield,
  Eye,
  MoreVertical,
  ChevronRight,
  Menu
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const Header = () => {
  // 🔥 Pastikan 'user' ikut dipanggil untuk mengambil email
  const { profile, user, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [openSantri, setOpenSantri] = useState(false);

  // Fungsi untuk mengambil inisial nama (Misal: Rajib Alwi -> RA)
  const getInitials = (name: string) => {
    if (!name) return "P"; 
    const words = name.trim().split(" ");
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  return (
    // 🔥 UPDATE 1: Background header diberi gradient putih ke hijau muda ala glassmorphism
    <header className="bg-gradient-to-r from-white via-green-50/50 to-green-100/60 backdrop-blur-md border-b border-green-200 shadow-sm relative z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center h-20"> {/* Header agak ditinggikan biar elegan */}

          {/* KIRI - Tombol Menu & Logo */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setOpen(!open)}
              className="p-2.5 rounded-xl bg-white border border-green-100 shadow-sm hover:bg-green-50 text-green-800 transition-all"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* 🔥 UPDATE 2: Logo mylogo.png di atas tulisan SIMATREN */}
            <div className="flex flex-col items-center justify-center">
              <img 
                src="/mylogo.png" 
                alt="Logo Simatren" 
                className="h-8 w-auto object-contain mb-1 drop-shadow-sm" 
                onError={(e) => e.currentTarget.style.display = 'none'} 
              />
              <div className="text-center leading-tight">
                <h1 className="text-base font-bold text-green-900 hidden sm:block font-serif tracking-widest uppercase">
                  SIMATREN
                </h1>
              </div>
            </div>
          </div>

          {/* KANAN - Info User & Role (Desktop) */}
          <div className="hidden md:flex items-center gap-4">
            
            {/* 🔥 UPDATE 3: Kotak Profil User Premium */}
            <div className="flex items-center gap-3 bg-white/90 backdrop-blur-sm p-2 pr-4 rounded-full shadow-sm border border-green-100 hover:shadow-md transition-all">
              
              {/* Lingkaran Inisial (Avatar) */}
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center text-white font-bold text-sm shadow-inner shrink-0">
                {getInitials(profile?.full_name || "Admin")}
              </div>

              {/* Teks Nama & Email */}
              <div className="flex flex-col justify-center">
                <span className="text-sm font-bold text-gray-800 leading-none capitalize">
                  {profile?.full_name || "Pengurus Pesantren"}
                </span>
                <span className="text-[10px] text-gray-500 mt-1 font-medium">
                  {user?.email || "email@pesantren.com"}
                </span>
              </div>

              {/* Garis Pembatas */}
              <div className="h-6 w-px bg-gray-200 mx-1"></div>

              {/* Badge Role */}
              <div>
                {isAdmin ? (
                  <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-widest border border-green-200 shadow-sm">
                    <Shield className="w-3 h-3" /> Admin
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-widest border border-blue-200 shadow-sm">
                    <Eye className="w-3 h-3" /> Viewer
                  </span>
                )}
              </div>
            </div>

            {/* Tombol Logout */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => signOut()} 
              className="h-11 w-11 rounded-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 shadow-sm transition-all"
              title="Keluar"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* DROPDOWN MENU (Sidebar mini khusus HP) */}
      {open && (
        <div className="absolute left-4 top-20 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 overflow-hidden animate-in slide-in-from-top-2">
          
          {/* INFO PENGGUNA - KHUSUS MOBILE */}
          <div className="md:hidden flex flex-col p-3 mb-2 bg-gradient-to-br from-green-50 to-white rounded-xl border border-green-100 shadow-sm">
             <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-full bg-green-700 flex items-center justify-center text-white font-bold text-sm shadow-inner shrink-0">
                  {getInitials(profile?.full_name || "Admin")}
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm font-bold text-green-900 capitalize truncate">
                    {profile?.full_name || "Pengurus"}
                  </span>
                  <span className="text-[10px] text-gray-500 truncate">
                    {user?.email || "email@pesantren.com"}
                  </span>
                </div>
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
