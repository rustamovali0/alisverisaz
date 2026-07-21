"use client";

import Swal from "sweetalert2";

import { getErrorMessage } from "@/lib/errors/app-error";

export const appAlert = {
  success(title: string, text?: string) {
    return Swal.fire({
      icon: "success",
      title,
      text,
      confirmButtonText: "Oldu",
    });
  },
  error(error: unknown, title = "Xeta") {
    return Swal.fire({
      icon: "error",
      title,
      text: getErrorMessage(error),
      confirmButtonText: "Bagla",
    });
  },
  confirm(title: string, text?: string) {
    return Swal.fire({
      icon: "question",
      title,
      text,
      showCancelButton: true,
      confirmButtonText: "Tesdiqle",
      cancelButtonText: "Legv et",
    });
  },
};
