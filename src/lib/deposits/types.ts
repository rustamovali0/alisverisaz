export type DepositStatus = "pending" | "paid" | "canceled" | "refunded";

export const depositStatusLabels: Record<DepositStatus, string> = {
  pending: "Gözləyir",
  paid: "Ödənilib",
  canceled: "Ləğv edilib",
  refunded: "Qaytarılıb",
};

export type ManagedDeposit = {
  id: string;
  customerName: string;
  phone: string;
  productName: string;
  amount: number;
  remainingAmount: number;
  currency: string;
  status: DepositStatus;
  paymentUrl: string | null;
  createdAt: string;
};

export type DepositActionResult =
  | {
      ok: true;
      message: string;
      paymentUrl: string;
    }
  | {
      ok: false;
      message: string;
    };
