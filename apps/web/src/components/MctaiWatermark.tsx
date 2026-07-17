import { useState } from 'react';

export function MctaiWatermark() {
  const [label, setLabel] = useState('Share');

  async function handleShare() {
    const payload = {
      title: document.title || 'myClawTeam app',
      text: 'Built with myClawTeam.ai',
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(payload);
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(window.location.href);
        setLabel('Copied');
        window.setTimeout(() => setLabel('Share'), 1600);
      }
    } catch {
      setLabel('Share');
    }
  }

  return (
    <div id="mctai-watermark">
      <a href="https://myclawteam.ai" target="_blank" rel="noopener noreferrer">
        Built by myClawTeam.ai
      </a>
      <button type="button" onClick={() => void handleShare()}>
        {label}
      </button>
    </div>
  );
}
