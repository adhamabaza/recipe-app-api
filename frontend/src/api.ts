import type { Attribute, AttributeKind, Recipe, RecipeDetail, RecipeInput, User } from './types';

const baseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
const tokenKey = 'recipe-app-token';
export const authEvent = 'recipe-app-auth-change';
export const maxImageBytes = Number(import.meta.env.VITE_MAX_IMAGE_BYTES || 10 * 1024 * 1024);

export function getToken(): string | null {
  return localStorage.getItem(tokenKey);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(tokenKey, token);
  else localStorage.removeItem(tokenKey);
  window.dispatchEvent(new Event(authEvent));
}

export class ApiError extends Error {
  constructor(public status: number, public details: unknown) {
    super(formatError(details));
  }
}

export function formatError(value: unknown, prefix = ''): string {
  if (Array.isArray(value)) return value.map((item) => formatError(item, prefix)).join(' ');
  if (value && typeof value === 'object') {
    return Object.entries(value).map(([key, item]) =>
      formatError(item, key === 'non_field_errors' || key === 'detail' ? prefix : `${prefix}${key}: `),
    ).join(' ');
  }
  return `${prefix}${String(value || 'Something went wrong. Please try again.')}`;
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

export async function request<Result>(path: string, options: RequestInit = {}, authenticated = true): Promise<Result> {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const token = authenticated ? getToken() : null;
  if (token) headers.set('Authorization', `Token ${token}`);
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, { credentials: 'omit', ...options, headers });
  } catch {
    throw new Error('Cannot reach the server. Check your connection and try again.');
  }
  if (response.status === 401 && token && getToken() === token) setToken(null);
  if (response.status === 204) return undefined as Result;
  const contentType = response.headers.get('content-type') || '';
  const data: unknown = contentType.includes('application/json')
    ? await response.json()
    : { detail: `The server returned ${response.status}. Please try again.` };
  if (!response.ok) throw new ApiError(response.status, data);
  return data as Result;
}

function json(method: string, data: unknown): RequestInit {
  return { method, body: JSON.stringify(data) };
}

export const api = {
  register: (data: User & { password: string }) => request<User>('/user/create/', json('POST', data), false),
  login: (email: string, password: string) => request<{ token: string }>('/user/token/', json('POST', { email, password }), false),
  me: () => request<User>('/user/me/'),
  updateProfile: (data: Partial<User> & { password?: string }) => request<User>('/user/me/', json('PATCH', data)),
  recipes: (tags: string[] = [], ingredients: string[] = []) => {
    const query = new URLSearchParams();
    if (tags.length) query.set('tags', tags.join(','));
    if (ingredients.length) query.set('ingredients', ingredients.join(','));
    return request<Recipe[]>(`/recipe/recipes/?${query}`);
  },
  recipe: (id: string | number) => request<RecipeDetail>(`/recipe/recipes/${id}/`),
  createRecipe: (data: RecipeInput) => request<RecipeDetail>('/recipe/recipes/', json('POST', data)),
  updateRecipe: (id: string | number, data: RecipeInput) => request<RecipeDetail>(`/recipe/recipes/${id}/`, json('PATCH', data)),
  deleteRecipe: (id: string | number) => request<void>(`/recipe/recipes/${id}/`, { method: 'DELETE' }),
  uploadImage: (id: string | number, image: File) => {
    const body = new FormData();
    body.append('image', image);
    return request<{ id: number; image: string }>(`/recipe/recipes/${id}/upload-image/`, { method: 'POST', body });
  },
  attributes: (kind: AttributeKind) => request<Attribute[]>(`/recipe/${kind}/`),
  renameAttribute: (kind: AttributeKind, id: number, name: string) => request<Attribute>(`/recipe/${kind}/${id}/`, json('PATCH', { name })),
  deleteAttribute: (kind: AttributeKind, id: number) => request<void>(`/recipe/${kind}/${id}/`, { method: 'DELETE' }),
};

export function mediaUrl(image: string): string {
  const url = new URL(image, window.location.origin);
  if (url.protocol === 'https:' && url.hostname.endsWith('.public.blob.vercel-storage.com')) return url.href;
  const apiOrigin = new URL(baseUrl, window.location.origin).origin;
  return new URL(url.pathname + url.search, apiOrigin).href;
}

export function externalUrl(link: string): string | undefined {
  try {
    const url = new URL(link);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}
