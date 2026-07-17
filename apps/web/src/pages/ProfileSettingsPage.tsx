import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function ProfileSettingsPage() {
  const { status, user, uploadProfilePhoto } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setSaveState('idle');
    setMessage(null);

    if (!file) {
      setPreviewUrl(null);
      return;
    }

    if (!file.type.startsWith('image/')) {
      setPreviewUrl(null);
      setSaveState('error');
      setMessage('Choose an image file.');
      return;
    }

    const reader = new FileReader();
    reader.addEventListener('load', () => {
      setPreviewUrl(typeof reader.result === 'string' ? reader.result : null);
    });
    reader.readAsDataURL(file);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedFile) {
      setSaveState('error');
      setMessage('Choose a profile photo first.');
      return;
    }

    setSaveState('saving');
    setMessage(null);

    try {
      await uploadProfilePhoto(selectedFile);
      setSaveState('saved');
      setMessage('Profile photo updated.');
    } catch (err) {
      const nextMessage = err instanceof Error ? err.message : 'Unable to update profile photo.';
      setSaveState('error');
      setMessage(nextMessage);
    }
  }

  if (status !== 'authenticated' || !user) {
    return (
      <main className="auth-page">
        <section className="auth-visual" aria-label="Profile settings">
          <img
            src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1400&q=82"
            alt="People gathered around a table planning together"
          />
        </section>
        <section className="auth-panel" aria-labelledby="profile-title">
          <div className="auth-panel__header">
            <p className="eyebrow">Profile</p>
            <h1 id="profile-title">Sign in to update your profile</h1>
            <p className="summary">Your profile photo is attached to your authenticated account.</p>
          </div>
          <Link className="button button--primary" to="/signin">
            Sign in
          </Link>
        </section>
      </main>
    );
  }

  const avatarUrl = previewUrl ?? user.profilePhotoUrl;

  return (
    <main className="auth-page">
      <section className="auth-visual" aria-label="Profile photo">
        <img
          src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1400&q=82"
          alt="People gathered around a table with coffee and notes"
        />
      </section>
      <section className="auth-panel" aria-labelledby="profile-title">
        <div className="auth-panel__header">
          <p className="eyebrow">Profile</p>
          <h1 id="profile-title">Update your profile photo</h1>
          <p className="summary">Your avatar appears with your account across the workspace.</p>
        </div>

        <form className="profile-settings" onSubmit={handleSubmit}>
          <div className="avatar-preview" aria-label="Current avatar">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" />
            ) : (
              <span>{(user.name ?? user.email).slice(0, 1)}</span>
            )}
          </div>
          <label className="file-field">
            <span>Profile photo</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
            />
          </label>
          <div className="workspace-actions">
            <button
              className="button button--primary"
              type="submit"
              disabled={saveState === 'saving'}
            >
              {saveState === 'saving' ? 'Uploading' : 'Upload photo'}
            </button>
            <Link className="button button--secondary" to="/">
              Back to workspace
            </Link>
          </div>
        </form>

        {message ? (
          <div className={saveState === 'saved' ? 'success-alert' : 'inline-alert'} role="status">
            {message}
          </div>
        ) : null}
      </section>
    </main>
  );
}
