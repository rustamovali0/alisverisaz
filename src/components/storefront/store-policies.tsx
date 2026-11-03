import {
  storePolicyFields,
  type StorePolicies as Policies,
} from "@/lib/store-settings/policies";

export function StorePolicies({ policies }: { policies?: Policies }) {
  if (!policies || !storePolicyFields.some(({ key }) => policies[key]))
    return null;

  return (
    <section className="min-w-0 rounded-xl border bg-card p-4 sm:p-5">
      <h2 className="text-lg font-semibold">Alış şərtləri</h2>
      <dl className="mt-3 grid gap-4">
        {storePolicyFields.map(
          ({ key, label }) =>
            policies[key] && (
              <div key={key}>
                <dt className="font-medium">{label}</dt>
                <dd className="mt-1 whitespace-pre-line break-words text-sm leading-6 text-muted-foreground">
                  {policies[key]}
                </dd>
              </div>
            ),
        )}
      </dl>
    </section>
  );
}
