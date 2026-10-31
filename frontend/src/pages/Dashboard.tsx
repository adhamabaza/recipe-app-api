import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, errorMessage } from '../api';
import { ErrorNotice } from '../components';
import type { Attribute, Recipe } from '../types';

export function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tags = searchParams.get('tags') || '';
  const ingredients = searchParams.get('ingredients') || '';
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [choices, setChoices] = useState<{ tags: Attribute[]; ingredients: Attribute[] }>({ tags: [], ingredients: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    const ids = (value: string) => value.split(',').filter((id) => /^\d+$/.test(id));
    Promise.all([api.recipes(ids(tags), ids(ingredients)), api.attributes('tags'), api.attributes('ingredients')])
      .then(([items, tagItems, ingredientItems]) => {
        if (active) { setRecipes(items); setChoices({ tags: tagItems, ingredients: ingredientItems }); }
      }).catch((failure: unknown) => { if (active) setError(errorMessage(failure)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [tags, ingredients, revision]);

  function filter(kind: 'tags' | 'ingredients', id: number, checked: boolean) {
    const values = new Set((searchParams.get(kind) || '').split(',').filter(Boolean));
    if (checked) values.add(String(id)); else values.delete(String(id));
    const next = new URLSearchParams(searchParams);
    if (values.size) next.set(kind, [...values].join(',')); else next.delete(kind);
    setSearchParams(next);
  }

  return <>
    <div className="page-heading"><div><p className="eyebrow">Your personal collection</p><h1>My recipes</h1><p className="muted">Good food is worth keeping.</p></div><Link className="button" to="/recipes/new">+ New recipe</Link></div>
    <section className="panel filters" aria-label="Recipe filters">
      <div className="section-heading"><h2>Find something delicious</h2>{(tags || ingredients) && <button className="text-button" onClick={() => setSearchParams({})}>Clear filters</button>}</div>
      <p className="hint">Choose any tags and ingredients. Recipes match any selection within each group, and both groups when used together.</p>
      {(['tags', 'ingredients'] as const).map((kind) => <fieldset key={kind}>
        <legend>{kind === 'tags' ? 'Tags' : 'Ingredients'}</legend>
        <div className="chips">{choices[kind].length ? choices[kind].map((item) => <label className="chip-choice" key={item.id}>
          <input type="checkbox" checked={(kind === 'tags' ? tags : ingredients).split(',').includes(String(item.id))} onChange={(event) => filter(kind, item.id, event.target.checked)} />{item.name}
        </label>) : <span className="muted">Add {kind} when creating a recipe.</span>}</div>
      </fieldset>)}
    </section>
    <ErrorNotice error={error} />
    {error && <button className="secondary" onClick={() => setRevision((value) => value + 1)}>Try again</button>}
    {loading ? <p role="status">Loading recipes…</p> : !error && <>
      <p className="muted result-count">{recipes.length} {recipes.length === 1 ? 'recipe' : 'recipes'}</p>
      {recipes.length ? <div className="recipe-grid">{recipes.map((recipe) => <article className="panel recipe-card" key={recipe.id}>
        <div className="card-mark" aria-hidden="true">{recipe.title.charAt(0).toUpperCase()}</div>
        <h2><Link to={`/recipes/${recipe.id}`}>{recipe.title}</Link></h2>
        <p className="recipe-meta"><span>{recipe.time_minutes} min</span><span>Price {recipe.price}</span></p>
        <div className="chips">{recipe.tags.map((tag) => <span className="chip" key={tag.id}>{tag.name}</span>)}</div>
        <Link className="card-link" to={`/recipes/${recipe.id}`}>View recipe →</Link>
      </article>)}</div> : <section className="panel empty"><h2>{tags || ingredients ? 'No recipes match these filters' : 'Your recipe book starts here'}</h2><p className="muted">{tags || ingredients ? 'Try a different combination or clear your filters.' : 'Save your first recipe and give your favorites a home.'}</p><Link className="button" to="/recipes/new">Create a recipe</Link></section>}
    </>}
  </>;
}
