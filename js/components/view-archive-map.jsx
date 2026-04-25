// ArchiveMapView — visual map of all forms archived to Drive.
// Groups by: form type → site (job) → date. No links, no actions.
// Reads from `forms` prop, filters to status === 'archived'.

function ArchiveMapView({ forms = [] }) {
  const archived = (forms || []).filter(f => f && f.status === 'archived');

  const TYPE_META = {
    prestart:    { label: 'Pre-Start',     emoji: '\u{1F4CB}', color: 'bg-green-500',  bg: 'bg-green-50',  text: 'text-green-700' },
    inspection:  { label: 'Inspection',    emoji: '\u{1F50D}', color: 'bg-blue-500',   bg: 'bg-blue-50',   text: 'text-blue-700' },
    itp:         { label: 'ITP',           emoji: '\u{1F4DD}', color: 'bg-indigo-500', bg: 'bg-indigo-50', text: 'text-indigo-700' },
    'steel-itp': { label: 'Steel ITP',     emoji: '\u{1F529}', color: 'bg-slate-600',  bg: 'bg-slate-50',  text: 'text-slate-700' },
    incident:    { label: 'Incident',      emoji: '\u{26A0}',  color: 'bg-red-500',    bg: 'bg-red-50',    text: 'text-red-700' },
    toolbox:     { label: 'Toolbox Talk',  emoji: '\u{1F6E0}', color: 'bg-purple-500', bg: 'bg-purple-50', text: 'text-purple-700' },
  };

  const HEADER_EMOJI = '\u{1F5C2}\u{FE0F}';
  const EMPTY_EMOJI = '\u{1F4C2}';
  const PIN_EMOJI = '\u{1F4CD}';
  const BULLET = '\u2022';
  const MIDDOT = '\u00B7';

  const siteOf = (f) => (f.data && (f.data.siteConducted || f.data.site)) || 'Unsorted';
  const dateOf = (f) => f.archivedAt || f.createdAt || null;
  const fmtDate = (iso) => {
    if (!iso) return '\u2014';
    try {
      return new Date(iso).toLocaleString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (_) { return iso; }
  };

  // Group: type → site → forms[]
  const tree = {};
  archived.forEach(f => {
    const type = f.type || 'unknown';
    const site = siteOf(f);
    if (!tree[type]) tree[type] = {};
    if (!tree[type][site]) tree[type][site] = [];
    tree[type][site].push(f);
  });
  Object.keys(tree).forEach(type => {
    Object.keys(tree[type]).forEach(site => {
      tree[type][site].sort((a, b) => new Date(dateOf(b) || 0) - new Date(dateOf(a) || 0));
    });
  });

  const totalArchived = archived.length;
  const knownTypes = Object.keys(TYPE_META).filter(t => tree[t]);
  // Include any types the tree has but TYPE_META doesn't — so unknown/future
  // form types still show up instead of silently disappearing from the view.
  const unknownTypes = Object.keys(tree).filter(t => !TYPE_META[t]);
  const orderedTypes = [...knownTypes, ...unknownTypes];
  const FALLBACK_META = { label: 'Other', emoji: '\u{1F4C4}', color: 'bg-gray-500', bg: 'bg-gray-50', text: 'text-gray-700' };

  return (
    <div className="space-y-4">
      <div className="bg-amber-500 rounded-xl p-4 text-white shadow-sm">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <span className="text-2xl">{HEADER_EMOJI}</span> Drive Archive
        </h2>
        <p className="text-amber-50 text-sm mt-1">
          {totalArchived === 0
            ? 'No forms archived yet. When a site has more than 3 forms, the oldest gets backed up to Drive automatically.'
            : (totalArchived + ' form' + (totalArchived === 1 ? '' : 's') + ' backed up to Google Drive')}
        </p>
      </div>

      {totalArchived === 0 ? (
        <div className="bg-white rounded-xl p-6 shadow-sm text-center">
          <div className="text-5xl mb-2">{EMPTY_EMOJI}</div>
          <p className="text-gray-600">Nothing here yet.</p>
          <p className="text-gray-400 text-sm mt-1">Forms appear here once they have been auto-archived to Drive.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orderedTypes.map(type => {
            const meta = TYPE_META[type] || { ...FALLBACK_META, label: type ? type.replace(/-/g, ' ') : 'Other' };
            const sites = Object.keys(tree[type]).sort();
            const typeCount = sites.reduce((n, s) => n + tree[type][s].length, 0);
            return (
              <div key={type} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className={meta.color + ' px-4 py-3 flex items-center gap-3 text-white'}>
                  <span className="text-2xl leading-none">{meta.emoji}</span>
                  <div className="flex-1">
                    <p className="font-semibold leading-tight">{meta.label}</p>
                    <p className="text-xs opacity-90">{typeCount} form{typeCount === 1 ? '' : 's'} {MIDDOT} {sites.length} site{sites.length === 1 ? '' : 's'}</p>
                  </div>
                </div>
                <div className="divide-y">
                  {sites.map(site => {
                    const list = tree[type][site];
                    return (
                      <div key={site} className="p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ' + meta.bg + ' ' + meta.text}>
                            <span>{PIN_EMOJI}</span>{site}
                          </span>
                          <span className="text-xs text-gray-400">{list.length} form{list.length === 1 ? '' : 's'}</span>
                        </div>
                        <ul className="ml-4 space-y-1">
                          {list.map(f => (
                            <li key={f.id} className="flex items-start gap-2 text-sm">
                              <span className="text-gray-300 mt-0.5">{BULLET}</span>
                              <div className="flex-1 min-w-0">
                                <span className="text-gray-700">{fmtDate(dateOf(f))}</span>
                                {f.archivedByName && (
                                  <span className="text-gray-400 text-xs ml-2">archived by {f.archivedByName}</span>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800">
        <p><strong>How this works:</strong> When a site reaches 4 forms, the oldest one is uploaded to your Google Drive (under <code>J&M Artsteel Safety / Archive / [site name]</code>) and removed from the live list. The PDFs in Drive are the source of truth — this map just shows what is in there without leaving the app.</p>
      </div>
    </div>
  );
}

window.ArchiveMapView = ArchiveMapView;
