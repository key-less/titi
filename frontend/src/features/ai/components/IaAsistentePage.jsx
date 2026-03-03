/**
 * IA Asistente — Chat con el agente de IA.
 * Soporta ?context=parches para preguntas sobre parches Datto RMM.
 */
import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { sendChatMessage } from '../api/aiApi';

const PARCHES_CONTEXT = `Sección Parches (Datto RMM). El usuario está consultando sobre cómo solucionar que los parches de Windows no se apliquen correctamente. Estados en RMM: Install Error, No Policy, No Data, Reboot Required, Approved Pending, Compliant. Responde con pasos concretos para diagnosticar y resolver (políticas de parches, agente, reinicios, permisos, etc.).`;

const SUGGESTED_QUESTIONS = {
  parches: '¿Cómo puedo solucionar que los parches no se apliquen correctamente en Datto RMM? (Install Error, No Policy, No Data)',
  default: '¿Qué pasos recomiendas para un ticket de soporte técnico?',
};

export function IaAsistentePage() {
  const location = useLocation();
  const isParchesContext = new URLSearchParams(location.search).get('context') === 'parches';
  const ticketContext = isParchesContext ? PARCHES_CONTEXT : null;
  const suggestedMessage = isParchesContext ? SUGGESTED_QUESTIONS.parches : SUGGESTED_QUESTIONS.default;

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text) => {
    const msg = (text || input).trim();
    if (!msg) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: msg }]);
    setLoading(true);
    setError(null);
    try {
      const response = await sendChatMessage(msg, ticketContext);
      setMessages((prev) => [...prev, { role: 'assistant', content: response }]);
    } catch (e) {
      setError(e.message || 'Error al enviar el mensaje. ¿Está configurada OPENAI_API_KEY en el backend?');
      setMessages((prev) => [...prev, { role: 'assistant', content: '(No se pudo obtener respuesta.)' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        .grid-bg { background-image: linear-gradient(rgba(14,77,145,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(14,77,145,0.05) 1px, transparent 1px); background-size: 32px 32px; }
        .nav-item { padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; font-family: 'JetBrains Mono', monospace; letter-spacing: 0.5px; color: #475569; transition: all 0.15s; display: flex; align-items: center; gap: 10px; text-decoration: none; color: inherit; }
        .nav-item:hover { background: #0d1d36; color: #94a3b8; }
        .nav-item.active { background: #0e2a4d; color: #38bdf8; border-left: 2px solid #0ea5e9; }
      `}</style>

      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <aside style={{ width: 220, background: '#06101e', borderRight: '1px solid #0f1e35', display: 'flex', flexDirection: 'column', padding: '24px 12px', gap: 4, position: 'sticky', top: 0, height: '100vh', flexShrink: 0 }}>
          <div style={{ padding: '0 8px 28px' }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, color: '#0ea5e9', letterSpacing: 1 }}>HELPDEX</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#1e3a5f', letterSpacing: 2, marginTop: 2 }}>OPERATIONS CENTER</div>
          </div>
          {[
            { icon: '▣', label: 'Dashboard', path: '/' },
            { icon: '◈', label: 'Mis Tickets', path: '/mis-tickets' },
            { icon: '◉', label: 'Parches', path: '/parches' },
            { icon: '◎', label: 'Dispositivos', path: null },
            { icon: '⬡', label: 'IA Asistente', path: '/ia-asistente' },
            { icon: '◇', label: 'Reportes', path: '/reportes' },
          ].map((item) => {
            const isActive = item.path === location.pathname || (item.path === '/' && (location.pathname === '/' || location.pathname === '/dashboard'));
            const content = (<><span style={{ fontSize: 14, opacity: 0.7 }}>{item.icon}</span>{item.label}</>);
            return item.path ? (
              <Link key={item.label} to={item.path} className={`nav-item ${isActive ? 'active' : ''}`}>{content}</Link>
            ) : (
              <div key={item.label} className="nav-item" style={{ opacity: 0.6, cursor: 'not-allowed' }} title="Próximamente">{content}</div>
            );
          })}
          <div style={{ flex: 1 }} />
          <div style={{ borderTop: '1px solid #0f1e35', paddingTop: 16, marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, color: '#fff', fontFamily: 'monospace' }}>AR</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>Tech L2</div>
                <div style={{ fontSize: 10, color: '#334155', fontFamily: 'monospace' }}>AutoTask · Datto</div>
              </div>
            </div>
          </div>
        </aside>

        <main style={{ flex: 1, padding: '28px 32px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }} className="grid-bg">
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 800, color: '#f1f5f9', lineHeight: 1, marginBottom: 8 }}>IA Asistente</h1>
          {isParchesContext && (
            <p style={{ fontFamily: 'monospace', fontSize: 11, color: '#818cf8', marginBottom: 16 }}>
              Contexto: Parches (Datto RMM). Puedes preguntar cómo solucionar problemas de parches.
            </p>
          )}

          {error && (
            <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.12)', borderRadius: 6, marginBottom: 16, fontFamily: 'monospace', fontSize: 12, color: '#ef4444' }}>{error}</div>
          )}

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {messages.length === 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 2, color: '#475569', marginBottom: 8 }}>PREGUNTA SUGERIDA</div>
                <button
                  type="button"
                  onClick={() => handleSend(suggestedMessage)}
                  style={{ background: 'rgba(129,140,248,0.15)', border: '1px solid rgba(129,140,248,0.3)', color: '#a5b4fc', padding: '10px 16px', borderRadius: 8, fontFamily: 'monospace', fontSize: 12, cursor: 'pointer', textAlign: 'left', maxWidth: 560 }}
                >
                  {suggestedMessage}
                </button>
              </div>
            )}

            <div style={{ flex: 1, overflowY: 'auto', marginBottom: 16 }}>
              {messages.map((m, i) => (
                <div
                  key={i}
                  style={{
                    marginBottom: 12,
                    padding: '12px 16px',
                    borderRadius: 8,
                    maxWidth: '85%',
                    fontFamily: 'monospace',
                    fontSize: 12,
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                    background: m.role === 'user' ? 'rgba(14,165,233,0.12)' : 'rgba(30,41,59,0.6)',
                    border: m.role === 'user' ? '1px solid rgba(14,165,233,0.2)' : '1px solid #1a2744',
                    color: m.role === 'user' ? '#7dd3fc' : '#cbd5e1',
                    marginLeft: m.role === 'user' ? 'auto' : 0,
                  }}
                >
                  {m.content}
                </div>
              ))}
              {loading && (
                <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#64748b', marginBottom: 12 }}>Escribiendo…</div>
              )}
              <div ref={bottomRef} />
            </div>

            <form
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              style={{ display: 'flex', gap: 10, flexShrink: 0 }}
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribe tu pregunta..."
                disabled={loading}
                style={{ flex: 1, background: '#0a1628', border: '1px solid #1a2744', color: '#cbd5e1', padding: '10px 14px', borderRadius: 8, fontFamily: 'monospace', fontSize: 12 }}
              />
              <button type="submit" disabled={loading} style={{ background: '#0ea5e9', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontFamily: 'monospace', fontSize: 11, fontWeight: 700 }}>
                Enviar
              </button>
            </form>
          </div>
        </main>
      </div>
    </>
  );
}
