import React, { useEffect, useState } from 'react';
import apiService from '../../services/api';

const UpgradeModal: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [upgradeUrl, setUpgradeUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      // @ts-ignore
      const detail = e.detail || {};
      setMessage(detail.message || 'You have reached the free tier limit.');
      setUpgradeUrl(detail.upgradeUrl || null);
      setOpen(true);
    };

    window.addEventListener('quantibi:paywall', handler as EventListener);
    return () => window.removeEventListener('quantibi:paywall', handler as EventListener);
  }, []);

  const handleClose = () => setOpen(false);

  const handleUpgrade = async () => {
    setProcessing(true);
    try {
      if (upgradeUrl) {
        // Open in same tab to avoid leaving a second app tab that may show a login screen
        window.location.assign(upgradeUrl);
      } else {
        // Fallback: call backend to create checkout session (mock safe)
        const resp = await apiService.createCheckoutSession(process.env.REACT_APP_STRIPE_PRICE_ID || '');
        if (resp?.url) {
          window.location.assign(resp.url);
        } else {
          alert('Upgrade URL not available');
        }
      }
    } catch (err: any) {
      console.error('Error creating checkout session', err);
      const message = err?.response?.data?.message || err?.message || 'Failed to start upgrade flow';
      alert(message);
    } finally {
      setProcessing(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 className="text-lg font-semibold mb-2">Upgrade to Pro</h3>
        <p className="text-sm text-gray-700 mb-4">{message}</p>
        <div className="flex justify-end space-x-2">
          <button className="px-4 py-2 bg-gray-200 rounded" onClick={handleClose}>Cancel</button>
          <button className="px-4 py-2 bg-indigo-600 text-white rounded" onClick={handleUpgrade} disabled={processing}>
            {processing ? 'Processing...' : 'Upgrade'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpgradeModal;
