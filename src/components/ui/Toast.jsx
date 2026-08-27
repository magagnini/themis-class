import { useState, useCallback } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

let toastFn = null;

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  toastFn = useCallback((msg, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '14px 18px',
          backgroundColor: t.type === 'success' ? '#065f46' : '#991b1b',
          color: 'white',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          minWidth: '260px', maxWidth: '380px',
          animation: 'slideIn 0.3s ease'
        }}>
          {t.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span style={{ flex: 1, fontSize: '14px' }}>{t.msg}</span>
          <button onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '2px' }}>
            <X size={16} />
          </button>
        </div>
      ))}
      <style>{`@keyframes slideIn { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }`}</style>
    </div>
  );
}

export function showToast(msg, type = 'success') {
  if (toastFn) toastFn(msg, type);
}
