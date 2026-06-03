import { useState, useEffect } from 'react';
import api from '../api';

const EVENT_ICONS = {
  user_registered: { icon: '🆕', color: '#6366f1', bg: '#ede9fe' },
  user_updated: { icon: '✏️', color: '#2563eb', bg: '#dbeafe' },
  user_deactivated: { icon: '🚫', color: '#ef4444', bg: '#fee2e2' },
  report_submitted: { icon: '📎', color: '#0891b2', bg: '#cffafe' },
  report_checked: { icon: '🔍', color: '#10b981', bg: '#d1fae5' },
  template_updated: { icon: '📋', color: '#f59e0b', bg: '#fef3c7' },
  openai_error: { icon: '⚠️', color: '#ef4444', bg: '#fee2e2' },
};

export default function AdminLogsPage() {
  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const limit = 50;

  const load = (p = 0) => {
    setLoading(true);
    api.get(`/eventlog?limit=${limit}&offset=${p * limit}`).then(r => {
      setEvents(r.data.events); setTotal(r.data.total); setLoading(false);
    });
  };

  useEffect(() => { load(page); }, [page]);

  const totalPages = Math.ceil(total / limit);

  if (loading) return <div style={{ padding: 40, color: '#6b7280' }}>Загрузка...</div>;

  return (
    <div>
      <div style={s.pageHeader}>
        <div>
          <h1 style={s.pageTitle}>Журнал событий</h1>
          <p style={s.pageSubtitle}>Все значимые действия в системе</p>
        </div>
        <span style={s.totalBadge}>{total} событий</span>
      </div>

      <div style={s.card}>
        <table style={s.table}>
          <thead>
            <tr>
              {['СОБЫТИЕ', 'ПОЛЬЗОВАТЕЛЬ', 'ОПИСАНИЕ', 'ДАТА И ВРЕМЯ'].map(h => (
                <th key={h} style={s.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {events.map(e => {
              const meta = EVENT_ICONS[e.eventType] || { icon: '📌', color: '#6b7280', bg: '#f3f4f6' };
              return (
                <tr key={e.id} style={s.tr}>
                  <td style={s.td}>
                    <div style={s.eventCell}>
                      <div style={{ ...s.eventIcon, background: meta.bg }}>{meta.icon}</div>
                      <span style={{ ...s.eventType, color: meta.color }}>{e.eventType}</span>
                    </div>
                  </td>
                  <td style={s.td}>
                    {e.user ? (
                      <span style={s.userBadge}>{e.user.fullName}</span>
                    ) : <span style={s.dimText}>—</span>}
                  </td>
                  <td style={s.td}><span style={s.desc}>{e.description || '—'}</span></td>
                  <td style={s.td}><span style={s.date}>{new Date(e.occurredAt).toLocaleString('ru-RU')}</span></td>
                </tr>
              );
            })}
            {events.length === 0 && (
              <tr><td colSpan={4} style={{ ...s.td, textAlign: 'center', color: '#9ca3af', padding: 40 }}>События не найдены</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={s.pagination}>
          <button style={s.pageBtn} disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Назад</button>
          <span style={s.pageInfo}>Страница {page + 1} из {totalPages}</span>
          <button style={s.pageBtn} disabled={page + 1 >= totalPages} onClick={() => setPage(p => p + 1)}>Далее →</button>
        </div>
      )}
    </div>
  );
}

const s = {
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  pageTitle: { margin: '0 0 4px', fontSize: 26, fontWeight: 700, color: '#111827' },
  pageSubtitle: { margin: 0, fontSize: 13, color: '#6b7280' },
  totalBadge: { background: '#f3f4f6', borderRadius: 8, padding: '6px 14px', fontSize: 13, color: '#6b7280', fontWeight: 500 },
  card: { background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#9ca3af', letterSpacing: 0.5, background: '#f9fafb', borderBottom: '1px solid #f3f4f6' },
  tr: { borderBottom: '1px solid #f9fafb' },
  td: { padding: '12px 16px', fontSize: 13, verticalAlign: 'middle' },
  eventCell: { display: 'flex', alignItems: 'center', gap: 10 },
  eventIcon: { width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 },
  eventType: { fontWeight: 600, fontSize: 13 },
  userBadge: { background: '#ede9fe', color: '#6366f1', borderRadius: 6, padding: '3px 10px', fontSize: 12 },
  dimText: { color: '#d1d5db' },
  desc: { color: '#6b7280', fontSize: 13 },
  date: { color: '#9ca3af', fontSize: 12, whiteSpace: 'nowrap' },
  pagination: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 16 },
  pageBtn: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 16px', cursor: 'pointer', fontSize: 13, color: '#374151' },
  pageInfo: { fontSize: 14, color: '#6b7280' },
};
