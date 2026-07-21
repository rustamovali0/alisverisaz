export type OrderStatus = "pending" | "confirmed" | "processing" | "delivered" | "canceled";

export const orderStatusLabels: Record<OrderStatus, string> = {
  pending: "Yeni",
  confirmed: "Təsdiqləndi",
  processing: "Hazırlanır",
  delivered: "Çatdırıldı",
  canceled: "Ləğv edildi",
};

export const orderStatusOptions: Array<{
  value: OrderStatus;
  label: string;
}> = Object.entries(orderStatusLabels).map(([value, label]) => ({
  value: value as OrderStatus,
  label,
}));

export type ManagedOrder = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: string;
  totalAmount: number;
  currency: string;
  storeName: string;
  storeSlug: string | null;
  customerName: string;
  customerPhone: string;
  address: string;
  note: string | null;
  createdAt: string;
  items: Array<{
    id: string;
    productName: string;
    productId: string | null;
    quantity: number;
    totalAmount: number;
  }>;
};

export type OrderActionResult =
  | {
      ok: true;
      message: string;
    }
  | {
      ok: false;
      message: string;
    };
