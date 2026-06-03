import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [chatId, setChatId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(chatId.trim());
      if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'manager') navigate('/manager');
      else navigate('/employee');
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка входа. Проверьте Chat ID.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.root}>
      <div style={s.left}>
        <div style={s.brand}>
          <div style={s.brandIcon}>К</div>
          <span style={s.brandName}>Концепт.Отчёты</span>
        </div>
        <div style={s.tagline}>
          <h2 style={s.taglineTitle}>Умная система управления отчётностью</h2>
          <p style={s.taglineText}>Автоматическая проверка отчётов сотрудников с помощью GPT-4o и удобная веб-панель для руководителей</p>
        </div>
        <div style={s.features}>
          {['📎 Приём PDF и голосовых отчётов', '🤖 ИИ-проверка структуры за 15 сек', '📊 Дашборд статусов для руководителя', '🔔 Автоматические уведомления'].map(f => (
            <div key={f} style={s.feature}>{f}</div>
          ))}
        </div>
      </div>

      <div style={s.right}>
        <div style={s.card}>
          <h2 style={s.title}>Добро пожаловать</h2>
          <p style={s.subtitle}>Войдите с помощью вашего Telegram Chat ID</p>

          <form onSubmit={handleSubmit}>
            <label style={s.label}>Telegram Chat ID</label>
            <input style={s.input} type="text" value={chatId}
              onChange={e => setChatId(e.target.value)}
              placeholder="Например: 123456789" required />

            {error && (
              <div style={s.errorBox}>⚠ {error}</div>
            )}

            <button style={s.btn} type="submit" disabled={loading}>
              {loading ? 'Вход...' : 'Войти в систему'}
            </button>
          </form>

          <div style={s.hintBox}>
            <span style={s.hintIcon}>💡</span>
            <span style={s.hintText}>Узнать свой Chat ID можно, написав команду <b>/start</b> нашему боту в Telegram</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  root: { minHeight: '100vh', display: 'flex', fontFamily: '"Inter", "Roboto", Arial, sans-serif' },
  left: { flex: 1, background: '#1a1f36', padding: '48px 52px', display: 'flex', flexDirection: 'column', justifyContent: 'center' },
  brand: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 48 },
  brandIcon: { width: 40, height: 40, borderRadius: 10, background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 18 },
  brandName: { color: '#fff', fontWeight: 700, fontSize: 18 },
  tagline: { marginBottom: 36 },
  taglineTitle: { margin: '0 0 12px', color: '#fff', fontSize: 28, fontWeight: 700, lineHeight: 1.3 },
  taglineText: { margin: 0, color: 'rgba(255,255,255,0.55)', fontSize: 15, lineHeight: 1.6 },
  features: { display: 'flex', flexDirection: 'column', gap: 12 },
  feature: { color: 'rgba(255,255,255,0.7)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 4 },
  right: { width: 460, background: '#f4f6fb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 },
  card: { background: '#fff', borderRadius: 16, padding: 36, width: '100%', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' },
  title: { margin: '0 0 6px', fontSize: 22, fontWeight: 700, color: '#111827' },
  subtitle: { margin: '0 0 24px', fontSize: 14, color: '#6b7280' },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 },
  input: { width: '100%', padding: '11px 14px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14, boxSizing: 'border-box', outline: 'none', color: '#111827', marginBottom: 16, transition: 'border-color 0.2s' },
  errorBox: { background: '#fee2e2', color: '#991b1b', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 14 },
  btn: { width: '100%', padding: '12px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, cursor: 'pointer', fontWeight: 600 },
  hintBox: { display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 20, padding: '12px 14px', background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' },
  hintIcon: { fontSize: 16, flexShrink: 0 },
  hintText: { fontSize: 12, color: '#6b7280', lineHeight: 1.5 },
};
