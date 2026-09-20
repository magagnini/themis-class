import { useState } from 'react';

/**
 * BrandLogo component handles displaying the system logo and optional company logo (Magagnini Educação).
 * If the image files exist in /imagens/ (in the public folder), they are rendered seamlessly.
 * If the images are not found, it gracefully falls back to displaying the text.
 */
export default function BrandLogo({ mode = 'sidebar', subtitle = 'Gestão Escolar de Ocorrências' }) {
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  const [magagniniLoaded, setMagagniniLoaded] = useState(false);
  const [magagniniFailed, setMagagniniFailed] = useState(false);

  if (mode === 'login') {
    return (
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        {!logoFailed && (
          <img
            src="/imagens/logo_sistema.png"
            alt="Logo do Sistema"
            onLoad={() => setLogoLoaded(true)}
            onError={() => setLogoFailed(true)}
            style={{
              maxHeight: '180px',
              maxWidth: '100%',
              objectFit: 'contain',
              margin: '0 auto 16px auto',
              display: logoLoaded ? 'block' : 'none'
            }}
          />
        )}
        {(!logoLoaded || logoFailed) && (
          <div>
            <h1 style={{ color: '#9b1c26', fontSize: '32px', letterSpacing: '-0.5px', marginBottom: '4px', fontWeight: 'bold', margin: 0 }} translate="no">
              Themis Class
            </h1>
            <p style={{ color: '#6b7280', fontSize: '15px', margin: '4px 0 0 0' }}>
              Gestão de Ocorrências Escolares
            </p>
          </div>
        )}
      </div>
    );
  }

  // Sidebar mode
  const showFallback = logoFailed && magagniniFailed;

  return (
    <div style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
        {!logoFailed && (
          <img
            src="/imagens/logo_sistema.png"
            alt="Logo do Sistema"
            onLoad={() => setLogoLoaded(true)}
            onError={() => setLogoFailed(true)}
            style={{
              maxHeight: '90px',
              maxWidth: '100px',
              width: '100%',
              objectFit: 'contain',
              display: logoLoaded ? 'block' : 'none'
            }}
          />
        )}

        {!magagniniFailed && (
          <img
            src="/imagens/logo_magagnini.png"
            alt="Magagnini Educação"
            onLoad={() => setMagagniniLoaded(true)}
            onError={() => setMagagniniFailed(true)}
            style={{
              maxHeight: '90px',
              maxWidth: '100px',
              width: '100%',
              objectFit: 'contain',
              display: magagniniLoaded ? 'block' : 'none'
            }}
          />
        )}
      </div>

      {showFallback && (
        <div>
          <h2 style={{ color: '#9b1c26', margin: '0 0 2px 0', fontSize: '1.4rem', fontWeight: '700' }}>Themis Class</h2>
          <p style={{ margin: 0, fontSize: '0.78rem', color: '#6b7280' }}>{subtitle}</p>
        </div>
      )}
    </div>
  );
}
