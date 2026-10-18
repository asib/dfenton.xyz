interface MiscEntry {
  title: string;
  description: string;
  date: string;
  preview: string;
  previewDark?: string;
}

const previewFilename = /^[a-z0-9][a-z0-9-]*\.(svg|png|webp|jpe?g)$/;

const metadata = import.meta.glob<MiscEntry>('../public/misc/*/meta.json', {
  eager: true,
  import: 'default',
});

export const miscEntries = Object.entries(metadata).map(([path, entry]) => {
  const slug = path.split('/')[3];
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
      typeof entry.title !== 'string' || !entry.title.trim() ||
      typeof entry.description !== 'string' || !entry.description.trim() ||
      !/^\d{4}-\d{2}-\d{2}$/.test(entry.date) ||
      typeof entry.preview !== 'string' || !previewFilename.test(entry.preview) ||
      (entry.previewDark !== undefined && !previewFilename.test(entry.previewDark))) {
    throw new Error(`Invalid Misc metadata: ${path}`);
  }
  return { ...entry, href: `/misc/${slug}/` };
}).sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
