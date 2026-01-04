import React from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, User, Shield, Eye } from 'lucide-react';

const Header: React.FC = () => {
  const { user, profile, signOut, isAdmin } = useAuth();

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-green-100 shadow-soft">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex items-center space-x-3">
              {/* Logo Mahad */}
              <img 
                src="./images/logo mahad.png" 
                alt="Logo Mahad PPS Al-Jawahir" 
                className="w-auto h-10 object-contain drop-shadow-sm"
              />
              {/* PPS Icon */}
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">PPS</span>
              </div>
              <h1 className="text-xl font-bold text-gradient">
                KEUANGAN PPS AL-JAWAHIR
              </h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <User className="h-4 w-4" />
              <span>{profile?.full_name}</span>
              <div className="flex items-center space-x-1">
                {isAdmin ? (
                  <>
                    <Shield className="h-4 w-4 text-green-600" />
                    <span className="text-green-600 font-medium">Admin</span>
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 text-blue-600" />
                    <span className="text-blue-600 font-medium">Viewer</span>
                  </>
                )}
              </div>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={signOut}
              className="flex items-center space-x-2"
            >
              <LogOut className="h-4 w-4" />
              <span>Keluar</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;