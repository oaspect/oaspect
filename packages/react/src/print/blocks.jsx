// Markdown for the printed book: plain elements (no Tailwind), headings
// numbered per chapter, tables and Mermaid diagrams numbered across the book
// with a caption above (the nearest heading is the caption's title), and
// external links collected for the references.
import { plainText } from "@oaspect/core";

/**
 * Numbering state shared by the whole book: tables, figures, references.
 * @returns {{ tables: number, figures: number, references: Map<string, string> }}
 */
export function bookState() {
  return { tables: 0, figures: 0, references: new Map() };
}

/** Element ids of the book: Paged.js resolves page references by selector, so only safe characters. */
export const bookId = (anchor) => `b-${String(anchor).replace(/[^A-Za-z0-9_-]/g, "-")}`;

function decodeHash(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function collectLinks(nodes, state) {
  for (const node of nodes) {
    if (node.type === "link" && /^https?:/i.test(node.href) && !state.references.has(node.href)) {
      state.references.set(node.href, plainText(node.children) || node.href);
    }
    if (node.children) collectLinks(node.children, state);
  }
}

/**
 * Numbers headings ("2.1", "2.1.1"), tables and figures in reading order.
 * `shift` moves heading levels down (an operation's description sits under
 * its own section heading). Returns new blocks; headings get `num`, tables
 * and Mermaid blocks get `label` (number) and `caption` (nearest heading).
 */
export function numberBlocks(blocks, state, { chapter = null, shift = 0, sections = { h2: 0, h3: 0 }, title = "" } = {}) {
  let caption = title;
  const visit = (list) =>
    list.map((block) => {
      switch (block.type) {
        case "lang-selected":
          return { ...block, children: visit(block.children) };
        case "heading": {
          const level = Math.min(block.level + shift, 6);
          caption = plainText(block.children);
          collectLinks(block.children, state);
          let num;
          if (chapter !== null && shift === 0 && level === 2) {
            sections.h2 += 1;
            sections.h3 = 0;
            num = `${chapter}.${sections.h2}`;
          } else if (chapter !== null && shift === 0 && level === 3 && sections.h2) {
            sections.h3 += 1;
            num = `${chapter}.${sections.h2}.${sections.h3}`;
          }
          return { ...block, level, ...(num ? { num } : {}) };
        }
        case "table":
          state.tables += 1;
          [...block.header, ...block.rows.flat()].forEach((cell) => collectLinks(cell, state));
          return { ...block, label: state.tables, caption };
        case "code":
          if (block.language === "mermaid") {
            state.figures += 1;
            return { ...block, label: state.figures, caption };
          }
          return block;
        case "paragraph":
          collectLinks(block.children, state);
          return block;
        case "blockquote":
          return { ...block, children: visit(block.children) };
        case "list":
          return { ...block, items: block.items.map((item) => ({ ...item, children: visit(item.children) })) };
        default:
          return block;
      }
    });
  return visit(blocks);
}

export function Caption({ kind, label, title, t }) {
  return (
    <figcaption>
      <span className="label">
        {kind === "figure" ? t("print.figure") : t("print.table")} {label}
      </span>
      {title && <span className="title">{title}</span>}
    </figcaption>
  );
}

// Links: in-book anchors (#…) show the page they point to; web links print
// their address; other relative links stay plain text.
function Inline({ nodes, resolveLink }) {
  return nodes.map((node, index) => {
    switch (node.type) {
      case "text":
        return node.value;
      case "br":
        return <br key={index} />;
      case "code":
        return <code key={index}>{node.value}</code>;
      case "strong":
        return (
          <strong key={index}>
            <Inline nodes={node.children} resolveLink={resolveLink} />
          </strong>
        );
      case "em":
        return (
          <em key={index}>
            <Inline nodes={node.children} resolveLink={resolveLink} />
          </em>
        );
      case "del":
        return (
          <del key={index}>
            <Inline nodes={node.children} resolveLink={resolveLink} />
          </del>
        );
      case "link": {
        const target = resolveLink?.(node.href) ?? node.href;
        const href = /^#./.test(target) ? `#${bookId(decodeHash(target.slice(1)))}` : target;
        const content = <Inline nodes={node.children} resolveLink={resolveLink} />;
        if (/^#./.test(href)) return <a key={index} className="internal" href={href}>{content}</a>;
        if (/^https?:/i.test(href)) {
          const label = plainText(node.children);
          return <a key={index} className={label === href ? undefined : "external"} href={href}>{content}</a>;
        }
        return <span key={index}>{content}</span>;
      }
      case "image":
        return /^https?:/i.test(node.src) ? <img key={index} src={node.src} alt={node.alt} style={{ maxWidth: "100%" }} /> : node.alt;
      default:
        return null;
    }
  });
}

export function BookBlocks({ blocks, t, resolveLink }) {
  return blocks.map((block, index) => {
    switch (block.type) {
      case "heading": {
        const Tag = `h${Math.max(2, Math.min(block.level, 4))}`;
        return (
          <Tag key={index} id={block.anchor ? bookId(block.anchor) : undefined}>
            {block.num && <span className="num">{block.num}</span>}
            <Inline nodes={block.children} resolveLink={resolveLink} />
          </Tag>
        );
      }
      case "paragraph":
        return (
          <p key={index}>
            <Inline nodes={block.children} resolveLink={resolveLink} />
          </p>
        );
      case "code":
        if (block.language === "mermaid") {
          return (
            <figure key={index} className="figure">
              <Caption kind="figure" label={block.label} title={block.caption} t={t} />
              <pre data-mermaid="pending">{block.text}</pre>
            </figure>
          );
        }
        return (
          <pre key={index}>
            <code>{block.text}</code>
          </pre>
        );
      case "blockquote":
        return (
          <blockquote key={index}>
            <BookBlocks blocks={block.children} t={t} resolveLink={resolveLink} />
          </blockquote>
        );
      case "hr":
        return <hr key={index} />;
      case "lang-selected":
        return <BookBlocks key={index} blocks={block.children} t={t} resolveLink={resolveLink} />;
      case "list": {
        const List = block.ordered ? "ol" : "ul";
        return (
          <List key={index} start={block.ordered && block.start !== 1 ? block.start : undefined}>
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex}>
                {item.checked !== null && (item.checked ? "☑ " : "☐ ")}
                {item.children.length === 1 && item.children[0].type === "paragraph" ? (
                  <Inline nodes={item.children[0].children} resolveLink={resolveLink} />
                ) : (
                  <BookBlocks blocks={item.children} t={t} resolveLink={resolveLink} />
                )}
              </li>
            ))}
          </List>
        );
      }
      case "table":
        return (
          <figure key={index} className="table">
            <Caption kind="table" label={block.label} title={block.caption} t={t} />
            <table>
              <thead>
                <tr>
                  {block.header.map((cell, cellIndex) => (
                    <th key={cellIndex} style={block.align[cellIndex] ? { textAlign: block.align[cellIndex] } : undefined}>
                      <Inline nodes={cell} resolveLink={resolveLink} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} style={block.align[cellIndex] ? { textAlign: block.align[cellIndex] } : undefined}>
                        <Inline nodes={cell} resolveLink={resolveLink} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </figure>
        );
      default:
        return null;
    }
  });
}
