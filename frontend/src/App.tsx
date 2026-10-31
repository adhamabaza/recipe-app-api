import { Link, NavLink, Outlet, Route, Routes } from 'react-router-dom';
import { ProtectedRoute, useAuth } from './auth';
import { AuthPage, ProfilePage } from './pages/Account';
import { Dashboard } from './pages/Dashboard';
import { RecipePage, RecipeForm } from './pages/Recipes';
import { AttributesPage } from './pages/Attributes';

function Layout() {
  const { user, logout } = useAuth();
  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <header><div className="header-inner">
      <Link className="brand" to="/">Recipe<span>Book</span></Link>
      <nav aria-label="Main navigation">
        <NavLink to="/" end>Recipes</NavLink>
        <NavLink to="/tags">Tags</NavLink>
        <NavLink to="/ingredients">Ingredients</NavLink>
        <NavLink to="/profile">Profile</NavLink>
      </nav>
      <div className="account"><span>{user?.name}</span><button className="secondary small" onClick={logout}>Log out</button></div>
    </div></header>
    <main className="shell" id="main"><Outlet /></main>
    <footer>Your recipes. A little more organized.</footer>
  </>;
}

export function App() {
  return <Routes>
    <Route path="/login" element={<AuthPage key="login" />} />
    <Route path="/register" element={<AuthPage key="register" register />} />
    <Route element={<ProtectedRoute />}>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="recipes/new" element={<RecipeForm />} />
        <Route path="recipes/:id" element={<RecipePage />} />
        <Route path="recipes/:id/edit" element={<RecipeForm />} />
        <Route path="tags" element={<AttributesPage key="tags" kind="tags" />} />
        <Route path="ingredients" element={<AttributesPage key="ingredients" kind="ingredients" />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="*" element={<section className="panel"><h1>Page not found</h1><Link to="/">Back to recipes</Link></section>} />
      </Route>
    </Route>
  </Routes>;
}
