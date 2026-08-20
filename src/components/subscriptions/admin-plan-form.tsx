"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { appAlert } from "@/lib/alerts/app-alert";
import {
  assignStorePlanAction,
  createPlanAction,
  updatePlanAction,
} from "@/lib/subscriptions/actions";
import type {
  AdminSubscriptionAssignment,
  SubscriptionPlan,
} from "@/lib/subscriptions/types";

type AdminPlanFormProps = {
  plan: SubscriptionPlan;
};

export function AdminPlanForm({ plan }: AdminPlanFormProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updatePlanAction(formData);

      if (!result.ok) {
        void appAlert.error(result.message, "Plan yenilənmədi");
        return;
      }

      void appAlert.success("Plan yeniləndi", result.message);
      router.refresh();
    });
  }

  return (
    <form
      action={handleSubmit}
      className="grid gap-4 rounded-md border bg-card p-4 text-card-foreground shadow-sm"
    >
      <input type="hidden" name="planId" value={plan.id} />
      <PlanFields plan={plan} idPrefix={plan.id} />
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          name="isActive"
          type="checkbox"
          defaultChecked={plan.isActive}
          className="size-4 rounded border-input"
        />
        Aktiv plan
      </label>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Yenilənir" : "Planı yadda saxla"}
      </Button>
    </form>
  );
}

export function AdminPlanCreateForm() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createPlanAction(formData);

      if (!result.ok) {
        void appAlert.error(result.message, "Plan yaradılmadı");
        return;
      }

      void appAlert.success("Plan yaradıldı", result.message);
      router.refresh();
    });
  }

  return (
    <form
      action={handleSubmit}
      className="grid gap-4 rounded-md border bg-card p-4 text-card-foreground shadow-sm"
    >
      <PlanFields idPrefix="new" />
      <Button type="submit" disabled={isPending}>
        {isPending ? "Yaradılır" : "Yeni plan yarat"}
      </Button>
    </form>
  );
}

function PlanFields({
  plan,
  idPrefix,
}: {
  plan?: SubscriptionPlan;
  idPrefix: string;
}) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor={`name-${idPrefix}`}>
            Plan adı
          </label>
          <input
            id={`name-${idPrefix}`}
            name="name"
            defaultValue={plan?.name ?? ""}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            required
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor={`slug-${idPrefix}`}>
            Slug
          </label>
          <input
            id={`slug-${idPrefix}`}
            name="slug"
            defaultValue={plan?.slug ?? ""}
            placeholder="basic"
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>
      <div className="grid gap-2">
        <label className="text-sm font-medium" htmlFor={`description-${idPrefix}`}>
          Təsvir
        </label>
        <textarea
          id={`description-${idPrefix}`}
          name="description"
          defaultValue={plan?.description ?? ""}
          className="min-h-20 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor={`price-${idPrefix}`}>
            Qiymət
          </label>
          <input
            id={`price-${idPrefix}`}
            name="priceAmount"
            type="number"
            min="0"
            step="0.01"
            defaultValue={plan?.priceAmount ?? 0}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            required
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor={`currency-${idPrefix}`}>
            Valyuta
          </label>
          <input
            id={`currency-${idPrefix}`}
            name="currency"
            maxLength={3}
            defaultValue={plan?.currency ?? "AZN"}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm uppercase outline-none focus-visible:ring-2 focus-visible:ring-ring"
            required
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor={`interval-${idPrefix}`}>
            Billing interval
          </label>
          <select
            id={`interval-${idPrefix}`}
            name="billingInterval"
            defaultValue={plan?.billingInterval ?? "month"}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="month">Aylıq</option>
            <option value="year">İllik</option>
          </select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor={`product-limit-${idPrefix}`}>
            Məhsul limiti
          </label>
          <input
            id={`product-limit-${idPrefix}`}
            name="productLimit"
            type="number"
            min="0"
            step="1"
            placeholder="Limitsiz"
            defaultValue={plan?.productLimit ?? ""}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor={`image-limit-${idPrefix}`}>
            Məhsul başına şəkil limiti
          </label>
          <input
            id={`image-limit-${idPrefix}`}
            name="imagesPerProductLimit"
            type="number"
            min="0"
            step="1"
            placeholder="Limitsiz"
            defaultValue={plan?.imagesPerProductLimit ?? ""}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>
    </>
  );
}

export function AdminStorePlanAssignmentForm({
  assignments,
  plans,
}: {
  assignments: AdminSubscriptionAssignment[];
  plans: SubscriptionPlan[];
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await assignStorePlanAction(formData);

      if (!result.ok) {
        void appAlert.error(result.message, "Plan təyin edilmədi");
        return;
      }

      void appAlert.success("Plan təyin edildi", result.message);
      router.refresh();
    });
  }

  return (
    <form
      action={handleSubmit}
      className="grid gap-4 rounded-md border bg-card p-4 text-card-foreground shadow-sm"
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="assignment-store">
            Mağaza
          </label>
          <select
            id="assignment-store"
            name="storeId"
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            required
          >
            <option value="">Seçin</option>
            {assignments.map((assignment) => (
              <option key={assignment.storeId} value={assignment.storeId}>
                {assignment.storeName} · {assignment.ownerEmail ?? assignment.ownerName ?? "Sahib"}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="assignment-plan">
            Plan
          </label>
          <select
            id="assignment-plan"
            name="planId"
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Plan seçin</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name} · {plan.currency} {plan.priceAmount}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="assignment-status">
            Status
          </label>
          <select
            id="assignment-status"
            name="status"
            defaultValue="assigned"
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="assigned">Manual təyin et</option>
            <option value="inactive">İnaktiv et</option>
            <option value="canceled">Ləğv et</option>
          </select>
        </div>
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Təyin edilir" : "Planı mağazaya təyin et"}
      </Button>
    </form>
  );
}
