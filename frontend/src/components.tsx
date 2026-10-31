import { useEffect, useRef, type ReactNode } from 'react';

export function ErrorNotice({ error }: { error: string }) {
  return error ? <div className="notice error" role="alert">{error}</div> : null;
}

export function ConfirmDialog({ title, children, busy, error, onConfirm, onCancel }: {
  title: string;
  children: ReactNode;
  busy: boolean;
  error: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  return <dialog ref={dialog} onCancel={(event) => { event.preventDefault(); if (!busy) onCancel(); }} aria-labelledby="confirm-title">
    <h2 id="confirm-title">{title}</h2>
    <p>{children}</p>
    <ErrorNotice error={error} />
    <div className="actions"><button className="secondary" onClick={onCancel} disabled={busy} autoFocus>Cancel</button><button className="danger" onClick={onConfirm} disabled={busy}>{busy ? 'Deleting…' : 'Delete'}</button></div>
  </dialog>;
}
