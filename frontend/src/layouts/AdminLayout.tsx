import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ChartBarSquareIcon,
  BuildingStorefrontIcon,
  MegaphoneIcon,
  ArrowLeftStartOnRectangleIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

export const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const isActive = (path: string) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const navItems = [
    { name: 'Statistika & Trendlar', path: '/admin', icon: ChartBarSquareIcon },
    { name: 'Doʻkonlar Markazi', path: '/admin/stores', icon: BuildingStorefrontIcon },
    { name: 'Ommaviy Xabarnoma', path: '/admin/broadcast', icon: MegaphoneIcon },
  ];

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col pb-20 md:pb-0 font-sans antialiased selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="fixed top-[20%] right-[-10%] w-[450px] h-[450px] bg-cyan-500/10 rounded-full blur-[130px] pointer-events-none -z-10" />
      <div className="fixed bottom-[-10%] left-[30%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[160px] pointer-events-none -z-10" />

      {/* Top Header */}
      <header className="bg-[#0b1222]/80 backdrop-blur-xl border-b border-slate-800/80 sticky top-0 z-40 shadow-2xl shadow-black/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            {/* Logo */}
            <Link to="/admin" className="flex items-center space-x-3.5 group">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-black shadow-lg shadow-amber-500/25 group-hover:scale-105 transition-transform duration-300">
                  <SparklesIcon className="w-5 h-5 text-white" />
                </div>
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                </span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black tracking-tight text-white group-hover:text-amber-300 transition-colors">
                    TEMIR DAFTAR
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-extrabold tracking-wider uppercase bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/40">
                    SUPER ADMIN
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
                  <span className="font-mono text-emerald-400/90 text-[10px]">Markaziy Boshqaruv Tizimi</span>
                </div>
              </div>
            </Link>

            {/* Desktop Navigation Tabs */}
            <nav className="hidden md:flex items-center space-x-1.5 pl-6 border-l border-slate-800/80">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 relative ${
                      active
                        ? 'bg-gradient-to-r from-indigo-600/30 to-purple-600/20 text-indigo-300 border border-indigo-500/40 shadow-lg shadow-indigo-500/10'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${active ? 'text-indigo-400' : 'text-slate-400'}`} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center space-x-3">

            {/* Admin Profile Chip */}
            <div className="hidden sm:flex items-center space-x-2.5 bg-slate-900/90 border border-slate-800 px-3.5 py-1.5 rounded-xl">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center text-xs font-black text-white shadow-inner">
                👑
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold text-white leading-tight">
                  {user?.fullName || 'Super Administrator'}
                </span>
                <span className="text-[10px] font-mono text-slate-400 leading-tight">
                  {user?.phoneNumber}
                </span>
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-xl transition"
              title="Tizimdan chiqish"
            >
              <ArrowLeftStartOnRectangleIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Chiqish</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0b1222]/95 backdrop-blur-xl border-t border-slate-800 z-40 h-16 flex justify-around items-center px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-bold transition-all ${
                active ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${active ? 'text-indigo-400' : 'text-slate-400'}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};
