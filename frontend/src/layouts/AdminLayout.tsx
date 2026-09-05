import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ChartBarIcon,
  BuildingStorefrontIcon,
  MegaphoneIcon,
  ArrowLeftStartOnRectangleIcon,
  ArrowTopRightOnSquareIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

export const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const navItems = [
    { name: 'Dashboard', path: '/admin', icon: ChartBarIcon },
    { name: 'Doʻkonlar', path: '/admin/stores', icon: BuildingStorefrontIcon },
    { name: 'Telegram Xabarnoma', path: '/admin/broadcast', icon: MegaphoneIcon },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-20 md:pb-0 font-sans antialiased">
      {/* Top Header */}
      <header className="bg-slate-900/90 backdrop-blur border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <Link to="/admin" className="flex items-center space-x-3 group">
              <div className="w-9 h-9 bg-gradient-to-tr from-amber-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-amber-500/20">
                <ShieldCheckIcon className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-bold text-white tracking-wide flex items-center gap-1.5">
                  Temir Daftar <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-semibold border border-amber-500/30">Super Admin</span>
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Tizimni Boshqarish Markazi</span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1 pl-4 border-l border-slate-800">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                      active
                        ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center space-x-3">
            {/* Quick Link back to regular app store */}
            <Link
              to="/"
              className="hidden sm:flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              title="Doʻkon boshqaruviga qaytish"
            >
              <span>Doʻkonimga oʻtish</span>
              <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
            </Link>

            <div className="hidden sm:flex items-center text-xs text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60">
              <span className="w-2 h-2 rounded-full bg-emerald-400 mr-2 animate-pulse"></span>
              <span>{user?.fullName || 'Super Admin'}</span>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
              title="Tizimdan chiqish"
            >
              <ArrowLeftStartOnRectangleIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 z-40 h-16 flex justify-around items-center px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[11px] font-medium transition-all ${
                active ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${active ? 'text-indigo-400' : 'text-slate-400'}`} />
              {item.name}
            </Link>
          );
        })}
        <Link
          to="/"
          className="flex flex-col items-center justify-center flex-1 h-full py-1 text-[11px] font-medium text-amber-400"
        >
          <ArrowTopRightOnSquareIcon className="w-5 h-5 mb-0.5" />
          Doʻkon
        </Link>
      </nav>
    </div>
  );
};
