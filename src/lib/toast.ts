type ToastInput = {
  title: string;
  description?: string;
  variant?: "success" | "info";
};

export function showToast(input: ToastInput) {
  window.dispatchEvent(
    new CustomEvent("alisveris-toast", {
      detail: input,
    }),
  );
}
