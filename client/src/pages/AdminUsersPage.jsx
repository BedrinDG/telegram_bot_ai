import { useState, useEffect } from 'react';
import api from '../api';

const ROLES = ['employee', 'manager', 'admin'];
const ROLE_LABELS = { employee: 'Сотрудник', manager: 'Руководитель', admin: 'Администратор' };
const ROLE_COLORS = { employee: { bg: '#ede9fe', color: '#6366f1' }, manager: { bg: '#dbeafe', color: '#2563eb' }, admin: { bg: '#fce7f3', color: '#db2777' } };

// Вкладки убраны — у каждого раздела есть отдельная страница в навигации

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}
function getAvatarColor(name) {
  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];
  let hash = 0; for (let c of (name || '')) hash += c.charCodeAt(0);
  return colors[hash % colors.length];
}

function StatCard({ label, value, icon, iconBg }) {
  return (
    <div style={s.statCard}>
      <div style={{ ...s.statIcon, background: iconBg }}>{icon}</div>
      <div>
        <div style={s.statValue}>{value}</div>
        <div style={s.statLabel}>{label}</div>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [newUser, setNewUser] = useState({ telegramChatId: '', fullName: '', role: 'employee', isActive: true });

  const load = () => {
    api.get('/users').then(r => { setUsers(r.data); setLoading(false); });
  };
  useEffect(load, []);

  const startEdit = (user) => {
    setEditId(user.id);
    setForm({ fullName: user.fullName || '', role: user.role, isActive: user.isActive });
  };
  const saveEdit = async () => {
    await api.patch(`/users/${editId}`, form);
    setEditId(null); load();
  };
  const toggleActive = async (user) => {
    await api.patch(`/users/${user.id}`, { isActive: !user.isActive });
    load();
  };
  const addUser = async () => {
    if (!newUser.telegramChatId) return;
    await api.post('/users', newUser);
    setShowModal(false);
    setNewUser({ telegramChatId: '', fullName: '', role: 'employee', isActive: true });
    load();
  };

  const filtered = users.filter(u => {
    const matchSearch = !search ||
      (u.fullName || '').toLowerCase().includes(search.toLowerCase()) ||
      u.telegramChatId.includes(search);
    const matchRole = !filterRole || u.role === filterRole;
    const matchStatus = !filterStatus ||
      (filterStatus === 'active' ? u.isActive : !u.isActive);
    return matchSearch && matchRole && matchStatus;
  });

  const resetFilters = () => { setSearch(''); setFilterRole(''); setFilterStatus(''); };

  const exportCSV = () => {
    const header = ['ID', 'ФИО', 'Telegram Chat ID', 'Роль', 'Статус', 'Дата регистрации'];
    const rows = filtered.map(u => [
      u.id,
      u.fullName || '—',
      u.telegramChatId,
      ROLE_LABELS[u.role],
      u.isActive ? 'Активен' : 'Неактивен',
      new Date(u.createdAt).toLocaleDateString('ru-RU'),
    ]);
    const csv = [header, ...rows].map(r => r.map(v => `"${v}"`).join(';')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `пользователи_${new Date().toLocaleDateString('ru-RU')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.isActive).length;
  const pendingUsers = users.filter(u => !u.isActive).length;
  const adminUsers = users.filter(u => u.role === 'admin').length;

  if (loading) return <div style={{ padding: 40, color: '#6b7280' }}>Загрузка...</div>;

  return (
    <div>
      {/* Header */}
      <div style={s.pageHeader}>
        <div>
          <h1 style={s.pageTitle}>Управление пользователями</h1>
          <p style={s.pageSubtitle}>Добавление, редактирование ролей и деактивация учётных записей</p>
        </div>
        <div style={s.headerActions}>
          <button style={s.exportBtn} onClick={exportCSV}>⬇ Экспорт CSV</button>
          <button style={s.addBtn} onClick={() => setShowModal(true)}>+ Добавить пользователя</button>
        </div>
      </div>

      {/* Stats */}
      <div style={s.statsGrid}>
        <StatCard label="Всего пользователей" value={totalUsers} icon="👥" iconBg="#ede9fe" />
        <StatCard label="Активных" value={activeUsers} icon="✓" iconBg="#d1fae5" />
        <StatCard label="Ожидают активации" value={pendingUsers} icon="⏳" iconBg="#fef3c7" />
        <StatCard label="Администраторов" value={adminUsers} icon="🛡" iconBg="#dbeafe" />
      </div>

      {/* Filters */}
      <div style={s.filters}>
        <div style={s.searchBox}>
          <span style={s.searchIcon}>🔍</span>
          <input style={s.searchInput} placeholder="Поиск по ФИО, telegram_id или e-mail"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select style={s.filterSelect} value={filterRole} onChange={e => setFilterRole(e.target.value)}>
          <option value="">Все роли</option>
          {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
        <select style={s.filterSelect} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Все статусы</option>
          <option value="active">Активные</option>
          <option value="inactive">Неактивные</option>
        </select>
        <select style={s.filterSelect}><option value="">Все отделы</option></select>
        <button style={s.resetBtn} onClick={resetFilters}>▼ Сбросить</button>
      </div>

      {/* Table */}
      <div style={s.tableCard}>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}><input type="checkbox" /></th>
              <th style={s.th}>ПОЛЬЗОВАТЕЛЬ</th>
              <th style={s.th}>TELEGRAM ID</th>
              <th style={s.th}>РОЛЬ</th>
              <th style={s.th}>РУКОВОДИТЕЛЬ</th>
              <th style={s.th}>СТАТУС</th>
              <th style={s.th}>АКТИВЕН</th>
              <th style={s.th}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(user => {
              const rc = ROLE_COLORS[user.role] || ROLE_COLORS.employee;
              const isEdit = editId === user.id;
              return (
                <tr key={user.id} style={s.tr}>
                  <td style={s.td}><input type="checkbox" /></td>
                  <td style={s.td}>
                    <div style={s.userCell}>
                      <div style={{ ...s.avatar, background: getAvatarColor(user.fullName) }}>
                        {getInitials(user.fullName)}
                      </div>
                      <div>
                        {isEdit ? (
                          <input style={s.inlineInput} value={form.fullName}
                            onChange={e => setForm({ ...form, fullName: e.target.value })} />
                        ) : (
                          <div style={s.userName}>{user.fullName || '—'}</div>
                        )}
                        <div style={s.userSub}>{'id' + user.id + '@concept.ru'}</div>
                      </div>
                    </div>
                  </td>
                  <td style={s.td}><span style={s.chatId}>{user.telegramChatId}</span></td>
                  <td style={s.td}>
                    {isEdit ? (
                      <select style={s.inlineSelect} value={form.role}
                        onChange={e => setForm({ ...form, role: e.target.value })}>
                        {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                      </select>
                    ) : (
                      <span style={{ ...s.roleBadge, background: rc.bg, color: rc.color }}>
                        {ROLE_LABELS[user.role]}
                      </span>
                    )}
                  </td>
                  <td style={s.td}><span style={s.dimText}>—</span></td>
                  <td style={s.td}>
                    <span style={{ ...s.statusDot, color: user.isActive ? '#10b981' : '#9ca3af' }}>
                      ● {user.isActive ? 'Активен' : 'Неактивен'}
                    </span>
                  </td>
                  <td style={s.td}>
                    <div style={{ ...s.toggle, background: user.isActive ? '#6366f1' : '#d1d5db' }}
                      onClick={() => !isEdit && toggleActive(user)}>
                      <div style={{ ...s.toggleDot, transform: user.isActive ? 'translateX(18px)' : 'translateX(2px)' }} />
                    </div>
                  </td>
                  <td style={s.td}>
                    {isEdit ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button style={s.btnSave} onClick={saveEdit}>✓</button>
                        <button style={s.btnCancel} onClick={() => setEditId(null)}>✕</button>
                      </div>
                    ) : (
                      <button style={s.editBtn} onClick={() => startEdit(user)}>✎</button>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={8} style={{ ...s.td, textAlign: 'center', color: '#9ca3af', padding: 32 }}>Пользователи не найдены</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      {showModal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <h3 style={s.modalTitle}>Добавить пользователя</h3>
            <label style={s.label}>Telegram Chat ID *</label>
            <input style={s.input} value={newUser.telegramChatId}
              onChange={e => setNewUser({ ...newUser, telegramChatId: e.target.value })}
              placeholder="123456789" />
            <label style={s.label}>ФИО</label>
            <input style={s.input} value={newUser.fullName}
              onChange={e => setNewUser({ ...newUser, fullName: e.target.value })}
              placeholder="Иванов Иван Иванович" />
            <label style={s.label}>Роль</label>
            <select style={s.input} value={newUser.role}
              onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
              {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
            <div style={s.modalActions}>
              <button style={s.btnCancel2} onClick={() => setShowModal(false)}>Отмена</button>
              <button style={s.btnSave2} onClick={addUser}>Добавить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  pageTitle: { margin: '0 0 4px', fontSize: 26, fontWeight: 700, color: '#111827' },
  pageSubtitle: { margin: 0, fontSize: 13, color: '#6b7280' },
  headerActions: { display: 'flex', gap: 10 },
  exportBtn: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer', color: '#374151' },
  addBtn: { background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer', fontWeight: 500 },
  tabs: { display: 'flex', gap: 0, borderBottom: '2px solid #e5e7eb', marginBottom: 20 },
  tab: { padding: '10px 18px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 6 },
  tabActive: { color: '#6366f1', borderBottom: '2px solid #6366f1', marginBottom: -2 },
  tabBadge: { background: '#f3f4f6', borderRadius: 10, padding: '1px 8px', fontSize: 11, color: '#6b7280' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 },
  statCard: { background: '#fff', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
  statIcon: { width: 40, height: 40, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 },
  statValue: { fontSize: 22, fontWeight: 700, color: '#111827' },
  statLabel: { fontSize: 12, color: '#6b7280' },
  filters: { display: 'flex', gap: 10, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' },
  searchBox: { display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 12px', gap: 8, flex: 1, minWidth: 200 },
  searchIcon: { fontSize: 14, opacity: 0.5 },
  searchInput: { border: 'none', outline: 'none', fontSize: 13, flex: 1, color: '#374151', background: 'none' },
  filterSelect: { padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, color: '#374151', background: '#fff', cursor: 'pointer' },
  resetBtn: { background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 12px', fontSize: 13, cursor: 'pointer', color: '#6b7280' },
  tableCard: { background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#9ca3af', letterSpacing: 0.5, background: '#f9fafb', borderBottom: '1px solid #f3f4f6' },
  tr: { borderBottom: '1px solid #f9fafb' },
  td: { padding: '11px 12px', fontSize: 13, verticalAlign: 'middle' },
  userCell: { display: 'flex', alignItems: 'center', gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0 },
  userName: { fontWeight: 600, color: '#111827', fontSize: 13 },
  userSub: { fontSize: 11, color: '#9ca3af' },
  chatId: { fontFamily: 'monospace', color: '#6b7280', fontSize: 13 },
  roleBadge: { borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 500 },
  dimText: { color: '#d1d5db' },
  statusDot: { fontSize: 12, fontWeight: 500 },
  toggle: { width: 40, height: 22, borderRadius: 11, position: 'relative', cursor: 'pointer', transition: 'background 0.2s' },
  toggleDot: { position: 'absolute', top: 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'transform 0.2s' },
  inlineInput: { padding: '4px 8px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, width: 150 },
  inlineSelect: { padding: '4px 8px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 },
  editBtn: { background: '#f3f4f6', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 14 },
  btnSave: { background: '#d1fae5', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 14, color: '#065f46' },
  btnCancel: { background: '#fee2e2', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 14, color: '#991b1b' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  modal: { background: '#fff', borderRadius: 12, padding: 28, width: 400, boxShadow: '0 10px 40px rgba(0,0,0,0.15)' },
  modalTitle: { margin: '0 0 20px', fontSize: 18, fontWeight: 700, color: '#111827' },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 },
  input: { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14, marginBottom: 14, boxSizing: 'border-box', outline: 'none' },
  modalActions: { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 },
  btnCancel2: { background: '#f3f4f6', border: 'none', borderRadius: 8, padding: '9px 18px', cursor: 'pointer', fontSize: 14 },
  btnSave2: { background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', cursor: 'pointer', fontSize: 14, fontWeight: 600 },
};
