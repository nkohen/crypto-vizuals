// Just enough markdown for a territory map's prose sections (audit, ledger,
// sources, notes): paragraphs, `-` bullets (one level of nesting), `###`
// headings, and **bold** / *italic* / `code` inline. Output is the studio's
// Block format, so math in the map renders through the same KaTeX path.
import type { Block } from '../prework/types';

export function mdInline(s: string): string {
  return s
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*\w])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
}

export function mdToBlocks(md: string): Block[] {
  const out: Block[] = [];
  let para: string[] = [];
  let list: { kind: 'list'; ordered: boolean; items: Block[][] } | null = null;
  const flush = () => {
    if (para.length) out.push({ kind: 'para', text: mdInline(para.join(' ')) });
    para = [];
  };
  for (const raw of md.split('\n')) {
    const line = raw.trimEnd();
    const bullet = /^(\s*)[-*] (.*)$/.exec(line);
    if (bullet) {
      flush();
      const text = mdInline(bullet[2]);
      if (!list) {
        list = { kind: 'list', ordered: false, items: [] };
        out.push(list);
      }
      if (bullet[1].length >= 2 && list.items.length) {
        const parent = list.items[list.items.length - 1];
        const last = parent[parent.length - 1];
        if (last?.kind === 'list') last.items.push([{ kind: 'para', text }]);
        else parent.push({ kind: 'list', ordered: false, items: [[{ kind: 'para', text }]] });
      } else list.items.push([{ kind: 'para', text }]);
      continue;
    }
    if (/^\s+\S/.test(line) && list && list.items.length) {
      // continuation of a bullet
      const item = list.items[list.items.length - 1];
      const p = item[0];
      if (p.kind === 'para') p.text += ' ' + mdInline(line.trim());
      continue;
    }
    if (!line.trim()) {
      flush();
      list = null;
      continue;
    }
    list = null;
    const h = /^#{3,6} (.*)$/.exec(line);
    if (h) {
      flush();
      out.push({ kind: 'heading', text: mdInline(h[1]) });
      continue;
    }
    if (/^---+$/.test(line) || /^<!--.*-->$/.test(line)) continue;
    para.push(line.replace(/^>\s?/, ''));
  }
  flush();
  return out;
}
