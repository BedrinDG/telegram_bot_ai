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

export default function ManagerEmployeesPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.get('/reports').then(r => { setReports(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Группируем по сотруднику
  const byEmployee = reports.reduce((acc, r) => {
    const key = r.user?.id;
    if (!acc[key]) acc[key] = { user: r.user, reports: [] };
    acc[key].reports.push(r);
    return acc;
  }, {});

  const empList = Object.values(byEmployee).filter(({ user }) =>
    !search || (user?.fullName || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div style={{ padding: 40, color: '#6b7280' }}>Загрузка...</div>;

  return (
    <div>
      <div style={s.pageHeader}>
        <div>
          <h1 style={s.pageTitle}>Сотрудники</h1>
          <p style={s.pageSubtitle}>Список подчинённых и сводка по их отчётности</p>
        </div>
        <div style={s.totalBadge}>Всего: {empList.length}</div>
      </div>

      <div style={s.searchBox}>
        <span>🔍</span>
        <input style={s.searchInput} placeholder="Поиск по имени..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div style={s.grid}>
        {empList.map(({ user, reports: empReports }) => {
          const last = empReports[0];
          const meta = STATUS_META[last?.status] || STATUS_META.pending;
          const accepted = empReports.filter(r => r.status === 'accepted').length;
          const bg = getAvatarColor(user?.fullName);
          const isSelected = selected?.user?.id === user?.id;

          return (
            <div key={user?.id} style={{ ...s.card, ...(isSelected ? s.cardSelected : {}) }}
              onClick={() => setSelected(isSelected ? null : { user, reports: empReports })}>
              <div style={s.cardTop}>
                <div style={{ ...s.avatar, background: bg }}>{getInitials(user?.fullName)}</div>
                <div style={s.cardInfo}>
                  <div style={s.empName}>{user?.fullName || 'Неизвестный'}</div>
                  <div style={s.empSub}>Сотрудник</div>
                </div>
              </div>

              <div style={s.cardStats}>
                <div style={s.statItem}>
                  <span style={s.statNum}>{empReports.length}</span>
                  <span style={s.statLbl}>отчётов</span>
                </div>
                <div style={s.statDivider} />
                <div style={s.statItem}>
                  <span style={{ ...s.statNum, color: '#10b981' }}>{accepted}</span>
                  <span style={s.statLbl}>принято</span>
                </div>
                <div style={s.statDivider} />
                <div style={s.statItem}>
                  <span style={{ ...s.statNum, color: '#f59e0b' }}>{empReports.length - accepted}</span>
                  <span style={s.statLbl}>доработка</span>
                </div>
              </div>

              {last && (
                <div style={s.cardFooter}>
                  <span style={s.lastDate}>Последний: {new Date(last.submittedAt).toLocaleDateString('ru-RU')}</span>
                  <span style={{ ...s.statusBadge, background: meta.bg, color: meta.color }}>
                    {meta.label}
                  </span>
                </div>
              )}
              {!last && <div style={s.noReports}>Отчётов ещё нет</div>}
            </div>
          );
        })}
        {empList.length === 0 && (
          <div style={s.empty}>Сотрудники не найдены</div>
        )}
      </div>

      {/* История отчётов выбранного сотрудника */}
      {selected && (
        <div style={s.detailCard}>
          <div style={s.detailHeader}>
            <div style={s.detailTitle}>
              <div style={{ ...s.avatar, background: getAvatarColor(selected.user?.fullName), width: 32, height: 32, fontSize: 12 }}>
                {getInitials(selected.user?.fullName)}
              </div>
              История отчётов: {selected.user?.fullName}
            </div>
            <button style={s.closeBtn} onClick={() => setSelected(null)}>✕ Закрыть</button>
          </div>
          <table style={s.table}>
            <thead>
              <tr>
                {['№', 'ДАТА', 'СТАТУС', 'ЗАМЕЧАНИЯ'].map(h => <th key={h} style={s.th}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {selected.reports.map(r => {
                const m = STATUS_META[r.status] || STATUS_META.pending;
                return (
                  <tr key={r.id} style={s.tr}>
                    <td style={s.td}>#{r.id}</td>
                    <td style={s.td}>{new Date(r.submittedAt).toLocaleString('ru-RU')}</td>
                    <td style={s.td}>
                      <span style={{ ...s.statusBadge, background: m.bg, color: m.color }}>{m.label}</span>
                    </td>
                    <td style={s.td}>
                      {r.checkResult?.issues
                        ? <pre style={s.issues}>{r.checkResult.issues}</pre>
                        : <span style={{ color: '#9ca3af' }}>—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
  searchBox: { display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 14px', marginBottom: 16, maxWidth: 320 },
  searchInput: { border: 'none', outline: 'none', fontSize: 13, color: '#374151', background: 'none', width: '100%' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14, marginBottom: 20 },
  card: { background: '#fff', borderRadius: 12, padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', cursor: 'pointer', transition: 'box-shadow 0.15s', border: '2px solid transparent' },
  cardSelected: { border: '2px solid #6366f1' },
  cardTop: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 },
  avatar: { width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0 },
  cardInfo: {},
  empName: { fontWeight: 600, color: '#111827', fontSize: 14 },
  empSub: { fontSize: 11, color: '#9ca3af' },
  cardStats: { display: 'flex', alignItems: 'center', background: '#f9fafb', borderRadius: 8, padding: '10px 0', marginBottom: 12 },
  statItem: { flex: 1, textAlign: 'center' },
  statNum: { display: 'block', fontSize: 20, fontWeight: 700, color: '#111827' },
  statLbl: { fontSize: 11, color: '#9ca3af' },
  statDivider: { width: 1, height: 28, background: '#e5e7eb' },
  cardFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  lastDate: { fontSize: 12, color: '#9ca3af' },
  statusBadge: { borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 500 },
  noReports: { fontSize: 12, color: '#d1d5db', textAlign: 'center', padding: '8px 0' },
  empty: { gridColumn: '1/-1', textAlign: 'center', color: '#9ca3af', padding: 40, background: '#fff', borderRadius: 12 },
  detailCard: { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
  detailHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  detailTitle: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 15, fontWeight: 600, color: '#111827' },
  closeBtn: { background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 13, color: '#6b7280' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#9ca3af', letterSpacing: 0.5, borderBottom: '1px solid #f3f4f6' },
  tr: { borderBottom: '1px solid #f9fafb' },
  td: { padding: '11px 12px', fontSize: 13, verticalAlign: 'top' },
  issues: { margin: 0, fontSize: 12, whiteSpace: 'pre-wrap', color: '#6b7280' },
};
