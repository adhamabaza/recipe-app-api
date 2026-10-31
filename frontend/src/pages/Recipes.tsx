import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api, errorMessage, externalUrl, maxImageBytes, mediaUrl } from '../api';
import { ConfirmDialog, ErrorNotice } from '../components';
import type { Attribute, RecipeDetail, RecipeInput } from '../types';

export function RecipePage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    api.recipe(id).then((result) => { if (active) setRecipe(result); })
      .catch((failure: unknown) => { if (active) setError(errorMessage(failure)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, revision]);
  async function remove() {
    setBusy(true); setDeleteError('');
    try { await api.deleteRecipe(id); navigate('/', { replace: true }); }
    catch (failure) { setDeleteError(errorMessage(failure)); }
    finally { setBusy(false); }
  }
  if (loading) return <p role="status">Loading recipe…</p>;
  if (error) return <><ErrorNotice error={error} /><button onClick={() => setRevision((value) => value + 1)}>Try again</button> <Link to="/">Back to recipes</Link></>;
  if (!recipe) return null;
  const source = externalUrl(recipe.link);
  return <>
    <Link className="back-link" to="/">← All recipes</Link>
    {location.state?.saved && <p role="status" className="notice">Recipe saved.</p>}
    <div className="page-heading"><div><p className="eyebrow">From your collection</p><h1>{recipe.title}</h1><p className="recipe-meta"><span>{recipe.time_minutes} minutes</span><span>Price {recipe.price}</span></p></div><div className="actions"><Link className="button secondary" to={`/recipes/${id}/edit`}>Edit recipe</Link><button className="danger-outline" onClick={() => setDeleting(true)}>Delete recipe</button></div></div>
    <article className="panel recipe-detail">
      {recipe.image && <img className="recipe-image" src={mediaUrl(recipe.image)} alt={recipe.title} />}
      <div className="detail-content"><h2>About this recipe</h2><p className="description">{recipe.description || 'No description added yet.'}</p>
        <h2>Ingredients</h2>{recipe.ingredients.length ? <ul>{recipe.ingredients.map((item) => <li key={item.id}>{item.name}</li>)}</ul> : <p className="muted">No ingredients added.</p>}
        <h2>Tags</h2><div className="chips">{recipe.tags.length ? recipe.tags.map((item) => <Link className="chip" key={item.id} to={`/?tags=${item.id}`}>{item.name}</Link>) : <span className="muted">No tags added.</span>}</div>
        {recipe.link && <p className="source">Source: {source ? <a href={source} target="_blank" rel="noopener noreferrer">{recipe.link} ↗</a> : recipe.link}</p>}
      </div>
    </article>
    {deleting && <ConfirmDialog title="Delete this recipe?" busy={busy} error={deleteError} onConfirm={remove} onCancel={() => setDeleting(false)}>“{recipe.title}” will be permanently deleted.</ConfirmDialog>}
  </>;
}

function AttributePicker({ title, names, choices, onChange, disabled }: {
  title: string; names: string[]; choices: Attribute[]; onChange: (names: string[]) => void; disabled: boolean;
}) {
  const [draft, setDraft] = useState('');
  function add() {
    const name = draft.trim();
    if (name && !names.includes(name)) onChange([...names, name]);
    setDraft('');
  }
  return <fieldset className="attribute-picker" disabled={disabled}>
    <legend>{title}</legend>
    <div className="chips">{names.map((name) => <button type="button" className="chip selected" key={name} onClick={() => onChange(names.filter((value) => value !== name))} aria-label={`Remove ${name}`}>{name} ×</button>)}</div>
    <div className="inline-fields"><label className="grow">Add {title.toLowerCase()}<input maxLength={255} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); add(); } }} /></label><button type="button" className="secondary" onClick={add} disabled={!draft.trim()}>Add</button></div>
    {choices.some((item) => !names.includes(item.name)) && <><p className="hint">Choose existing:</p><div className="chips">{choices.filter((item) => !names.includes(item.name)).map((item) => <button type="button" className="chip" key={item.id} onClick={() => onChange([...names, item.name])}>{item.name} +</button>)}</div></>}
    <p className="hint">New names are saved with the recipe. Click a selected item to remove it.</p>
  </fieldset>;
}

export function RecipeForm() {
  const { id } = useParams();
  return <RecipeEditor key={id || 'new'} id={id} />;
}

function RecipeEditor({ id }: { id?: string }) {
  const navigate = useNavigate();
  const [values, setValues] = useState<RecipeInput>({ title: '', time_minutes: 20, price: '0.00', link: '', description: '', tags: [], ingredients: [] });
  const [choices, setChoices] = useState<{ tags: Attribute[]; ingredients: Attribute[] }>({ tags: [], ingredients: [] });
  const [image, setImage] = useState<File | null>(null);
  const [existingImage, setExistingImage] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setLoadError('');
    Promise.all([api.attributes('tags'), api.attributes('ingredients'), id ? api.recipe(id) : Promise.resolve(null)])
      .then(([tags, ingredients, recipe]) => {
        if (!active) return;
        setChoices({ tags, ingredients });
        if (recipe) {
          setValues({ title: recipe.title, time_minutes: recipe.time_minutes, price: recipe.price, description: recipe.description, link: recipe.link, tags: recipe.tags.map(({ name }) => ({ name })), ingredients: recipe.ingredients.map(({ name }) => ({ name })) });
          setExistingImage(recipe.image);
        }
      }).catch((failure: unknown) => { if (active) setLoadError(errorMessage(failure)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, revision]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError('');
    let persistedId = savedId;
    try {
      if (image && image.size > maxImageBytes) {
        throw new Error(`Choose an image no larger than ${maxImageBytes / (1024 * 1024)} MB.`);
      }
      const payload = { ...values, title: values.title.trim() };
      const recipe = id || savedId
        ? await api.updateRecipe(id || savedId!, payload)
        : await api.createRecipe(payload);
      persistedId = recipe.id;
      setSavedId(recipe.id);
      if (image) await api.uploadImage(recipe.id, image);
      navigate(`/recipes/${recipe.id}`, { replace: true, state: { saved: true } });
    } catch (failure) {
      const message = errorMessage(failure);
      setError(persistedId ? `Your recipe is saved, but this step failed: ${message} Retry saving to upload the selected image, or open the saved recipe below.` : message);
    } finally { setBusy(false); }
  }

  if (loading) return <p role="status">Loading recipe form…</p>;
  if (loadError) return <><ErrorNotice error={loadError} /><button onClick={() => setRevision((value) => value + 1)}>Try again</button> <Link to="/">Back to recipes</Link></>;
  return <>
    <Link className="back-link" to={id ? `/recipes/${id}` : '/'}>← {id ? 'Back to recipe' : 'All recipes'}</Link>
    <div className="page-heading"><div><p className="eyebrow">Something worth saving</p><h1>{id ? 'Edit recipe' : 'New recipe'}</h1><p className="muted">The details that make a meal your own.</p></div></div>
    <section className="panel form-panel">
      <ErrorNotice error={error} />
      {savedId && error && <p><Link to={`/recipes/${savedId}`}>Open saved recipe →</Link></p>}
      <form onSubmit={submit}><fieldset disabled={busy}>
        <label>Title<input required maxLength={255} value={values.title} onChange={(event) => setValues({ ...values, title: event.target.value })} /></label>
        <div className="two-columns"><label>Time (minutes)<input type="number" required step="1" min="-2147483648" max="2147483647" value={values.time_minutes} onChange={(event) => setValues({ ...values, time_minutes: Number(event.target.value) })} /></label>
          <label>Price<input type="number" required step="0.01" min="-999.99" max="999.99" value={values.price} onChange={(event) => setValues({ ...values, price: event.target.value })} /></label></div>
        <label>Description<textarea rows={6} value={values.description} onChange={(event) => setValues({ ...values, description: event.target.value })} /></label>
        <label>Source link (optional)<input maxLength={255} value={values.link} onChange={(event) => setValues({ ...values, link: event.target.value })} /></label>
        {(['tags', 'ingredients'] as const).map((kind) => <AttributePicker key={kind} title={kind === 'tags' ? 'Tags' : 'Ingredients'} names={values[kind].map((item) => item.name)} choices={choices[kind]} onChange={(names) => setValues({ ...values, [kind]: names.map((name) => ({ name })) })} disabled={busy} />)}
        <label>Recipe image (optional)<input type="file" accept="image/*" onChange={(event) => setImage(event.target.files?.[0] || null)} /></label>
        <p className="hint">Choose an image up to {maxImageBytes / (1024 * 1024)} MB. It uploads after the recipe is saved. Selecting another image replaces the current one.</p>
        {existingImage && <img className="image-preview" src={mediaUrl(existingImage)} alt="Current recipe" />}
        <div className="actions"><button type="submit">{busy ? 'Saving…' : 'Save recipe'}</button><Link className="button secondary" to={savedId ? `/recipes/${savedId}` : id ? `/recipes/${id}` : '/'}>Cancel</Link></div>
      </fieldset></form>
    </section>
  </>;
}
