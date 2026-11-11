import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router'
import { focusFirst, isTV } from '../lib/tv'
import { Nav } from './Nav'
import { SearchSheet } from './SearchSheet'
import { ToastProvider } from './Toast'
import { shouldShowTvUpdate, TvUpdateNotice } from './TvUpdateNotice'

export function AppShell() {
  const [searching, setSearching] = useState(false)
  const [updateNotice, setUpdateNotice] = useState(() => isTV && shouldShowTvUpdate())
  const { pathname } = useLocation()

  // na TV, cada tela nova já abre com algo focado (o controle não tem ponteiro)
  useEffect(() => {
    if (!isTV) return
    const t = setTimeout(() => focusFirst(), 120)
    return () => clearTimeout(t)
  }, [pathname])

  // botão Voltar do controle: fecha a busca antes de voltar de tela
  const searchingRef = useRef(searching)
  searchingRef.current = searching
  const noticeRef = useRef(updateNotice)
  noticeRef.current = updateNotice
  useEffect(() => {
    if (!isTV) return
    window.__pixelBack = () => {
      if (noticeRef.current) {
        setUpdateNotice(false)
        return true
      }
      if (!searchingRef.current) return false
      setSearching(false)
      return true
    }
    return () => {
      delete window.__pixelBack
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && e.target.matches('input, textarea, [contenteditable]')
      if ((e.key === '/' && !typing) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault()
        setSearching(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <ToastProvider>
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>
      {/* com o aviso aberto, o resto da tela sai do caminho do controle */}
      <div inert={updateNotice || undefined}>
        <Nav onSearch={() => setSearching(true)} />
        <div id="conteudo">
          <Outlet />
        </div>
      </div>
      <SearchSheet open={searching} onClose={() => setSearching(false)} />
      {updateNotice && (
        <TvUpdateNotice
          onClose={() => {
            setUpdateNotice(false)
            setTimeout(() => focusFirst(), 60)
          }}
        />
      )}
    </ToastProvider>
  )
}
