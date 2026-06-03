import { useState, useEffect } from 'react';
import api from '../api';

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}
function getAvatarColor(name) {
  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];
  let hash = 0; for (let c of (name || '')) hash += c.charCodeAt(0);
  return colors[hash % colors.length];
}

const STATUS_META = {
  accepted:      { label: 'Принят',            color: '#10b981', bg: '#d1fae5' },
  needs_revision:{ label: 'Требует доработки', color: '#f59e0b', bg: '#fef3c7' },
  processing:    { label: 'На проверке',        color: '#6366f1', bg: '#ede9fe' },
  pending:       { label: 'Ожидает',            color: '#6366f1', bg: '#ede9fe' },
  awaiting_check:{ label: 'В очереди',          color: '#9ca3af', bg: '#f3f4f6' },
};

const ALL_STATUSES = ['accepted', 'needs_revision', 'processing', 'pending', 'awaiting_check'];

export default function ManagerReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    api.get('/reports').then(r => { setReports(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = reports.filter(r => {
    const nameMatch = !search || (r.user?.fullName || '').toLowerCase().includes(search.toLowerCase());
    const statusMatch = !filterStatus || r.status === filterStatus;
    return nameMatch && statusMatch;
  });

  const accepted = reports.filter(r => r.status === 'accepted').length;
  const revision = reports.filter(r => r.status === 'needs_revision').length;

  if (loading) return <div style={{ padding: 40, color: '#6b7280' }}>Загрузка...</div>;

  return (
    <div>
      <div style={s.pageHeader}>
        <div>
          <h1 style={s.pageTitle}>Отчёты</h1>
          <p style={s.pageSubtitle}>Все отчёты подчинённых сотрудников</p>
        </div>
      </div>

      {/* Mini stats */}
      <div style={s.statsRow}>
        <div style={s.statChip}>📄 Всего: <b>{reports.length}</b></div>
        <div style={s.statChip}>✅ Принято: <b style={{ color: '#10b981' }}>{accepted}</b></div>
        <div style={s.statChip}>⚠️ Доработка: <b style={{ color: '#f59e0b' }}>{revision}</b></div>
        <div style={s.statChip}>🔄 В обработке: <b style={{ color: '#6366f1' }}>{reports.length - accepted - revision}</b></div>
      </div>

      {/* Filters */}
      <div style={s.filters}>
        <div style={s.searchBox}>
          <span>🔍</span>
          <input style={s.searchInput} placeholder="Поиск по имени сотрудника..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select style={s.select} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Все статусы</option>
          {ALL_STATUSES.map(st => (
            <option key={st} value={st}>{STATUS_META[st].label}</option>
          ))}
        </select>
        {(search || filterStatus) && (
          <button style={s.resetBtn} onClick={() => { setSearch(''); setFilterStatus(''); }}>
            ✕ Сбросить
          </button>
        )}
      </div>

      {/* Table */}
      <div style={s.tableCard}>
        <table style={s.table}>
          <thead>
            <tr>
              {['№', 'СОТРУДНИК', 'ДАТА', 'СТАТУС', 'РЕЗУЛЬТАТ', ''].map(h => (
                <th key={h} style={s.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => {
              const meta = STATUS_META[r.status] || STATUS_META.pending;
              const isOpen = expanded === r.id;
              const bg = getAvatarColor(r.user?.fullName);
              return (
                <>
                  <tr key={r.id} style={s.tr}>
                    <td style={s.td}><span style={s.reportId}>#{r.id}</span></td>
                    <td style={s.td}>
                      <div style={s.userCell}>
                        <div style={{ ...s.avatar, background: bg }}>{getInitials(r.user?.fullName)}</div>
                        <span style={s.userName}>{r.user?.fullName || '—'}</span>
                      </div>
                    </td>
                    <td style={s.td}>
                      <div style={s.dateCell}>
                        <span>{new Date(r.submittedAt).toLocaleDateString('ru-RU')}</span>
                        <span style={s.time}>{new Date(r.submittedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </td>
                    <td style={s.td}>
                      <span style={{ ...s.statusBadge, background: meta.bg, color: meta.color }}>
                        ● {meta.label}
                      </span>
                    </td>
                    <td style={s.td}>
                      {r.checkResult?.isValid === true && <span style={s.okText}>✓ Соответствует шаблону</span>}
                      {r.checkResult?.isValid === false && <span style={s.warnText}>⚠ Есть замечания</span>}
                      {!r.checkResult && <span style={s.dimText}>—</span>}
                    </td>
                    <td style={s.td}>
                      {r.checkResult?.issues && (
                        <button style={s.expandBtn} onClick={() => setExpanded(isOpen ? null : r.id)}>
                          {isOpen ? '▲ Скрыть' : '▼ Замечания'}
                        </button>
                      )}
                    </td>
                  </tr>
                  {isOpen && r.checkResult?.issues && (
                    <tr key={`detail-${r.id}`}>
                      <td colSpan={6} style={s.detailTd}>
                        <div style={s.issuesBox}>
                          <strong style={s.issuesTitle}>Замечания ИИ-проверки:</strong>
                          <pre style={s.issues}>{r.checkResult.issues}</pre>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} style={{ ...s.td, textAlign: 'center', color: '#9ca3af', padding: 40 }}>
                  Отчёты не найдены
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filtered.length > 0 && (
        <div style={s.footer}>Показано {filtered.length} из {reports.length} отчётов</div>
      )}
    </div>
  );
}

const s = {
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  pageTitle: { margin: '0 0 4px', fontSize: 26, fontWeight: 700, color: '#111827' },
  pageSubtitle: { margin: 0, fontSize: 13, color: '#6b7280' },
  statsRow: { display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' },
  statChip: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: '#374151' },
  filters: { display: 'flex', gap: 10, marginBottom: 12, alignItems: 'center' },
  searchBox: { display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 14px', flex: 1, maxWidth: 320 },
  searchInput: { border: 'none', outline: 'none', fontSize: 13, color: '#374151', background: 'none', width: '100%' },
  select: { padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, color: '#374151', background: '#fff', cursor: 'pointer' },
  resetBtn: { background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 12px', fontSize: 13, cursor: 'pointer', color: '#6b7280' },
  tableCard: { background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#9ca3af', letterSpacing: 0.5, background: '#f9fafb', borderBottom: '1px solid #f3f4f6' },
  tr: { borderBottom: '1px solid #f9fafb' },
  td: { padding: '12px 14px', fontSize: 13, verticalAlign: 'middle' },
  reportId: { color: '#9ca3af', fontFamily: 'monospace' },
  userCell: { display: 'flex', alignItems: 'center', gap: 8 },
  avatar: { width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 11, flexShrink: 0 },
  userName: { fontWeight: 600, color: '#111827' },
  dateCell: { display: 'flex', flexDirection: 'column', gap: 2 },
  time: { fontSize: 11, color: '#9ca3af' },
  statusBadge: { borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 500 },
  okText: { color: '#10b981', fontSize: 12, fontWeight: 500 },
  warnText: { color: '#f59e0b', fontSize: 12, fontWeight: 500 },
  dimText: { color: '#d1d5db' },
  expandBtn: { background: '#f3f4f6', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12, color: '#6366f1' },
  detailTd: { padding: '0 14px 12px', background: '#fafafa' },
  issuesBox: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 16px' },
  issuesTitle: { fontSize: 13, color: '#374151', display: 'block', marginBottom: 8 },
  issues: { margin: 0, fontSize: 12, whiteSpace: 'pre-wrap', color: '#6b7280', lineHeight: 1.7 },
  footer: { marginTop: 10, fontSize: 12, color: '#9ca3af', textAlign: 'right' },
};
