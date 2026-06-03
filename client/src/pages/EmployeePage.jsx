import { useState, useEffect } from 'react';
import api from '../api';

const STATUS_META = {
  accepted:      { label: 'Принят',              color: '#10b981', bg: '#d1fae5', icon: '✓' },
  needs_revision:{ label: 'Требует доработки',   color: '#f59e0b', bg: '#fef3c7', icon: '⚠' },
  processing:    { label: 'Проверяется',          color: '#6366f1', bg: '#ede9fe', icon: '🔄' },
  pending:       { label: 'Ожидает',              color: '#6366f1', bg: '#ede9fe', icon: '⏳' },
  awaiting_check:{ label: 'В очереди',            color: '#9ca3af', bg: '#f3f4f6', icon: '🕐' },
};

export default function EmployeePage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    api.get('/reports/my').then(r => { setReports(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const accepted = reports.filter(r => r.status === 'accepted').length;
  const total = reports.length;

  if (loading) return <div style={{ padding: 40, color: '#6b7280' }}>Загрузка...</div>;

  return (
    <div>
      <div style={s.pageHeader}>
        <div>
          <h1 style={s.pageTitle}>Мои отчёты</h1>
          <p style={s.pageSubtitle}>История отправленных отчётов и результатов проверки</p>
        </div>
        <div style={s.headerHint}>
          <span style={s.hintIcon}>📱</span>
          <span style={s.hintText}>Для отправки нового отчёта воспользуйтесь Telegram-ботом</span>
        </div>
      </div>

      {total > 0 && (
        <div style={s.statsRow}>
          <div style={s.statChip}><span style={s.chipIcon}>📊</span> Всего отчётов: <b>{total}</b></div>
          <div style={s.statChip}><span style={s.chipIcon}>✅</span> Принято: <b style={{ color: '#10b981' }}>{accepted}</b></div>
          <div style={s.statChip}><span style={s.chipIcon}>⚠️</span> Требуют доработки: <b style={{ color: '#f59e0b' }}>{total - accepted}</b></div>
        </div>
      )}

      {reports.length === 0 ? (
        <div style={s.empty}>
          <div style={s.emptyIcon}>📭</div>
          <div style={s.emptyTitle}>Отчётов пока нет</div>
          <div style={s.emptyText}>Откройте Telegram-бота, отправьте PDF-файл или голосовое сообщение с отчётом</div>
        </div>
      ) : (
        <div style={s.list}>
          {reports.map(r => {
            const meta = STATUS_META[r.status] || STATUS_META.pending;
            const isOpen = expanded === r.id;
            return (
              <div key={r.id} style={s.item}>
                <div style={s.itemHeader} onClick={() => setExpanded(isOpen ? null : r.id)}>
                  <div style={s.itemLeft}>
                    <div style={{ ...s.itemStatusIcon, background: meta.bg, color: meta.color }}>{meta.icon}</div>
                    <div>
                      <div style={s.itemTitle}>Отчёт №{r.id}</div>
                      <div style={s.itemDate}>{new Date(r.submittedAt).toLocaleString('ru-RU')}</div>
                    </div>
                  </div>
                  <div style={s.itemRight}>
                    <span style={{ ...s.statusBadge, background: meta.bg, color: meta.color }}>
                      {meta.icon} {meta.label}
                    </span>
                    <span style={s.chevron}>{isOpen ? '▲' : '▼'}</span>
                  </div>
                </div>
                {isOpen && r.checkResult && (
                  <div style={s.itemBody}>
                    {r.checkResult.isValid ? (
                      <div style={s.okMsg}>✅ Отчёт полностью соответствует шаблону</div>
                    ) : (
                      <div>
                        <div style={s.issuesTitle}>Замечания ИИ-проверки:</div>
                        <pre style={s.issues}>{r.checkResult.issues}</pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const s = {
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  pageTitle: { margin: '0 0 4px', fontSize: 26, fontWeight: 700, color: '#111827' },
  pageSubtitle: { margin: 0, fontSize: 13, color: '#6b7280' },
  headerHint: { display: 'flex', alignItems: 'center', gap: 8, background: '#ede9fe', borderRadius: 10, padding: '10px 16px' },
  hintIcon: { fontSize: 18 },
  hintText: { fontSize: 13, color: '#6366f1' },
  statsRow: { display: 'flex', gap: 12, marginBottom: 16 },
  statChip: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: '#374151', display: 'flex', alignItems: 'center', gap: 6 },
  chipIcon: { fontSize: 15 },
  empty: { background: '#fff', borderRadius: 12, padding: 60, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: 600, color: '#374151', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#9ca3af' },
  list: { display: 'flex', flexDirection: 'column', gap: 8 },
  item: { background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden' },
  itemHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', cursor: 'pointer' },
  itemLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  itemStatusIcon: { width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700 },
  itemTitle: { fontWeight: 600, color: '#111827', fontSize: 14 },
  itemDate: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  itemRight: { display: 'flex', alignItems: 'center', gap: 12 },
  statusBadge: { borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 500 },
  chevron: { color: '#9ca3af', fontSize: 12 },
  itemBody: { padding: '0 20px 16px', borderTop: '1px solid #f3f4f6' },
  okMsg: { color: '#065f46', background: '#d1fae5', borderRadius: 8, padding: '10px 14px', fontSize: 14, marginTop: 12 },
  issuesTitle: { fontSize: 13, fontWeight: 600, color: '#374151', margin: '12px 0 6px' },
  issues: { margin: 0, fontSize: 13, whiteSpace: 'pre-wrap', color: '#6b7280', background: '#fef3c7', borderRadius: 8, padding: '10px 14px', lineHeight: 1.7 },
};
