export type PhotoCardTone = 'coral' | 'amber' | 'teal';

export interface PhotoCardProps {
  title: string;
  eyebrow: string;
  detail: string;
  imageUrl: string;
  imageAlt: string;
  tone?: PhotoCardTone;
}

export function PhotoCard({
  title,
  eyebrow,
  detail,
  imageUrl,
  imageAlt,
  tone = 'coral',
}: PhotoCardProps) {
  return (
    <article className={`photo-card photo-card--${tone}`}>
      <div className="photo-card__media">
        <img src={imageUrl} alt={imageAlt} loading="lazy" />
      </div>
      <div className="photo-card__body">
        <div>
          <p className="photo-card__eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        <span className="photo-card__detail">{detail}</span>
      </div>
    </article>
  );
}
