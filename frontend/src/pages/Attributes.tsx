import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, errorMessage } from '../api';
import { ConfirmDialog, ErrorNotice } from '../components';
import type { Attribute, AttributeKind } from '../types';

function AttributeRow({ item, kind, onSaved, onDelete }: { item: Attribute; kind: AttributeKind; onSaved: (value: Attribute) => void; onDelete: () => void }) {
  const [name, setName] = useState(item.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(''); setSuccess('');
    try {
      const result = await api.renameAttribute(kind, item.id, name.trim());
      onSaved(result); setName(result.name); setSuccess('Saved.');
    } catch (failure) { setError(errorMessage(failure)); }
    finally { setBusy(false); }
  }
  return <li className="attribute-row">
    <form onSubmit={save}><label className="grow">Name<input aria-label={`Rename ${item.name}`} required maxLength={255} value={name} onChange={(event) => setName(event.target.value)} disabled={busy} /></label>
      <button type="submit" className="secondary" disabled={busy || name.trim() === item.name}>{busy ? 'Saving…' : 'Rename'}</button>
      <button type="button" className="danger-outline" onClick={onDelete} disabled={busy}>Delete</button>
    </form><ErrorNotice error={error} />{success && <p role="status" className="hint">{success}</p>}
  </li>;
}

export function AttributesPage({ kind }: { kind: AttributeKind }) {
  const [items, setItems] = useState<Attribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [revision, setRevision] = useState(0);
  const [deleting, setDeleting] = useState<Attribute | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    api.attributes(kind).then((result) => { if (active) setItems(result); })
      .catch((failure: unknown) => { if (active) setError(errorMessage(failure)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [kind, revision]);
  async function remove() {
    if (!deleting) return;
    setBusy(true); setDeleteError(''); setSuccess('');
    try {
      await api.deleteAttribute(kind, deleting.id);
      setItems((previous) => previous.filter((item) => item.id !== deleting.id));
      setSuccess(`${deleting.name} deleted.`); setDeleting(null);
    } catch (failure) { setDeleteError(errorMessage(failure)); }
    finally { setBusy(false); }
  }
  return <>
    <div className="page-heading"><div><p className="eyebrow">Keep things organized</p><h1>{kind === 'tags' ? 'Tags' : 'Ingredients'}</h1><p className="muted">Add and assign {kind} in a <Link to="/recipes/new">recipe form</Link>. Rename or remove them here.</p></div></div>
    <ErrorNotice error={error} />{error && <button onClick={() => setRevision((value) => value + 1)}>Try again</button>}
    {success && <p role="status" className="notice">{success}</p>}
    {loading ? <p role="status">Loading {kind}…</p> : !error && <section className="panel narrow">
      {items.length ? <ul className="attribute-list">{items.map((item) => <AttributeRow key={item.id} item={item} kind={kind} onSaved={(result) => setItems((previous) => previous.map((value) => value.id === result.id ? result : value))} onDelete={() => { setDeleting(item); setDeleteError(''); }} />)}</ul> : <div className="empty"><h2>No {kind} yet</h2><p className="muted">They will appear here after you add them to a recipe.</p><Link to="/recipes/new">Create a recipe →</Link></div>}
    </section>}
    {deleting && <ConfirmDialog title={`Delete ${deleting.name}?`} busy={busy} error={deleteError} onConfirm={remove} onCancel={() => setDeleting(null)}>This removes it from all your recipes. The recipes themselves will stay.</ConfirmDialog>}
  </>;
}
