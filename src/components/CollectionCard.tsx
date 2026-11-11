import { Link } from 'react-router'
import { tmdbImg, type Collection } from '../lib/catalog'
import { Img } from './Img'

export function CollectionCard({ collection }: { collection: Collection }) {
  const n = collection.movies.length
  return (
    <Link to={`/colecoes#${collection.id}`} className="card card--collection" viewTransition>
      <div className="card__art">
        {collection.backdrop ? (
          <Img className="card__img" src={tmdbImg(collection.backdrop, 'w780')} alt="" loading="lazy" />
        ) : (
          <div className="art-fallback card__img" />
        )}
        <div className="card__shade card__shade--strong" />
        <div className="collection-card__body">
          <p className="collection-card__name">{collection.name}</p>
          <p className="t-footnote secondary">
            {n} {n === 1 ? 'filme' : 'filmes'}
          </p>
        </div>
        <div className="collection-card__stack" aria-hidden="true">
          {collection.movies.slice(0, 3).map(
            m =>
              m.images.poster && (
                <img key={m.slug} src={tmdbImg(m.images.poster, 'w154')} alt="" loading="lazy" referrerPolicy="no-referrer" />
              ),
          )}
        </div>
        <span className="card__shine" aria-hidden="true" />
      </div>
    </Link>
  )
}
