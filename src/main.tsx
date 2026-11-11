import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, Navigate, Outlet, RouterProvider, ScrollRestoration } from 'react-router'
import { MotionConfig } from 'motion/react'
import '@fontsource-variable/inter'
import './styles/tokens.css'
import './styles/base.css'
import './styles/glass.css'
import './styles/nav.css'
import './styles/hero.css'
import './styles/shelf.css'
import './styles/pages.css'
import './styles/detail.css'
import './styles/overlays.css'
import './styles/player.css'
import './styles/landing.css'
import './styles/tv.css'
import { movies, setCatalog, type Catalog } from './lib/catalog'
import { setServerConfig } from './lib/config'
import { saveProgress } from './lib/streamer'
import { enableSpatialNavigation, isTV } from './lib/tv'
import { AppShell } from './components/AppShell'
import { Landing } from './pages/Landing'
import { Home } from './pages/Home'
import { Browse } from './pages/Browse'
import { Collections } from './pages/Collections'
import { MoviePage } from './pages/MoviePage'
import { SeriesList } from './pages/SeriesList'
import { SeriesPage } from './pages/SeriesPage'
import { PlayerPage } from './pages/PlayerPage'
import { NotFound } from './pages/NotFound'

function Root() {
  return (
    // na TV, animações de posição/tamanho (lente das abas, grade de filmes) ficam desligadas: só opacidade
    <MotionConfig reducedMotion={isTV ? 'always' : 'user'}>
      <Outlet />
      {/* Toda página aberta do zero tem key "default"; sem isso, uma herdaria a rolagem da outra. */}
      <ScrollRestoration getKey={loc => (loc.key === 'default' ? loc.pathname : loc.key)} />
    </MotionConfig>
  )
}

const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      // na TV não há página de download: o app abre direto no catálogo
      { index: true, element: isTV ? <Navigate to="/catalogo" replace /> : <Landing /> },
      {
        element: <AppShell />,
        children: [
          { path: 'catalogo', element: <Home /> },
          { path: 'filmes', element: <Browse /> },
          { path: 'colecoes', element: <Collections /> },
          { path: 'filme/:slug', element: <MoviePage /> },
          { path: 'series', element: <SeriesList /> },
          { path: 'serie/:slug', element: <SeriesPage /> },
          { path: '*', element: <NotFound /> },
        ],
      },
      // o player web ocupa a tela toda, sem navegação
      { path: 'assistir/:slug', element: <PlayerPage /> },
    ],
  },
])

async function loadJson<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url, { credentials: 'same-origin', cache: 'no-cache' })
    return r.ok ? ((await r.json()) as T) : null
  } catch {
    return null
  }
}

async function boot() {
  const [catalog, config] = await Promise.all([loadJson<Catalog>('/api/catalog'), loadJson<Parameters<typeof setServerConfig>[0]>('/api/config')])
  if (config) setServerConfig(config)
  if (catalog?.movies?.length) setCatalog(catalog)
  // sem servidor (ex.: prévia estática), usa a cópia do catálogo que acompanha o build
  if (!movies.length) setCatalog((await import('./data/catalog.json')).default as unknown as Catalog)

  if (isTV) {
    enableSpatialNavigation()
    // o app nativo devolve o ponto em que o filme parou
    window.__pixelProgress = (slug, position, duration) => saveProgress(slug, position, duration)
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  )
}

boot()
