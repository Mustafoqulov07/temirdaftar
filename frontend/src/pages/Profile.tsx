import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  UserCircleIcon,
  ArrowLeftStartOnRectangleIcon,
} from '@heroicons/react/24/outline';

export const Profile: React.FC = () => {
  const { user, store, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 leading-tight">Sozlamalar</h1>
        <p className="text-sm text-gray-500">Tizim va doʻkon sozlamalari</p>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-100">
        {/* Do'kon ma'lumotlari */}
        <div className="p-6 flex items-center space-x-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <span className="text-xl">🏬</span>
          </div>
          <div>
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Doʻkon nomi</span>
            <h3 className="text-lg font-bold text-gray-900">{store?.name}</h3>
          </div>
        </div>

        {/* Foydalanuvchi ma'lumotlari */}
        <div className="p-6 flex items-center space-x-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <UserCircleIcon className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Doʻkon egasi</span>
            <h3 className="text-lg font-bold text-gray-900">{user?.fullName}</h3>
            <p className="text-sm text-gray-500 font-medium">{user?.phoneNumber}</p>
          </div>
        </div>
      </div>

      {/* Logout button */}
      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center space-x-2 bg-red-50 hover:bg-red-100 border border-red-100 text-red-600 font-bold py-4 px-6 rounded-2xl shadow-sm transition-all duration-200 text-base"
      >
        <ArrowLeftStartOnRectangleIcon className="w-5 h-5 text-red-600" />
        <span>Tizimdan chiqish</span>
      </button>
    </div>
  );
};
