import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { api, errorMessage } from '../api';
import { useAuth } from '../auth';
import { ErrorNotice } from '../components';

export function AuthPage({ register = false }: { register?: boolean }) {
  const { user, loading, error: authError, login, refresh } = useAuth();
  const location = useLocation();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [registered, setRegistered] = useState(false);
  const from: unknown = location.state?.from;
  const destination = typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') && !['/login', '/register'].includes(from) ? from : '/';
  if (loading) return <main className="auth-shell"><p role="status">Checking your account…</p></main>;
  if (user) return <Navigate to={destination} replace />;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email')).trim();
    const password = String(form.get('password'));
    setBusy(true);
    setError('');
    try {
      if (register && !registered) {
        await api.register({ name: String(form.get('name')).trim(), email, password });
        setRegistered(true);
      }
      await login(email, password);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }

  return <main className="auth-shell">
    <Link className="brand" to="/">Recipe<span>Book</span></Link>
    <section className="panel auth-panel">
      <p className="eyebrow">A place for your favorites</p>
      <h1>{register ? 'Start your recipe book' : 'Welcome back'}</h1>
      <p className="muted">{register ? 'Save the recipes you love and make them your own.' : 'Your next good meal starts here.'}</p>
      <ErrorNotice error={error || authError} />
      {authError && <button className="secondary" onClick={refresh}>Retry account check</button>}
      {registered && <p role="status" className="notice">Your account was created. If login failed, retry below or use the login page.</p>}
      <form onSubmit={submit}>
        <fieldset disabled={busy}>
          {register && <label>Name<input name="name" autoComplete="name" required maxLength={255} /></label>}
          <label>Email<input type="email" name="email" autoComplete="email" required maxLength={255} /></label>
          <label>Password<input type="password" name="password" autoComplete={register ? 'new-password' : 'current-password'} required minLength={register ? 5 : undefined} /></label>
          {register && <p className="hint">Use at least 5 characters.</p>}
          <button className="wide" type="submit">{busy ? 'Please wait…' : register && !registered ? 'Create account' : 'Log in'}</button>
        </fieldset>
      </form>
      <p className="auth-switch">{register ? 'Already have an account?' : 'New here?'} <Link to={register ? '/login' : '/register'} state={location.state}>{register ? 'Log in' : 'Create an account'}</Link></p>
    </section>
  </main>;
}

export function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    const password = String(form.get('password'));
    setError('');
    setSuccess('');
    if (password !== String(form.get('confirmPassword'))) {
      setError('The new passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      const profile = await api.updateProfile({
        name: String(form.get('name')).trim(), email: String(form.get('email')).trim(),
        ...(password ? { password } : {}),
      });
      updateUser(profile);
      element.querySelectorAll<HTMLInputElement>('input[type="password"]').forEach((input) => { input.value = ''; });
      setSuccess(password ? 'Profile and password updated.' : 'Profile updated.');
    } catch (failure) {
      setError(errorMessage(failure));
    } finally { setBusy(false); }
  }

  return <>
    <div className="page-heading"><div><p className="eyebrow">Your account</p><h1>Profile</h1><p className="muted">Keep your details up to date.</p></div></div>
    <section className="panel narrow">
      <ErrorNotice error={error} />
      {success && <p className="notice" role="status">{success}</p>}
      <form onSubmit={submit}>
        <fieldset disabled={busy}>
          <label>Name<input name="name" autoComplete="name" defaultValue={user?.name} required maxLength={255} /></label>
          <label>Email<input type="email" name="email" autoComplete="email" defaultValue={user?.email} required maxLength={255} /></label>
          <h2>Change password</h2><p className="hint">Leave both fields blank to keep your current password.</p>
          <label>New password<input type="password" name="password" autoComplete="new-password" minLength={5} /></label>
          <label>Confirm new password<input type="password" name="confirmPassword" autoComplete="new-password" minLength={5} /></label>
          <button type="submit">{busy ? 'Saving…' : 'Save profile'}</button>
        </fieldset>
      </form>
    </section>
  </>;
}
