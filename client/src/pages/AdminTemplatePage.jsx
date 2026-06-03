import { useState, useEffect } from 'react';
import api from '../api';

export default function AdminTemplatePage() {
  const [content, setContent] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    api.get('/templates/active').then(r => { setContent(r.data.content); setLoading(false); })
      .catch(() => setLoading(false));
    api.get('/templates').then(r => setHistory(r.data)).catch(() => {});
  }, []);

  const handleSave = async () => {
    if (!content.trim()) return;
    setSaving(true);
    try {
      await api.post('/templates', { content });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      api.get('/templates').then(r => setHistory(r.data));
    } catch { alert('Ошибка сохранения'); }
    finally { setSaving(false); }
  };

  if (loading) return <div style={{ padding: 40, color: '#6b7280' }}>Загрузка...</div>;

  return (
    <div>
      <div style={s.pageHeader}>
        <div>
          <h1 style={s.pageTitle}>Шаблон отчёта</h1>
          <p style={s.pageSubtitle}>Шаблон используется GPT-4o для проверки каждого отчёта сотрудника</p>
        </div>
        <button style={s.saveBtn} onClick={handleSave} disabled={saving}>
          {saving ? 'Сохранение...' : '💾 Сохранить шаблон'}
        </button>
      </div>

      {saved && (
        <div style={s.successBanner}>
          ✅ Шаблон сохранён и применён ко всем новым проверкам
        </div>
      )}

      <div style={s.card}>
        <div style={s.editorHeader}>
          <span style={s.editorTitle}>Редактор шаблона</span>
          <span style={s.charCount}>{content.length} символов</span>
        </div>
        <textarea style={s.textarea} value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Введите шаблон отчёта..." rows={22} />
      </div>

      {history.length > 1 && (
        <div style={s.historyCard}>
          <h3 style={s.historyTitle}>История версий</h3>
          {history.map(t => (
            <div key={t.id} style={s.historyItem}>
              <div style={s.historyLeft}>
                <span style={s.historyDate}>{new Date(t.createdAt).toLocaleString('ru-RU')}</span>
                {t.isActive && <span style={s.activeBadge}>● Активный</span>}
              </div>
              <button style={s.restoreBtn} onClick={() => setContent(t.content)}>
                Восстановить
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const s = {
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  pageTitle: { margin: '0 0 4px', fontSize: 26, fontWeight: 700, color: '#111827' },
  pageSubtitle: { margin: 0, fontSize: 13, color: '#6b7280' },
  saveBtn: { background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 14, cursor: 'pointer', fontWeight: 500 },
  successBanner: { background: '#d1fae5', color: '#065f46', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 14 },
  card: { background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden' },
  editorHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid #f3f4f6' },
  editorTitle: { fontWeight: 600, fontSize: 14, color: '#374151' },
  charCount: { fontSize: 12, color: '#9ca3af' },
  textarea: { width: '100%', padding: '16px 20px', border: 'none', outline: 'none', fontSize: 14, fontFamily: '"Fira Code", monospace', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.7, color: '#374151' },
  historyCard: { background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginTop: 16 },
  historyTitle: { margin: '0 0 14px', fontSize: 15, fontWeight: 600, color: '#111827' },
  historyItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f9fafb' },
  historyLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  historyDate: { fontSize: 13, color: '#6b7280' },
  activeBadge: { fontSize: 12, color: '#10b981', fontWeight: 500 },
  restoreBtn: { background: '#f3f4f6', border: 'none', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 12, color: '#6366f1' },
};
