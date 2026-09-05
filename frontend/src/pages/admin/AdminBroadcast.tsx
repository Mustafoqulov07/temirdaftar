import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import {
  MegaphoneIcon,
  PaperAirplaneIcon,
  InformationCircleIcon,
  CheckBadgeIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

export const AdminBroadcast: React.FC = () => {
  const { showToast } = useToast();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [telegramUsersCount, setTelegramUsersCount] = useState<number | null>(null);
  const [result, setResult] = useState<{ total: number; sent: number; failed: number } | null>(null);

  useEffect(() => {
    api.get('/admin/stats')
      .then((res) => {
        setTelegramUsersCount(res.data.telegramUsersCount);
      })
      .catch((err) => {
        console.error('Error loading stats:', err);
      });
  }, []);

  const templates = [
    {
      title: '🚀 Tizim Yangilanishi',
      text: "Hurmatli do'kondorlar! Tizimda yangi imkoniyatlar ishga tushirildi. Yangi funksiyalar bilan tanishish uchun ilovaga kiring va qulayliklardan bahramand bo'ling!",
    },
    {
      title: '🛠 Texnik Ishlar',
      text: "Diqqat! Bugun soat 02:00 dan 03:00 gacha serverda profilaktika ishlari olib boriladi. Shu vaqtda tizim vaqtinchalik ishlamasligi mumkin.",
    },
    {
      title: '💡 Muhim Eslatma',
      text: "Eslatma: Do'koningizdagi mijozlar qarzlarini o'z vaqtida kiritish va to'lovlarni belgilab borishni unutmang.",
    },
  ];

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      showToast('Xabar matnini kiriting', 'warning');
      return;
    }

    try {
      setLoading(true);
      setResult(null);
      const res = await api.post('/admin/broadcast', { message: message.trim() });
      setResult({
        total: res.data.total,
        sent: res.data.sent,
        failed: res.data.failed,
      });
      showToast(res.data.message || 'Xabar muvaffaqiyatli tarqatildi', 'success');
      setMessage('');
    } catch (err: any) {
      console.error('Error broadcasting message:', err);
      showToast(err.response?.data?.message || 'Xabar yuborishda xatolik yuz berdi', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <MegaphoneIcon className="w-7 h-7 text-indigo-400" />
          Telegram Xabarnoma Yuborish
        </h1>
        <p className="text-slate-400 text-xs sm:text-sm mt-1">
          Barcha doʻkon egalariga Telegram bot orqali rasmiy xabar va yangiliklarni tarqatish
        </p>
      </div>

      {/* Telegram status banner */}
      <div className="bg-gradient-to-r from-sky-950/40 via-indigo-950/40 to-slate-900 border border-sky-500/20 rounded-2xl p-4 sm:p-5 flex items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 bg-sky-500/20 text-sky-400 rounded-xl">
            <InformationCircleIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Botga ulangan faol foydalanuvchilar</p>
            <p className="text-xs text-slate-400">
              Ushbu xabarnoma bot orqali roʻyxatdan oʻtgan yoki hisobini bogʻlagan foydalanuvchilarga boradi.
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-2xl font-black text-sky-400">
            {telegramUsersCount !== null ? telegramUsersCount : '...'}
          </span>
          <span className="text-xs text-slate-400 block">nafar qabul qiluvchi</span>
        </div>
      </div>

      {/* Template chips */}
      <div>
        <label className="text-xs font-semibold text-slate-300 block mb-2 flex items-center gap-1">
          <SparklesIcon className="w-4 h-4 text-amber-400" />
          Tayyor shablonlar (ustiga bosing):
        </label>
        <div className="flex flex-wrap gap-2">
          {templates.map((tmpl, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setMessage(tmpl.text)}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-indigo-500/50 text-slate-300 hover:text-white transition"
            >
              {tmpl.title}
            </button>
          ))}
        </div>
      </div>

      {/* Editor & Preview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <form onSubmit={handleSend} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Xabar Matni:
              </label>
              <textarea
                rows={8}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Xabaringizni bu yerga yozing..."
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-500 transition leading-relaxed resize-none"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500">
                Belgilar soni: {message.length}
              </span>
              <button
                type="submit"
                disabled={loading || !message.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/25 transition disabled:opacity-50"
              >
                <PaperAirplaneIcon className="w-4 h-4" />
                <span>{loading ? 'Yuborilmoqda...' : 'Barchaga Yuborish'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Live Telegram Preview */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-3">
              📱 Telegram koʻrinishi (Preview)
            </span>
            <div className="bg-[#182533] p-4 rounded-2xl max-w-sm shadow-inner border border-slate-700/40">
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-700/60 text-xs font-semibold text-cyan-400">
                <span>🤖 Temir Daftar Bot</span>
              </div>
              <div className="text-xs text-white whitespace-pre-wrap leading-relaxed">
                📢 <strong className="font-bold">TIZIM BILDIRISHNOMASI</strong>
                <br /><br />
                {message || <span className="text-slate-500 italic">Xabaringiz bu yerda koʻrinadi...</span>}
              </div>
              <div className="text-[10px] text-slate-400 text-right mt-2">
                12:00 ✓✓
              </div>
            </div>
          </div>

          {result && (
            <div className="mt-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
              <div className="flex items-center gap-2 font-bold mb-1">
                <CheckBadgeIcon className="w-4 h-4 text-emerald-400" />
                Muvaffaqiyatli yakunlandi:
              </div>
              <div>Jami qabul qiluvchilar: {result.total} ta</div>
              <div>Yuborildi: {result.sent} ta</div>
              {result.failed > 0 && <div className="text-rose-400">Yuborilmadi: {result.failed} ta</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
