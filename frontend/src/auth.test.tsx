import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { api, getToken, setToken } from './api';
import { AuthProvider, ProtectedRoute, useAuth } from './auth';

beforeEach(() => localStorage.clear());
afterEach(() => cleanup());

function PrivatePage() {
  const { user, logout } = useAuth();
  return <><p>Private recipes for {user?.name}</p><button onClick={logout}>Log out</button></>;
}

function mount() {
  return render(<MemoryRouter initialEntries={['/recipes/4']}><AuthProvider><Routes>
    <Route path="/login" element={<p>Login screen</p>} />
    <Route element={<ProtectedRoute />}><Route path="/recipes/4" element={<PrivatePage />} /></Route>
  </Routes></AuthProvider></MemoryRouter>);
}

it('redirects anonymous visitors without rendering private data', async () => {
  const me = vi.spyOn(api, 'me');
  mount();
  await screen.findByText('Login screen');
  expect(me).not.toHaveBeenCalled();
  expect(screen.queryByText(/Private recipes/)).toBeNull();
});

it('restores a saved token after refresh and clears the private screen on logout', async () => {
  setToken('saved');
  vi.spyOn(api, 'me').mockResolvedValue({ name: 'Cook', email: 'cook@example.com' });
  mount();
  await screen.findByText('Private recipes for Cook');
  fireEvent.click(screen.getByRole('button', { name: 'Log out' }));
  await screen.findByText('Login screen');
  expect(getToken()).toBeNull();
  expect(screen.queryByText(/Private recipes/)).toBeNull();
});

it('redirects when a restored token is revoked', async () => {
  setToken('revoked');
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{"detail":"Invalid token."}', {
    status: 401, headers: { 'content-type': 'application/json' },
  }));
  mount();
  await screen.findByText('Login screen');
  expect(getToken()).toBeNull();
});

it('offers retry on a network failure without discarding the token', async () => {
  setToken('saved');
  vi.spyOn(api, 'me').mockRejectedValueOnce(new Error('Server unavailable')).mockResolvedValue({ name: 'Cook', email: 'cook@example.com' });
  mount();
  await screen.findByRole('alert');
  expect(getToken()).toBe('saved');
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  await waitFor(() => expect(screen.getByText('Private recipes for Cook')).toBeTruthy());
});
