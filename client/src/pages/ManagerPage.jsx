import { useState, useEffect } from 'react';
import api from '../api';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const STATUS_LABELS = {
  accepted: 'Принят',
  needs_revision: 'Требует доработки',
  processing: 'На проверке',
  pending: 'Ожидает',
  awaiting_check: 'В очереди',
};

const STATUS_COLORS = {
  accepted: '#10b981',
  needs_revision: '#f59e0b',
  processing: '#6366f1',
  pending: '#6366f1',
  awaiting_check: '#9ca3af',
};

const PERIODS = ['День', 'Неделя', 'Месяц', 'Квартал'];

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function getAvatarColor(name) {
  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];
  let hash = 0;
  for (let c of (name || '')) hash += c.charCodeAt(0);
  return colors[hash % colors.length];
}

function StatCard({ label, value, sub, subColor, icon, iconBg }) {
  return (
    <div style={s.statCard}>
      <div style={s.statTop}>
        <div>
          <div style={s.statLabel}>{label}</div>
          <div style={s.statValue}>{value}</div>
          {sub && <div style={{ ...s.statSub, color: subColor || '#6b7280' }}>{sub}</div>}
        </div>
        <div style={{ ...s.statIcon, background: iconBg }}>{icon}</div>
      </div>
    </div>
  );
}

export default function ManagerPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('Неделя');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.get('/reports').then(r => { setReports(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const byEmployee = reports.reduce((acc, r) => {
    const key = r.user?.id;
    if (!acc[key]) acc[key] = { user: r.user, reports: [] };
    acc[key].reports.push(r);
    return acc;
  }, {});

  const empList = Object.values(byEmployee);
  const totalReports = reports.length;
  const accepted = reports.filter(r => r.status === 'accepted').length;
  const needsRevision = reports.filter(r => r.status === 'needs_revision').length;
  const acceptedPct = totalReports ? Math.round(accepted / totalReports * 100) : 0;

  const pieData = [
    { name: 'Принято', value: accepted, color: '#10b981' },
    { name: 'Доработка', value: needsRevision, color: '#f59e0b' },
    { name: 'Прочее', value: Math.max(0, totalReports - accepted - needsRevision), color: '#e5e7eb' },
  ].filter(d => d.value > 0);

  const today = new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const exportPDF = () => {
    const rows = empList.map(({ user, reports: empReports }) => {
      const last = empReports[0];
      const acc = empReports.filter(r => r.status === 'accepted').length;
      const status = STATUS_LABELS[last?.status] || '—';
      const lastDate = last ? new Date(last.submittedAt).toLocaleDateString('ru-RU') : '—';
      return `<tr>
        <td>${user?.fullName || '—'}</td>
        <td>${empReports.length}</td>
        <td>${acc}</td>
        <td>${empReports.length - acc}</td>
        <td>${status}</td>
        <td>${lastDate}</td>
      </tr>`;
    }).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>Отчёт руководителя</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 32px; color: #111; }
        h1 { font-size: 20px; margin-bottom: 4px; }
        .sub { color: #888; font-size: 13px; margin-bottom: 24px; }
        .stats { display: flex; gap: 24px; margin-bottom: 24px; }
        .stat { background: #f5f5f5; border-radius: 8px; padding: 12px 20px; text-align: center; }
        .stat-num { font-size: 28px; font-weight: 700; }
        .stat-lbl { font-size: 12px; color: #888; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th { background: #f0f0f0; padding: 8px 12px; text-align: left; border-bottom: 2px solid #ddd; }
        td { padding: 8px 12px; border-bottom: 1px solid #eee; }
        .footer { margin-top: 32px; font-size: 11px; color: #aaa; }
      </style></head><body>
      <h1>Дашборд руководителя</h1>
      <div class="sub">Период: ${period} · Сформировано: ${new Date().toLocaleString('ru-RU')}</div>
      <div class="stats">
        <div class="stat"><div class="stat-num">${empList.length}</div><div class="stat-lbl">Сотрудников</div></div>
        <div class="stat"><div class="stat-num">${totalReports}</div><div class="stat-lbl">Отчётов</div></div>
        <div class="stat"><div class="stat-num">${accepted}</div><div class="stat-lbl">Принято (${acceptedPct}%)</div></div>
        <div class="stat"><div class="stat-num">${needsRevision}</div><div class="stat-lbl">Требуют доработки</div></div>
      </div>
      <table>
        <thead><tr><th>Сотрудник</th><th>Всего</th><th>Принято</th><th>Доработка</th><th>Статус</th><th>Последний</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="footer">Система автоматизации отчётности · Концепт.Отчёты</div>
      </body></html>`;

    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 500);
  };

  if (loading) return <div style={s.loading}>Загрузка...</div>;

  return (
    <div>
      {/* Header */}
      <div style={s.pageHeader}>
        <div>
          <h1 style={s.pageTitle}>Дашборд руководителя</h1>
          <div style={s.pageSubtitle}>{today} · отдел разработки</div>
        </div>
        <div style={s.headerActions}>
          <div style={s.periodSelector}>
            {PERIODS.map(p => (
              <button key={p} style={{ ...s.periodBtn, ...(period === p ? s.periodBtnActive : {}) }}
                onClick={() => setPeriod(p)}>{p}</button>
            ))}
          </div>
          <button style={s.exportBtn} onClick={exportPDF}>⬇ Экспорт в PDF</button>
        </div>
      </div>

      {/* Stat cards */}
      <div style={s.statsGrid}>
        <StatCard label="СОТРУДНИКОВ" value={empList.length} sub="↑ +1 за неделю" subColor="#10b981" icon="👥" iconBg="#ede9fe" />
        <StatCard label="ОТЧЁТОВ ЗА НЕДЕЛЮ" value={totalReports} sub="↑ 12% к прошлой" subColor="#10b981" icon="📄" iconBg="#dbeafe" />
        <StatCard label="ПРИНЯТО ИИ" value={accepted} sub={`${acceptedPct}% от общего`} subColor="#10b981" icon="✓" iconBg="#d1fae5" />
        <StatCard label="ТРЕБУЮТ ДОРАБОТКИ" value={needsRevision} sub="↓ 2 к прошлой неделе" subColor="#f59e0b" icon="⚠" iconBg="#fef3c7" />
      </div>

      {/* Table + Chart */}
      <div style={s.mainGrid}>
        {/* Table */}
        <div style={s.tableCard}>
          <div style={s.tableHeader}>
            <span style={s.tableTitle}>Статус отчётов подчинённых</span>
            <button style={s.linkBtn}>Смотреть все →</button>
          </div>
          <table style={s.table}>
            <thead>
              <tr>
                {['СОТРУДНИК', 'ПОСЛЕДНИЙ ОТЧЁТ', 'СТАТУС', 'ПОЛУЧЕН', ''].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {empList.map(({ user, reports: empReports }) => {
                const last = empReports[0];
                const color = STATUS_COLORS[last?.status] || '#9ca3af';
                const bg = getAvatarColor(user?.fullName);
                return (
                  <tr key={user?.id} style={s.tr}>
                    <td style={s.td}>
                      <div style={s.empCell}>
                        <div style={{ ...s.empAvatar, background: bg }}>{getInitials(user?.fullName)}</div>
                        <div>
                          <div style={s.empName}>{user?.fullName || '—'}</div>
                          <div style={s.empSub}>Сотрудник</div>
                        </div>
                      </div>
                    </td>
                    <td style={s.td}><span style={s.reportName}>Отчёт за неделю №{last?.id || '—'}</span></td>
                    <td style={s.td}>
                      {last ? (
                        <span style={{ ...s.statusBadge, background: color + '20', color }}>
                          ● {STATUS_LABELS[last.status]}
                        </span>
                      ) : <span style={{ color: '#9ca3af', fontSize: 13 }}>—</span>}
                    </td>
                    <td style={s.td}>
                      <span style={s.dateText}>
                        {last ? new Date(last.submittedAt).toLocaleDateString('ru-RU') : '—'}
                        {last && <span style={s.timeText}> · {new Date(last.submittedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>}
                      </span>
                    </td>
                    <td style={s.td}>
                      <button style={s.eyeBtn} onClick={() => setSelected(selected?.user?.id === user?.id ? null : { user, reports: empReports })}>👁</button>
                    </td>
                  </tr>
                );
              })}
              {empList.length === 0 && (
                <tr><td colSpan={5} style={{ ...s.td, textAlign: 'center', color: '#9ca3af', padding: 32 }}>Сотрудников пока нет</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Donut chart */}
        <div style={s.chartCard}>
          <div style={s.tableTitle}>Распределение статусов</div>
          <div style={s.donutWrap}>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" strokeWidth={2}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(val, name) => [val, name]} />
              </PieChart>
            </ResponsiveContainer>
            <div style={s.donutCenter}>
              <div style={s.donutPct}>{acceptedPct}%</div>
              <div style={s.donutLabel}>ПРИНЯТО</div>
            </div>
          </div>
          <div style={s.legend}>
            {pieData.map(d => (
              <div key={d.name} style={s.legendItem}>
                <span style={{ ...s.legendDot, background: d.color }} />
                <span style={s.legendName}>{d.name}</span>
                <span style={s.legendVal}>{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div style={s.detailCard}>
          <div style={s.tableHeader}>
            <span style={s.tableTitle}>История отчётов: {selected.user?.fullName}</span>
            <button style={s.linkBtn} onClick={() => setSelected(null)}>✕ Закрыть</button>
          </div>
          <table style={s.table}>
            <thead>
              <tr>
                {['ДАТА', 'СТАТУС', 'ЗАМЕЧАНИЯ'].map(h => <th key={h} style={s.th}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {selected.reports.map(r => (
                <tr key={r.id} style={s.tr}>
                  <td style={s.td}>{new Date(r.submittedAt).toLocaleString('ru-RU')}</td>
                  <td style={s.td}>
                    <span style={{ ...s.statusBadge, background: (STATUS_COLORS[r.status] || '#9ca3af') + '20', color: STATUS_COLORS[r.status] || '#9ca3af' }}>
                      ● {STATUS_LABELS[r.status]}
                    </span>
                  </td>
                  <td style={s.td}>
                    {r.checkResult?.issues
                      ? <pre style={s.issues}>{r.checkResult.issues}</pre>
                      : <span style={{ color: '#9ca3af' }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const s = {
  loading: { padding: 40, color: '#6b7280' },
  pageHeader: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 },
  pageTitle: { margin: '0 0 4px', fontSize: 26, fontWeight: 700, color: '#111827' },
  pageSubtitle: { fontSize: 13, color: '#6b7280' },
  headerActions: { display: 'flex', alignItems: 'center', gap: 12 },
  periodSelector: { display: 'flex', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' },
  periodBtn: { padding: '7px 14px', fontSize: 13, border: 'none', background: 'none', cursor: 'pointer', color: '#6b7280' },
  periodBtnActive: { background: '#6366f1', color: '#fff' },
  exportBtn: { background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer', fontWeight: 500 },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 },
  statCard: { background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
  statTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  statLabel: { fontSize: 11, fontWeight: 600, color: '#9ca3af', letterSpacing: 0.5, marginBottom: 6 },
  statValue: { fontSize: 32, fontWeight: 700, color: '#111827', lineHeight: 1 },
  statSub: { fontSize: 12, marginTop: 6 },
  statIcon: { width: 44, height: 44, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 },
  mainGrid: { display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16, marginBottom: 16 },
  tableCard: { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
  tableHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  tableTitle: { fontSize: 15, fontWeight: 600, color: '#111827' },
  linkBtn: { background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: 13 },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#9ca3af', letterSpacing: 0.5, borderBottom: '1px solid #f3f4f6' },
  tr: { borderBottom: '1px solid #f9fafb' },
  td: { padding: '12px 12px', fontSize: 13, verticalAlign: 'middle' },
  empCell: { display: 'flex', alignItems: 'center', gap: 10 },
  empAvatar: { width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0 },
  empName: { fontWeight: 600, color: '#111827', fontSize: 13 },
  empSub: { fontSize: 11, color: '#9ca3af' },
  reportName: { color: '#374151' },
  statusBadge: { borderRadius: 20, padding: '4px 10px', fontSize: 12, fontWeight: 500 },
  dateText: { color: '#374151' },
  timeText: { color: '#9ca3af' },
  eyeBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, opacity: 0.5 },
  chartCard: { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
  donutWrap: { position: 'relative', marginTop: 12 },
  donutCenter: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' },
  donutPct: { fontSize: 24, fontWeight: 700, color: '#111827' },
  donutLabel: { fontSize: 10, color: '#9ca3af', fontWeight: 600, letterSpacing: 0.5 },
  legend: { marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 },
  legendItem: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 },
  legendDot: { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 },
  legendName: { flex: 1, color: '#6b7280' },
  legendVal: { fontWeight: 600, color: '#111827' },
  detailCard: { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginTop: 16 },
  issues: { margin: 0, fontSize: 12, whiteSpace: 'pre-wrap', color: '#6b7280' },
};
