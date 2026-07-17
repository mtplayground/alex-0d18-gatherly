import { AppShell } from './components/ui/AppShell';
import { PhotoCard } from './components/ui/PhotoCard';

const highlightedPlans = [
  {
    title: 'Rooftop supper',
    eyebrow: 'Fri 7:30 PM',
    detail: '12 guests',
    imageUrl:
      'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=1200&q=82',
    imageAlt: 'Long dinner table set outdoors with warm string lights',
    tone: 'coral',
  },
  {
    title: 'Lake morning',
    eyebrow: 'Sat 9:00 AM',
    detail: '6 guests',
    imageUrl:
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=82',
    imageAlt: 'People sitting near a lake at sunrise',
    tone: 'amber',
  },
  {
    title: 'Studio night',
    eyebrow: 'Sun 6:00 PM',
    detail: '18 guests',
    imageUrl:
      'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&w=1200&q=82',
    imageAlt: 'Friends gathered around a decorated party table',
    tone: 'teal',
  },
] as const;

export function App() {
  return (
    <AppShell
      eyebrow="Upcoming"
      title="Make the next plan feel vivid"
      summary="A quiet workspace for image-led invitations, organized details, and fast decisions."
      aside={
        <div className="shell-aside">
          <span className="aside-value">03</span>
          <span className="aside-label">drafts ready</span>
        </div>
      }
    >
      <section className="photo-grid" aria-label="Highlighted plans">
        {highlightedPlans.map((plan) => (
          <PhotoCard
            key={plan.title}
            title={plan.title}
            eyebrow={plan.eyebrow}
            detail={plan.detail}
            imageUrl={plan.imageUrl}
            imageAlt={plan.imageAlt}
            tone={plan.tone}
          />
        ))}
      </section>
    </AppShell>
  );
}
