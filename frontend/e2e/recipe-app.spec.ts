import { expect, test, type APIRequestContext } from '@playwright/test';

const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGNQiHADAAFaAL+bHtJnAAAAAElFTkSuQmCC', 'base64');
const unique = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

async function account(request: APIRequestContext, suffix: string) {
  const email = `recipe-test-${suffix}@example.com`;
  const password = 'RecipeTest123!';
  const registration = await request.post('/api/user/create/', { data: { name: 'Integration Cook', email, password } });
  expect(registration.status()).toBe(201);
  const login = await request.post('/api/user/token/', { data: { email, password } });
  expect(login.ok()).toBeTruthy();
  const { token } = await login.json();
  return { email, password, headers: { Authorization: `Token ${token}` } };
}

test('real API: persistence, images, filters, profile, validation, and two-user isolation', async ({ request }) => {
  const first = await account(request, unique());
  const second = await account(request, unique());
  const firstOptions = { headers: first.headers };
  const secondOptions = { headers: second.headers };
  expect((await request.get('/api/recipe/recipes/')).status()).toBe(401);
  expect((await request.get('/api/user/me/', { headers: { Authorization: 'Token invalid' } })).status()).toBe(401);
  expect((await request.post('/api/recipe/recipes/', { ...firstOptions, data: {} })).status()).toBe(400);
  const created = await request.post('/api/recipe/recipes/', {
    ...firstOptions, data: { title: 'Integration soup', time_minutes: 25, price: '7.50', description: 'Simmer gently.', link: 'https://example.com/soup', tags: [{ name: 'Weeknight' }], ingredients: [{ name: 'Carrot' }] },
  });
  expect(created.status()).toBe(201);
  const recipe = await created.json();
  const path = `/api/recipe/recipes/${recipe.id}/`;
  const tag = recipe.tags[0];
  const ingredient = recipe.ingredients[0];
  expect((await request.patch(path, { ...firstOptions, data: { title: 'Updated soup' } })).ok()).toBeTruthy();
  expect((await (await request.get(path, firstOptions)).json()).title).toBe('Updated soup');
  const uploaded = await request.post(`${path}upload-image/`, { ...firstOptions, multipart: { image: { name: 'test.png', mimeType: 'image/png', buffer: image } } });
  expect(uploaded.ok()).toBeTruthy();
  const { image: imageUrl } = await uploaded.json();
  const mediaUrl = new URL(imageUrl, 'http://localhost');
  const media = await request.get(mediaUrl.hostname.endsWith('.public.blob.vercel-storage.com') ? mediaUrl.href : mediaUrl.pathname);
  expect(media.ok()).toBeTruthy();
  expect(media.headers()['content-type']).toContain('image/');
  const filtered = await request.get(`/api/recipe/recipes/?tags=${tag.id}&ingredients=${ingredient.id}`, firstOptions);
  expect((await filtered.json()).map((value: { id: number }) => value.id)).toEqual([recipe.id]);
  for (const [kind, item] of [['tags', tag], ['ingredients', ingredient]] as const) {
    const attrPath = `/api/recipe/${kind}/${item.id}/`;
    expect((await request.patch(attrPath, { ...firstOptions, data: { name: `Renamed ${kind}` } })).ok()).toBeTruthy();
    expect((await (await request.get(`/api/recipe/${kind}/`, secondOptions)).json())).toEqual([]);
    expect((await request.patch(attrPath, { ...secondOptions, data: { name: 'Stolen' } })).status()).toBe(404);
    expect((await request.delete(attrPath, secondOptions)).status()).toBe(404);
  }
  expect((await (await request.get('/api/recipe/recipes/', secondOptions)).json())).toEqual([]);
  expect((await request.get(path, secondOptions)).status()).toBe(404);
  expect((await request.patch(path, { ...secondOptions, data: { title: 'Stolen' } })).status()).toBe(404);
  expect((await request.delete(path, secondOptions)).status()).toBe(404);
  expect((await request.post(`${path}upload-image/`, { ...secondOptions, multipart: { image: { name: 'test.png', mimeType: 'image/png', buffer: image } } })).status()).toBe(404);
  const updatedEmail = `updated-${unique()}@example.com`;
  expect((await request.patch('/api/user/me/', { ...firstOptions, data: { name: 'Updated Cook', email: updatedEmail, password: 'NewRecipePassword123!' } })).ok()).toBeTruthy();
  expect((await request.post('/api/user/token/', { data: { email: updatedEmail, password: first.password } })).status()).toBe(400);
  expect((await request.post('/api/user/token/', { data: { email: updatedEmail, password: 'NewRecipePassword123!' } })).ok()).toBeTruthy();
  expect((await (await request.get('/api/user/me/', firstOptions)).json()).name).toBe('Updated Cook');
  for (const [kind, item] of [['tags', tag], ['ingredients', ingredient]] as const) {
    expect((await request.delete(`/api/recipe/${kind}/${item.id}/`, firstOptions)).status()).toBe(204);
    expect((await (await request.get(path, firstOptions)).json())[kind]).toEqual([]);
  }
  expect((await request.delete(path, firstOptions)).status()).toBe(204);
  expect((await request.get(path, firstOptions)).status()).toBe(404);
});

test('real browser: full account and recipe workflow survives refresh', async ({ page }, testInfo) => {
  const email = `browser-${unique()}@example.com`;
  await page.goto('/recipes/new');
  await expect(page).toHaveURL(/\/login$/);
  await page.getByRole('link', { name: 'Create an account' }).click();
  await page.getByLabel('Name', { exact: true }).fill('Browser Cook');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill('RecipeTest123!');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'New recipe', exact: true })).toBeVisible();
  await page.getByLabel('Title', { exact: true }).fill('Browser soup');
  await page.getByLabel('Description', { exact: true }).fill('A quick dinner.');
  await page.getByLabel('Add tags', { exact: true }).fill('Dinner');
  await page.getByRole('group', { name: 'Tags', exact: true }).getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByLabel('Add ingredients', { exact: true }).fill('Carrot');
  await page.getByRole('group', { name: 'Ingredients', exact: true }).getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByLabel('Recipe image (optional)').setInputFiles({ name: 'soup.png', mimeType: 'image/png', buffer: image });
  await page.getByRole('button', { name: 'Save recipe', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Browser soup', exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Browser soup' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Browser soup', exact: true })).toBeVisible();
  await expect.poll(() => page.getByRole('img', { name: 'Browser soup' }).evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await page.screenshot({ path: testInfo.outputPath('recipe-details.png'), fullPage: true });
  await page.getByRole('link', { name: 'Edit recipe', exact: true }).click();
  await page.getByLabel('Title', { exact: true }).fill('Edited browser soup');
  await page.getByRole('button', { name: 'Save recipe', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Edited browser soup', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Recipes', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Dinner', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Dinner', exact: true })).toBeChecked();
  await page.getByRole('checkbox', { name: 'Carrot', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Carrot', exact: true })).toBeChecked();
  await expect(page.getByRole('link', { name: 'Edited browser soup', exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.screenshot({ path: testInfo.outputPath('mobile-dashboard.png'), fullPage: true });
  await page.setViewportSize({ width: 1280, height: 720 });
  for (const kind of ['Tags', 'Ingredients']) {
    await page.getByRole('link', { name: kind, exact: true }).click();
    await page.getByRole('textbox').fill(`Updated ${kind}`);
    await page.getByRole('button', { name: 'Rename', exact: true }).click();
    await expect(page.getByText('Saved.', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(page.getByRole('heading', { name: `No ${kind.toLowerCase()} yet` })).toBeVisible();
  }
  await page.getByRole('link', { name: 'Profile', exact: true }).click();
  await page.getByLabel('Name', { exact: true }).fill('Updated Browser Cook');
  await page.getByLabel('Email', { exact: true }).fill(`updated-${email}`);
  await page.getByLabel('New password', { exact: true }).fill('ChangedRecipe123!');
  await page.getByLabel('Confirm new password', { exact: true }).fill('ChangedRecipe123!');
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(page.getByText('Profile and password updated.')).toBeVisible();
  await page.getByRole('button', { name: 'Log out', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('Email', { exact: true }).fill(`updated-${email}`);
  await page.getByLabel('Password', { exact: true }).fill('ChangedRecipe123!');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await page.getByRole('link', { name: 'Recipes', exact: true }).click();
  await page.getByRole('link', { name: 'Edited browser soup', exact: true }).click();
  await page.getByRole('button', { name: 'Delete recipe', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Edited browser soup', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Delete recipe', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'My recipes', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Edited browser soup', exact: true })).toHaveCount(0);
  await page.evaluate(() => { localStorage.setItem('recipe-app-token', 'invalid'); });
  await page.reload();
  await expect(page).toHaveURL(/\/login$/);
});
