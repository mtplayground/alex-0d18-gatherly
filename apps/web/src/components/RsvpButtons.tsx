import type { RsvpStatus } from '@app/shared';

const rsvpOptions: Array<{ status: RsvpStatus; label: string; detail: string }> = [
  { status: 'yes', label: 'Yes', detail: 'I am in' },
  { status: 'maybe', label: 'Maybe', detail: 'I might join' },
  { status: 'no', label: 'No', detail: 'I cannot make it' },
];

export function RsvpButtons({
  value,
  isSaving,
  onChange,
}: {
  value: RsvpStatus | null;
  isSaving: boolean;
  onChange: (status: RsvpStatus) => void;
}) {
  return (
    <div className="rsvp-buttons" role="group" aria-label="RSVP response">
      {rsvpOptions.map((option) => (
        <button
          className={option.status === value ? 'rsvp-button rsvp-button--active' : 'rsvp-button'}
          disabled={isSaving}
          key={option.status}
          onClick={() => onChange(option.status)}
          type="button"
        >
          <strong>{option.label}</strong>
          <span>{option.detail}</span>
        </button>
      ))}
    </div>
  );
}
