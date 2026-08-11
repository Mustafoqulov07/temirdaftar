# “Qarzdor” — Raqamli Qarz Daftari Ilovasi (MVP)

Ushbu loyiha kichik do‘kon (magazin) egalari uchun mo‘ljallangan sodda va qulay raqamli qarz daftari hisoblanadi. Loyiha backend va frontend qismlaridan iborat.

---

## 🚀 Loyihani Mahalliy (Local) Kompyuterda Ishga Tushirish

Loyihani ishga tushirish uchun quyidagi ketma-ketlikni bajaring:

### 1. Oldindan talab qilinadigan narsalar:
* **Node.js** (v18 yoki undan yuqori)
* **pnpm** (`npm install -g pnpm`)

---

### 2. Backendni (NestJS) ishga tushirish

1. Terminalda `backend` papkasiga o‘ting:
   ```bash
   cd backend
   ```
2. Loyiha kutubxonalarini o‘rnating (allaqachon o‘rnatilgan):
   ```bash
   pnpm install
   ```
3. Prisma uchun mahalliy in-memory PostgreSQL serverini fonda ishga tushiring (yoki `pnpm approve-builds --all` qiling, agar so‘ralsa):
   ```bash
   npx prisma dev --detach
   ```
4. Ma’lumotlar bazasi jadvallarini sinxronizatsiya qiling:
   ```bash
   npx prisma db push
   ```
5. Backend serverni ishga tushiring:
   ```bash
   pnpm run start:dev
   ```

Backend server **http://localhost:3000/api** manzilida ishga tushadi.

---

### 3. Frontendni (React + Vite) ishga tushirish

1. Yangi terminal oynasini oching va `frontend` papkasiga o‘ting:
   ```bash
   cd frontend
   ```
2. Loyiha kutubxonalarini o‘rnating (allaqachon o‘rnatilgan):
   ```bash
   pnpm install
   ```
3. Frontendni ishlab chiqish (development) serverini ishga tushiring:
   ```bash
   pnpm run dev
   ```

Frontend ilova **http://localhost:5173** manzilida ishga tushadi. Brauzerda ushbu havolani ochib loyihadan foydalanishingiz mumkin.

---

## 🔒 Xavfsizlik va Ma’lumotlar Butunligi

1. **Ma’lumotlar yo‘qolishidan himoya (Soft Delete):** Mijoz yoki uning tarixi o‘chirilganda u bazadan o‘chib ketmaydi, balki `deletedAt` belgisi qo‘yiladi. Bu tasodifiy o‘chishlarning oldini oladi.
2. **Do‘konlar izolatsiyasi (Row-Level Security):** Har bir do‘kon egasi faqat o‘zining mijozlari va ularning qarzlarini ko‘ra oladi. Boshqa do‘konlar ma’lumotlariga kirish bloklangan.
3. **Tranzaksiya xavfsizligi:** Har bir qarz va to‘lov operatsiyalari tranzaksiyalar yordamida himoyalangan.
