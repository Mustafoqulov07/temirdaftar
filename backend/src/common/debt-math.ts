// Qarz matematikasi uchun umumiy yordamchi funksiyalar.
// Barcha hisob-kitoblar shu fayldan foydalanadi — mantiq bir joyda bo'lishi uchun.

export type DebtLike = {
  id: string;
  createdAt: Date;
  items: Array<{ quantity: unknown; pricePerUnit: unknown }>;
};

export type PaymentLike = { amount: unknown };

export const round2 = (n: number): number => Math.round(n * 100) / 100;

/** Bitta qarzning umumiy summasi (quantity * pricePerUnit yig'indisi) */
export function debtTotalOf(items: Array<{ quantity: unknown; pricePerUnit: unknown }>): number {
  return round2(items.reduce((sum, i) => sum + Number(i.quantity) * Number(i.pricePerUnit), 0));
}

/** Mijozning sof qarzi: barcha qarzlar - barcha to'lovlar. Manfiy bo'lsa — ortiqcha to'lov. */
export function netDebtOf(debts: DebtLike[], payments: PaymentLike[]): number {
  const totalDebt = debts.reduce((sum, d) => sum + debtTotalOf(d.items), 0);
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  return round2(totalDebt - totalPaid);
}

export interface DebtAllocation {
  total: number; // qarzning umumiy summasi
  paidPortion: number; // FIFO bo'yicha to'langan qismi
  isPaid: boolean; // to'liq to'langanmi
}

/**
 * Jami to'lovlarni qarzlar bo'yicha FIFO (eng eski qarzdan boshlab) taqsimlaydi.
 * Debts ro'yxati createdAt bo'yicha o'sish tartibida saralangan bo'lishi kerak.
 * Qaytaradigan map: debtId -> { total, paidPortion, isPaid }
 */
export function allocatePaymentsFIFO(
  debts: DebtLike[],
  totalPaid: number,
): Map<string, DebtAllocation> {
  const result = new Map<string, DebtAllocation>();
  let remaining = round2(totalPaid);

  for (const debt of [...debts].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() || a.id.localeCompare(b.id),
  )) {
    const total = debtTotalOf(debt.items);
    const paidPortion = round2(Math.min(Math.max(remaining, 0), total));
    remaining = round2(remaining - total);
    result.set(debt.id, { total, paidPortion, isPaid: paidPortion >= total });
  }

  return result;
}

/** Tranzaksiya raqobati (P2034) bo'lsa qayta urinib ko'ruvchi wrapper */
export async function withSerializableRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      // P2034: tranzaksiya raqobati tufayli bekor qilindi — qayta urinamiz
      if (err?.code !== 'P2034') throw err;
      await new Promise((r) => setTimeout(r, 50 * (i + 1)));
    }
  }
  throw lastErr;
}
