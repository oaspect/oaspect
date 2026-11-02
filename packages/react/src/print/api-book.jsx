// An OpenAPI document as a book: an introduction (description, servers,
// authentication), one chapter per tag with a numbered section per
// operation, webhooks, the models as an appendix, then the references.
import {
  anchorHeadings,
  buildRequest,
  defaultBody,
  defaultValues,
  describeScheme,
  flattenSchema,
  jsonMediaType,
  mediaExample,
  parseInline,
  parseMarkdown,
  plainText,
  resolveSchema,
  resolveSnippet,
  selectLocale,
  serverUrl,
  typeLabel,
} from "@oaspect/core";
import { bookId, BookBlocks, bookState, numberBlocks } from "./blocks";
import { BookTable } from "./book";

const inlineText = (value) => plainText(parseInline(String(value ?? "")));

function markdown(source, locale, prefix) {
  return anchorHeadings(selectLocale(parseMarkdown(source), locale), prefix, 4);
}

// Sections of a chapter for the contents: its numbered h2 headings.
function sectionsOf(blocks) {
  const sections = [];
  const visit = (list) => {
    for (const block of list) {
      if (block.type === "lang-selected") visit(block.children);
      else if (block.type === "heading" && block.level === 2 && block.anchor) {
        sections.push({ id: bookId(block.anchor), title: plainText(block.children), num: block.num });
      }
    }
  };
  visit(blocks);
  return sections;
}

function Description({ text, notes }) {
  return (
    <>
      {inlineText(text)}
      {notes?.length > 0 && (
        <span className="notes">
          {text ? " " : ""}({notes.join("; ")})
        </span>
      )}
    </>
  );
}

const pretty = (value) => (typeof value === "string" ? value : JSON.stringify(value, null, 2));

/**
 * @param {{ model, spec, t, localized, locale, meta? }} input
 * @returns {{ meta, chapters, references }}
 */
export function apiBook({ model, spec, t, localized, locale, meta = {} }) {
  const state = bookState();
  const chapters = [];
  const yesNo = (value) => (value ? t("print.yes") : t("print.no"));
  const server = model.servers[0];

  const table = (title, columns, rows, note) => {
    state.tables += 1;
    return <BookTable key={`table-${state.tables}`} label={state.tables} title={title} columns={columns} rows={rows} note={note} t={t} />;
  };

  const fieldsTable = (title, schema) => {
    const rows = flattenSchema(spec, schema);
    if (rows.length === 0) return null;
    return table(
      title,
      [t("print.name"), t("print.type"), t("print.required"), t("print.description")],
      rows.map((row) => [
        <span className="mono">{row.name}</span>,
        <span className="mono">{row.type}</span>,
        yesNo(row.required),
        <Description text={row.description} notes={row.notes} />,
      ]),
    );
  };

  // 1. Introduction
  {
    const number = chapters.length + 1;
    const sections = { h2: 0, h3: 0 };
    const blocks = numberBlocks(markdown(localized(model.info, "description"), locale, "introduction"), state, { chapter: number, sections, title: localized(model.info, "title") });
    const extra = [];
    if (model.servers.length > 0) {
      extra.push(<h2 key="servers-h" id={bookId("print/servers")}><span className="num">{`${number}.${++sections.h2}`}</span>{t("print.servers")}</h2>);
      extra.push(
        table(
          t("print.servers"),
          ["URL", t("print.description")],
          model.servers.map((item) => [<span className="mono">{serverUrl(item)}</span>, inlineText(localized(item, "description"))]),
        ),
      );
    }
    const schemes = Object.entries(model.securitySchemes ?? {});
    if (schemes.length > 0) {
      extra.push(<h2 key="security-h" id={bookId("print/security")}><span className="num">{`${number}.${++sections.h2}`}</span>{t("print.security")}</h2>);
      extra.push(
        table(
          t("print.security"),
          [t("print.name"), t("print.type"), t("print.description")],
          schemes.map(([name, scheme]) => [<span className="mono">{name}</span>, describeScheme(scheme), inlineText(localized(scheme, "description"))]),
        ),
      );
    }
    chapters.push({
      id: bookId("introduction"),
      label: `${t("print.chapter")} ${number}`,
      title: t("sidebar.introduction"),
      sections: [
        ...sectionsOf(blocks),
        ...(model.servers.length ? [{ id: bookId("print/servers"), title: t("print.servers") }] : []),
        ...(schemes.length ? [{ id: bookId("print/security"), title: t("print.security") }] : []),
      ],
      content: (
        <>
          <BookBlocks blocks={blocks} t={t} />
          {extra}
        </>
      ),
    });
  }

  // An operation: a numbered section with its endpoint, description and tables.
  const operationSection = (op, num) => {
    const summary = localized(op, "summary") || `${op.method.toUpperCase()} ${op.path}`;
    const description = numberBlocks(markdown(localized(op, "description"), locale, op.anchor), state, { shift: 1, title: summary });
    const parts = [];
    if (op.parameters.length > 0) {
      parts.push(
        table(
          `${summary}: ${t("print.parameters")}`,
          [t("print.name"), t("print.in"), t("print.type"), t("print.required"), t("print.description")],
          op.parameters.map((parameter) => [
            <span className="mono">{parameter.name}</span>,
            parameter.in,
            <span className="mono">{typeLabel(spec, resolveSchema(spec, parameter.schema ?? {}).schema)}</span>,
            yesNo(parameter.required),
            <Description text={localized(parameter, "description")} notes={parameter.deprecated ? ["deprecated"] : []} />,
          ]),
        ),
      );
    }
    const bodyContent = op.requestBody?.content ?? {};
    const bodyType = jsonMediaType(bodyContent) ?? Object.keys(bodyContent)[0];
    if (bodyType && bodyContent[bodyType]?.schema) {
      parts.push(fieldsTable(`${summary}: ${t("print.requestBody")} (${bodyType})`, bodyContent[bodyType].schema));
    }
    if (op.responses.length > 0) {
      parts.push(
        table(
          `${summary}: ${t("print.responses")}`,
          [t("print.status"), t("print.description")],
          op.responses.map((response) => [<span className="mono">{response.status}</span>, inlineText(localized(response, "description"))]),
        ),
      );
    }
    let curl = null;
    if (op.kind === "operation") {
      try {
        const request = buildRequest(op, { server, values: defaultValues(spec, op), ...defaultBody(spec, op) });
        curl = resolveSnippet("shell:curl").client.build(request);
      } catch {
        curl = null;
      }
    }
    const success = op.responses.find((response) => /^2/.test(response.status)) ?? op.responses[0];
    const successType = success && jsonMediaType(success.content);
    const responseExample = successType ? mediaExample(spec, success.content[successType]) : undefined;
    const payloadType = op.kind !== "operation" && jsonMediaType(bodyContent);
    const payload = payloadType ? mediaExample(spec, bodyContent[payloadType]) : undefined;

    return (
      <section key={op.anchor} className="operation">
        <h2 id={bookId(op.anchor)}>
          <span className="num">{num}</span>
          {summary}
        </h2>
        <p className="endpoint">
          <span className="method">{op.method.toUpperCase()}</span>
          {op.path}
          {op.deprecated && <span className="notes"> ({t("print.deprecated")})</span>}
        </p>
        <BookBlocks blocks={description} t={t} />
        {parts}
        {curl && (
          <>
            <h4>{t("print.exampleRequest")}</h4>
            <pre>
              <code>{curl}</code>
            </pre>
          </>
        )}
        {payload !== undefined && (
          <>
            <h4>{t("print.examplePayload")}</h4>
            <pre>
              <code>{pretty(payload)}</code>
            </pre>
          </>
        )}
        {responseExample !== undefined && (
          <>
            <h4>
              {t("print.exampleResponse")} ({success.status})
            </h4>
            <pre>
              <code>{pretty(responseExample)}</code>
            </pre>
          </>
        )}
      </section>
    );
  };

  // 2. One chapter per tag (guide tags are prose only), then webhooks.
  const groups = [
    ...model.tags.map((tag) => ({ anchor: tag.anchor, title: tag.label ?? localized(tag, "name"), description: localized(tag, "description"), operations: tag.operations })),
    ...(model.webhooks?.length ? [{ anchor: "webhooks", title: t("webhooks.title"), description: "", operations: model.webhooks }] : []),
  ];
  for (const group of groups) {
    const number = chapters.length + 1;
    const sections = { h2: 0, h3: 0 };
    const blocks = numberBlocks(markdown(group.description, locale, group.anchor), state, { chapter: number, sections, title: group.title });
    const operations = group.operations.map((op) => {
      sections.h2 += 1;
      return { op, num: `${number}.${sections.h2}` };
    });
    chapters.push({
      id: bookId(group.anchor),
      label: `${t("print.chapter")} ${number}`,
      title: group.title,
      sections: [
        ...sectionsOf(blocks),
        ...operations.map(({ op, num }) => ({ id: bookId(op.anchor), title: localized(op, "summary") || `${op.method.toUpperCase()} ${op.path}`, num })),
      ],
      content: (
        <>
          <BookBlocks blocks={blocks} t={t} />
          {operations.map(({ op, num }) => operationSection(op, num))}
        </>
      ),
    });
  }

  // 3. Appendix A: models
  if (model.schemas.length > 0) {
    chapters.push({
      id: bookId("print/models"),
      label: `${t("print.appendix")} A`,
      title: t("print.models"),
      sections: model.schemas.map((item, index) => ({ id: bookId(item.anchor), title: item.name, num: `A.${index + 1}` })),
      content: model.schemas.map((item, index) => {
        const description = localized(item.schema, "description");
        const fields = fieldsTable(item.name, item.schema);
        return (
          <section key={item.name} className="model">
            <h2 id={bookId(item.anchor)}>
              <span className="num">{`A.${index + 1}`}</span>
              <span className="mono">{item.name}</span>
            </h2>
            {description && <p>{inlineText(description)}</p>}
            {fields ?? <p className="endpoint">{typeLabel(spec, item.schema)}</p>}
          </section>
        );
      }),
    });
  }

  const info = model.info ?? {};
  return {
    meta: {
      kicker: t("print.kicker"),
      title: localized(info, "title") || "API",
      subtitle: inlineText(localized(info, "summary") ?? ""),
      version: info.version,
      organization: info.contact?.name,
      contact: [info.contact?.email, info.contact?.url].filter(Boolean).join(" · "),
      summary: inlineText(localized(info, "summary") || plainText(selectLocale(parseMarkdown(localized(info, "description")), locale).find((block) => block.type === "paragraph")?.children ?? [])),
      date: new Date().toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" }),
      ...meta,
    },
    chapters,
    references: [...state.references],
  };
}
