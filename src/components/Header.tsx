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

          {/* KIRI */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setOpen(!open)}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            <img src="./images/logo mahad.png" alt="Logo Mahad" className="h-9" />

            <h1 className="text-lg font-bold text-gradient hidden sm:block">
              KEUANGAN PPS AL-JAWAHIR
            </h1>
          </div>

          {/* KANAN */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <User className="h-4 w-4" />
              <span>{profile?.full_name}</span>

              {isAdmin ? (
                <span className="flex items-center text-green-600 text-xs">
                  <Shield className="h-4 w-4 mr-1" /> Admin
                </span>
              ) : (
                <span className="flex items-center text-blue-600 text-xs">
                  <Eye className="h-4 w-4 mr-1" /> Viewer
                </span>
              )}
            </div>

            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-1" />
              Keluar
            </Button>
          </div>
        </div>
      </div>

      {/* DROPDOWN */}
      {open && (
        <div className="absolute left-4 top-16 w-64 bg-white rounded-xl shadow-lg border p-2">

          {/* KEUANGAN */}
          <button
            onClick={() => {
              navigate("/?tab=transactions");
              setOpen(false);
            }}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100"
          >
            Keuangan
          </button>

          {/* DATA SANTRI */}
          <button
            onClick={() => setOpenSantri(!openSantri)}
            className="w-full flex justify-between items-center px-3 py-2 rounded-lg hover:bg-gray-100"
          >
            Data Santri
            <ChevronRight className="w-4 h-4" />
          </button>

          {openSantri && (
            <div className="ml-3 mt-1 space-y-1">
              {[7, 8, 9, 10, 11, 12].map((kls) => (
                <button
                  key={kls}
                  onClick={() => {
                    navigate(`/?tab=santri&kelas=${kls}`);
                    setOpen(false);
                    setOpenSantri(false);
                  }}
                  className="w-full text-left px-3 py-1 rounded hover:bg-gray-100 text-sm"
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
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100"
            >
              Pengguna
            </button>
          )}
        </div>
      )}
    </header>
  );
};

export default Header;