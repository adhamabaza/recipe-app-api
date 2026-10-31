import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { api } from '../api';
import { RecipeForm } from './Recipes';
import type { RecipeDetail } from '../types';

afterEach(cleanup);

it('retries a failed image upload without creating a duplicate recipe', async () => {
  vi.spyOn(api, 'attributes').mockResolvedValue([]);
  const recipe: RecipeDetail = { id: 12, title: 'Soup', time_minutes: 20, price: '0.00', link: '', description: '', tags: [], ingredients: [], image: null };
  const create = vi.spyOn(api, 'createRecipe').mockResolvedValue(recipe);
  const update = vi.spyOn(api, 'updateRecipe').mockResolvedValue(recipe);
  const upload = vi.spyOn(api, 'uploadImage').mockRejectedValueOnce(new Error('Image invalid.')).mockResolvedValue({ id: 12, image: '/static/media/test.png' });
  render(<MemoryRouter initialEntries={['/recipes/new']}><Routes>
    <Route path="/recipes/new" element={<RecipeForm />} />
    <Route path="/recipes/:id" element={<p>Saved recipe detail</p>} />
  </Routes></MemoryRouter>);
  fireEvent.change(await screen.findByLabelText('Title'), { target: { value: 'Soup' } });
  fireEvent.change(screen.getByLabelText('Recipe image (optional)'), { target: { files: [new File(['test'], 'photo.png', { type: 'image/png' })] } });
  fireEvent.click(screen.getByRole('button', { name: 'Save recipe' }));
  await screen.findByRole('alert');
  expect(screen.getByText(/Your recipe is saved/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Save recipe' }));
  await screen.findByText('Saved recipe detail');
  expect(create).toHaveBeenCalledTimes(1);
  expect(update).toHaveBeenCalledWith(12, expect.objectContaining({ title: 'Soup' }));
  expect(upload).toHaveBeenCalledTimes(2);
});
