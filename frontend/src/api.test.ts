import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError, externalUrl, formatError, getToken, mediaUrl, request, setToken } from './api';

beforeEach(() => localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

function respond(data: unknown, status = 200) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(data), {
    status, headers: { 'content-type': 'application/json' },
  }));
}

describe('API integration contract', () => {
  it('sends DRF Token authentication and comma-separated filters', async () => {
    setToken('my-token');
    const fetchMock = respond([]);
    await api.recipes(['1', '2'], ['3']);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/recipe/recipes/?tags=1%2C2&ingredients=3');
    expect(new Headers(options?.headers).get('Authorization')).toBe('Token my-token');
  });

  it('never sends a stored token to login or registration', async () => {
    setToken('old-token');
    const fetchMock = respond({ token: 'new-token' });
    await api.login('cook@example.com', 'secret');
    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).has('Authorization')).toBe(false);
    expect(fetchMock.mock.calls[0][1]?.credentials).toBe('omit');
  });

  it('clears invalid authentication on 401 but preserves it on 403', async () => {
    setToken('invalid');
    const fetchMock = respond({ detail: 'Invalid token.' }, 401);
    await expect(api.me()).rejects.toThrow('Invalid token.');
    expect(getToken()).toBeNull();
    setToken('valid');
    fetchMock.mockResolvedValue(new Response('{"detail":"Forbidden"}', { status: 403, headers: { 'content-type': 'application/json' } }));
    await expect(api.me()).rejects.toBeInstanceOf(ApiError);
    expect(getToken()).toBe('valid');
  });

  it('does not clear a newer login when an old request returns 401', async () => {
    setToken('old');
    let finish!: (value: Response) => void;
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const pending = api.me();
    setToken('new');
    finish(new Response('{}', { status: 401, headers: { 'content-type': 'application/json' } }));
    await expect(pending).rejects.toBeInstanceOf(ApiError);
    expect(getToken()).toBe('new');
  });

  it('leaves multipart content-type to the browser', async () => {
    const fetchMock = respond({ id: 1, image: '/static/media/test.png' });
    await api.uploadImage(1, new File(['test'], 'test.png', { type: 'image/png' }));
    const options = fetchMock.mock.calls[0][1];
    expect(options?.body).toBeInstanceOf(FormData);
    expect(new Headers(options?.headers).has('Content-Type')).toBe(false);
  });

  it('handles empty delete responses and non-JSON proxy errors', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));
    await expect(api.deleteRecipe(1)).resolves.toBeUndefined();
    fetchMock.mockResolvedValue(new Response('<html>Bad gateway</html>', { status: 502 }));
    await expect(request('/user/me/')).rejects.toThrow('The server returned 502');
  });

  it('preserves field and nested validation messages', () => {
    expect(formatError({ title: ['This field is required.'], tags: [{ name: ['Too long.'] }] }))
      .toBe('title: This field is required. tags: name: Too long.');
  });

  it('uses the shared origin for media and allows only safe external links', () => {
    expect(mediaUrl('http://app:8000/static/media/photo.jpg')).toBe(`${window.location.origin}/static/media/photo.jpg`);
    expect(mediaUrl('https://test.public.blob.vercel-storage.com/uploads/recipe/photo.jpg')).toBe('https://test.public.blob.vercel-storage.com/uploads/recipe/photo.jpg');
    expect(externalUrl('javascript:alert(1)')).toBeUndefined();
    expect(externalUrl('https://example.com/recipe')).toBe('https://example.com/recipe');
  });
});
