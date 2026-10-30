"use client";

import { Eye, FileText, History, Mail, RefreshCw, Send, Settings2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { appAlert } from "@/lib/alerts/app-alert";
import {
  loadEmailCampaignRecipients,
  loadEmailCenter,
  previewAdminEmail,
  queueAdminEmail,
  saveEmailTemplate,
  searchEmailRecipients,
} from "@/lib/email/admin";

import { SystemTemplateEditor } from "@/components/admin/email/system-template-editor";
import type { SystemEmailTemplate } from "../../../../supabase/functions/_shared/template-catalog";

import { renderEmail } from "../../../../supabase/functions/_shared/email";

type Template = {
  id: string;
  name: string;
  subject: string;
  body: string;
  purpose: string;
};
type Recipient = {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
};
type Campaign = {
  id: string;
  subject: string;
  audience: string;
  purpose: string;
  recipient_count: number;
  created_at: string;
  sent: number;
  pending: number;
  failed: number;
  skipped: number;
};
type Center = {
  available: boolean;
  enabled: boolean;
  adminAddress: string;
  templates: Template[];
  systemAvailable:boolean;
  systemTemplates:SystemEmailTemplate[];
  history: Campaign[];
};
const audienceLabels: Record<string, string> = {
  customer: "Alıcılar",
  seller: "Satıcılar",
  all: "Alıcılar və satıcılar",
  selected: "Seçilmiş istifadəçilər",
};
const stateLabels: Record<string, string> = {
  pending: "Gözləyir",
  processing: "Göndərilir",
  sent: "Göndərilib",
  failed: "Uğursuz",
  skipped: "Göndərilmədi",
};
const field =
  "min-h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

export function AdminEmailCenter({ initial }: { initial: Center }) {
  const [data, setData] = useState(initial),
    [tab, setTab] = useState("compose"),
    [pending, start] = useTransition();
  const [subject, setSubject] = useState(""),
    [body, setBody] = useState(""),
    [purpose, setPurpose] = useState("service"),
    [audience, setAudience] = useState("all");
  const [templateId, setTemplateId] = useState(""),
    [templateName, setTemplateName] = useState(""),
    [selected, setSelected] = useState<Recipient[]>([]);
  const [search, setSearch] = useState(""),
    [matches, setMatches] = useState<Recipient[]>([]),
    [preview, setPreview] = useState(false),
    [feedback, setFeedback] = useState("");
  const [detail, setDetail] = useState<
    { id: string; page: number; rows: any[] } | null
  >(null);
  const requestId = useRef<string | null>(null);
  const campaignPreview=useMemo(()=>renderEmail({id:'preview',kind:purpose==='marketing'?'campaign_marketing':'admin_campaign',recipient_id:'preview',recipient_role:'customer',to_address:'alici@example.com',lock_token:'',payload:{title:subject||'Məktubun mövzusu',body:(body||'Məktubun mətni burada görünəcək.').replaceAll('{ad}','Aysel').replaceAll('{magaza}','Nümunə mağaza').replaceAll('{sayt}','https://alisveris.az')}},'https://alisveris.az',undefined,data.systemTemplates?.find(t=>t.key===(purpose==='marketing'?'promo':'notification'))).html,[subject,body,purpose,data.systemTemplates]);

  useEffect(() => {
    let active = true;
    if (audience !== "selected" || search.length < 2) {
      setMatches([]);
      return;
    }
    const timer = setTimeout(() => {
      void searchEmailRecipients(search).then((rows) => {
        if (active) setMatches(rows);
      }).catch(() => {
        if (active) setMatches([]);
      });
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search, audience]);
  const refresh = async () => setData(await loadEmailCenter());
  const form = () => {
    const f = new FormData();
    for (const [k, v] of Object.entries({ subject, body, purpose, audience })) {
      f.set(k, v);
    }
    selected.forEach((u) => f.append("recipient", u.id));
    return f;
  };
  function chooseTemplate(id: string) {
    const t = data.templates.find((t) => t.id === id);
    setTemplateId(id);
    setTemplateName(t?.name || "");
    if (t) {
      setSubject(t.subject);
      setBody(t.body);
      setPurpose(t.purpose);
    }
  }
  function send() {
    start(async () => {
      setFeedback("");
      try {
        const f = form(), check = await previewAdminEmail(f);
        if (!check.ok) {
          setFeedback(check.message || "Alıcı sayı yoxlanılmadı.");
          return;
        }
        if (!check.count) {
          setFeedback("Bu seçimə uyğun və e-poçt icazəsi olan alıcı yoxdur.");
          return;
        }
        const confirm = await appAlert.confirm({
          title: "E-poçt göndərilsin?",
          message: `${
            audienceLabels[audience]
          } — ${check.count} nəfər. Mövzu: ${subject}`,
          confirmText: "Göndər",
          variant: "default",
        });
        if (!confirm.isConfirmed) return;
        requestId.current ??= crypto.randomUUID();
        f.set("requestId", requestId.current);
        const result = await queueAdminEmail(f);
        setFeedback(result.message);
        if (result.ok) {
          requestId.current = null;
          await refresh();
          setTab("history");
        }
      } catch {
        setFeedback(
          "Göndəriş cavabı alınmadı. Təkrar düyməsi eyni sorğunu yoxlayacaq; əvvəl tarixçəyə baxın.",
        );
      }
    });
  }
  function saveTemplate() {
    start(async () => {
      try {
        const f = form();
        f.set("name", templateName);
        f.set("id", templateId);
        const result = await saveEmailTemplate(f);
        setFeedback(result.message);
        if (result.ok) await refresh();
      } catch {
        setFeedback("Şablon saxlanılmadı. Bağlantını yoxlayın.");
      }
    });
  }
  function showRecipients(id: string, page: number) {
    start(async () => {
      try {
        setDetail({
          id,
          page,
          rows: await loadEmailCampaignRecipients(id, page),
        });
      } catch {
        setFeedback("Göndəriş detalları yüklənmədi.");
      }
    });
  }
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <Mail className="size-7 text-primary" />
            <h1 className="text-2xl font-bold sm:text-3xl">E-poçt mərkəzi</h1>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Alıcı və satıcı bildirişləri, hazır şablonlar və göndəriş tarixçəsi.
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-2 text-sm font-semibold ${
            data.enabled
              ? "bg-emerald-100 text-emerald-900"
              : "bg-amber-100 text-amber-950"
          }`}
        >
          {data.enabled ? "Göndəriş aktivdir" : "Göndəriş gözləyir"}
        </span>
      </div>
      <div className="rounded-xl border bg-card p-4 text-sm leading-6">
        <strong>Göndərən:</strong> no-reply@alisveris.az<br />
        <strong>Yeni qeydiyyat bildirişləri:</strong> {data.adminAddress}
        <br />Yeni sifariş və status məktubları müştəri və satıcıya ayrıca
        göndərilir. Şifrə bərpası Supabase Auth vasitəsilə işləyir.
      </div>
      {!data.available && (
        <p
          role="status"
          className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950"
        >
          E-poçt sistemi üçün verilənlər bazası quruluşu hələ tətbiq edilməyib.
          Göndəriş bu mərhələdə aktiv deyil.
        </p>
      )}
      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="E-poçt bölmələri"
      >
        {[["compose", "Məktub hazırla", Send], [
          "templates",
          "Hazır şablonlar",
          FileText,
        ], ["system", "Avtomatik məktublar", Settings2], ["history", "Göndəriş tarixçəsi", History]].map((
          [id, label, Icon]: any,
        ) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => {
              setTab(id);
              setFeedback("");
            }}
            className={`flex min-h-11 items-center gap-2 rounded-lg border px-4 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
              tab === id ? "bg-primary text-primary-foreground" : "bg-card"
            }`}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>
      <p role="status" aria-live="polite" className="text-sm font-medium">
        {feedback}
      </p>
      {tab === "system" ? <SystemTemplateEditor initialTemplates={data.systemTemplates||[]} available={data.systemAvailable}/> : tab !== "history"
        ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <fieldset
              disabled={pending || !data.available}
              className="min-w-0 space-y-4 rounded-xl border bg-card p-4 sm:p-6"
            >
              <label className="grid gap-2 text-sm font-semibold">
                Hazır şablon<select
                  className={field}
                  value={templateId}
                  onChange={(e) => chooseTemplate(e.target.value)}
                >
                  <option value="">Yeni məktub / yeni şablon</option>
                  {data.templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </label>
              {tab === "templates" && (
                <label className="grid gap-2 text-sm font-semibold">
                  Şablonun adı<input
                    className={field}
                    maxLength={120}
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                  />
                </label>
              )}
              <label className="grid gap-2 text-sm font-semibold">
                Məktubun növü<select
                  className={field}
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                >
                  <option value="service">Xidmət bildirişi</option>
                  <option value="marketing">Kampaniya və reklam</option>
                </select>
              </label>
              {tab === "compose" && (
                <>
                  <label className="grid gap-2 text-sm font-semibold">
                    Kimə göndərilsin?<select
                      className={field}
                      value={audience}
                      onChange={(e) => setAudience(e.target.value)}
                    >
                      {Object.entries(audienceLabels).map(([id, label]) => (
                        <option key={id} value={id}>{label}</option>
                      ))}
                    </select>
                  </label>
                  {audience === "selected" && (
                    <div className="space-y-2">
                      <label className="grid gap-2 text-sm">
                        E-poçtla istifadəçi axtar<input
                          className={field}
                          type="search"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="İlk 2 və ya daha çox simvol"
                        />
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {selected.map((u) => (
                          <button
                            type="button"
                            key={u.id}
                            className="flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm"
                            onClick={() =>
                              setSelected(
                                selected.filter((x) => x.id !== u.id),
                              )}
                          >
                            {u.email}
                            <X className="size-4" aria-label="Seçimdən çıxar" />
                          </button>
                        ))}
                      </div>
                      {matches.filter((u) =>
                        !selected.some((x) => x.id === u.id)
                      ).map((u) => (
                        <button
                          type="button"
                          key={u.id}
                          className="flex min-h-11 w-full flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-left text-sm"
                          onClick={() => {
                            setSelected([...selected, u]);
                            setSearch("");
                          }}
                        >
                          <span>{u.full_name || u.email}</span>
                          <span className="break-all text-muted-foreground">
                            {u.email}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
              <label className="grid gap-2 text-sm font-semibold">
                Mövzu<input
                  className={field}
                  maxLength={160}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Məktubun mətni<textarea
                  className={`${field} min-h-56 resize-y`}
                  maxLength={20000}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
              </label>
              <p className="text-sm text-muted-foreground">
                Dəyişənlər: {"{ad}"} — istifadəçinin adı, {"{magaza}"} — mağaza,
                {" "}
                {"{sayt}"}{" "}
                — sayt ünvanı. Reklam məktubları yalnız ayrıca icazə verənlərə
                gedir.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPreview(!preview)}
                  className="min-h-11"
                >
                  <Eye className="mr-2 size-4" />Önizləmə
                </Button>
                {tab === "templates"
                  ? (
                    <Button
                      type="button"
                      onClick={saveTemplate}
                      className="min-h-11"
                    >
                      Şablonu saxla
                    </Button>
                  )
                  : (
                    <Button
                      type="button"
                      disabled={!data.enabled || !subject || !body}
                      onClick={send}
                      className="min-h-11"
                    >
                      <Send className="mr-2 size-4" />
                      {pending ? "Yoxlanılır…" : "Yoxla və göndər"}
                    </Button>
                  )}
              </div>
            </fieldset>
            <section
              aria-label="Məktub önizləməsi"
              className={`min-w-0 rounded-xl border bg-white p-5 text-slate-900 ${
                preview ? "" : "hidden lg:block"
              }`}
            >
              <p className="mb-3 text-sm text-slate-500">Önizləmə • no-reply@alisveris.az</p>
              <iframe title="Kampaniyanın canlı görünüşü" sandbox="" srcDoc={campaignPreview} className="h-[650px] w-full border-0"/>
            </section>
          </div>
        )
        : (
          <section className="space-y-3 rounded-xl border bg-card p-4 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold">Son göndərişlər</h2>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    try {
                      await refresh();
                    } catch {
                      setFeedback("Tarixçə yenilənmədi.");
                    }
                  })}
                className="min-h-11"
              >
                <RefreshCw className="mr-2 size-4" />Yenilə
              </Button>
            </div>
            {!data.history.length && (
              <p className="py-8 text-center text-muted-foreground">
                Hələ göndəriş yoxdur.
              </p>
            )}
            {data.history.map((c) => (
              <article key={c.id} className="rounded-xl border p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="break-words font-bold">{c.subject}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {audienceLabels[c.audience]} •{" "}
                      {new Date(c.created_at).toLocaleString("az-AZ")}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    disabled={pending}
                    onClick={() =>
                      showRecipients(c.id, 0)}
                    className="min-h-11"
                  >
                    Alıcılar
                  </Button>
                </div>
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                  <span>Cəmi: {c.recipient_count}</span>
                  <span>Göndərilib: {c.sent}</span>
                  <span>Gözləyir: {c.pending}</span>
                  <span>Uğursuz: {c.failed}</span>
                  <span>Göndərilmədi: {c.skipped}</span>
                </div>
                {detail?.id === c.id && (
                  <div className="mt-4 space-y-2 border-t pt-3">
                    {detail.rows.map((r) => (
                      <div
                        key={r.id}
                        className="flex flex-wrap justify-between gap-2 rounded-lg bg-muted p-3 text-sm"
                      >
                        <span className="break-all">{r.to_address}</span>
                        <span>
                          {stateLabels[r.status] || r.status} •{" "}
                          {r.attempt_count} cəhd
                        </span>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        disabled={pending || detail.page === 0}
                        onClick={() =>
                          showRecipients(c.id, detail.page - 1)}
                      >
                        Əvvəlki
                      </Button>
                      <Button
                        variant="outline"
                        disabled={pending || detail.rows.length < 50}
                        onClick={() =>
                          showRecipients(c.id, detail.page + 1)}
                      >
                        Növbəti
                      </Button>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </section>
        )}
    </div>
  );
}
