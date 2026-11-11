import { Link } from 'react-router'
import { usePageTitle } from '../lib/usePageTitle'

export function NotFound({ message = 'Esta página não existe.' }: { message?: string }) {
  usePageTitle('Não encontrado')
  return (
    <main className="page not-found wrap">
      <p className="t-display">Nada aqui.</p>
      <p className="t-body secondary">{message}</p>
      <Link to="/catalogo" className="btn btn--primary" viewTransition>
        Voltar ao início
      </Link>
    </main>
  )
}
