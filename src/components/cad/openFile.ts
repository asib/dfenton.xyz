// Generated files (PDFs and CSVs) open in a new tab instead of downloading, so they can be
// printed straight away or saved from there. If the browser blocks the tab, they download.

// A tab opened from the click itself, before any slow work, so pop-up blockers allow it.
export function openTab(title: string): Window | null {
  const tab = window.open('', '_blank');
  if (tab) {
    tab.document.title = title;
    tab.document.body.style.font = '14px system-ui, sans-serif';
    tab.document.body.textContent = `Preparing ${title}…`;
  }
  return tab;
}

export function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => { URL.revokeObjectURL(url); }, 1000);
}

// Show a PDF in the browser's viewer, whose toolbar prints and saves it. The URL stays valid
// while this page is open, so the viewer can save it later.
export function showPdf(tab: Window | null, blob: Blob, filename: string): 'opened' | 'downloaded' {
  if (!tab || tab.closed) { download(blob, filename); return 'downloaded'; }
  tab.location.replace(URL.createObjectURL(blob));
  return 'opened';
}

const escape = (text: string) => text.replace(/[&<>"']/g, c => `&#${String(c.charCodeAt(0))};`);

// A CSV as a printable table, with buttons to download the file itself or print. Rows of one
// cell (titles and notes) span the table; empty rows separate sections.
export function showTable(rows: (string | number)[][], csv: string, filename: string, title: string): 'opened' | 'downloaded' {
  const file = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const columns = Math.max(...rows.map(row => row.length));
  const body = rows.map(row => row.length === 0 ? '<tr class="gap"><td colspan="' + String(columns) + '"></td></tr>'
    : row.length === 1 ? `<tr class="note"><td colspan="${String(columns)}">${escape(String(row[0]))}</td></tr>`
    : `<tr>${row.map(cell => `<td${typeof cell === 'number' ? ' class="number"' : ''}>${escape(String(cell))}</td>`).join('')}</tr>`).join('\n');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)}</title><style>
body { font: 13px/1.45 system-ui, sans-serif; color: #111; background: #fff; margin: 24px; }
header { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-bottom: 16px; }
header strong { margin-right: auto; }
header a, header button { font: inherit; padding: 6px 12px; border: 1px solid #888; border-radius: 3px; background: #fff; color: #111; text-decoration: none; cursor: pointer; }
table { border-collapse: collapse; }
td { border: 1px solid #bbb; padding: 3px 8px; vertical-align: top; }
td.number { text-align: right; font-variant-numeric: tabular-nums; }
tr.note td { border: 0; padding: 6px 0 2px; }
tr.gap td { border: 0; height: 10px; }
@media print { body { margin: 0; font-size: 10px; } header { display: none; } }
</style></head><body>
<header><strong>${escape(filename)}</strong><a href="${URL.createObjectURL(file)}" download="${escape(filename)}">Download CSV</a><button type="button" onclick="print()">Print</button></header>
<table>${body}</table>
</body></html>`;
  const tab = window.open(URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' })), '_blank');
  if (!tab) { download(file, filename); return 'downloaded'; }
  return 'opened';
}
