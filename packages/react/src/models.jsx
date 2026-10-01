"use client";

import { memo } from "react";
import { useT } from "./i18n/context";
import SchemaTree from "./schema-tree";

function Models({ schemas }) {
  const t = useT();
  if (schemas.length === 0) return null;

  return (
    <section className="py-14">
      <h2 className="text-3xl font-bold tracking-tight">{t("models.title")}</h2>
      <div className="mt-6 space-y-6">
        {schemas.map((item) => (
          <section key={item.name} id={item.anchor} data-anchor className="rounded-2xl border border-border p-5">
            <h3 className="font-mono text-base font-semibold [overflow-wrap:anywhere]">
              <a href={`#${item.anchor}`} className="hover:text-primary">
                {item.name}
              </a>
            </h3>
            <div className="mt-3">
              <SchemaTree schema={item.schema} modelName={item.name} />
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}

export default memo(Models);
