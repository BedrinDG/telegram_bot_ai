import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const managerLinks = [
  { to: '/manager', label: 'Дашборд', icon: '⊞' },
  { to: '/manager/employees', label: 'Сотрудники', icon: '👥' },
  { to: '/manager/reports', label: 'Отчёты', icon: '📄', badge: true },
];

const managerExtra = [];

const adminLinks = [
  { to: '/admin', label: 'Пользователи', icon: '👥' },
  { to: '/admin/template', label: 'Шаблоны отчётов', icon: '📋' },
  { to: '/admin/logs', label: 'Журнал событий', icon: '📜' },
];

const adminSystem = [];

const employeeLinks = [
  { to: '/employee', label: 'Мои отчёты', icon: '📄' },
];

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function getAvatarColor(name) {
  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'];
  let hash = 0;
  for (let c of (name || '')) hash += c.charCodeAt(0);
  return colors[hash % colors.length];
}

export default function Layout({ children, reportCount }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';

  const mainLinks = isAdmin ? adminLinks : isManager ? managerLinks : employeeLinks;
  const extraLinks = isAdmin ? adminSystem : isManager ? managerExtra : [];
  const extraLabel = isAdmin ? 'СИСТЕМА' : isManager ? 'ДОПОЛНИТЕЛЬНО' : '';

  const handleLogout = () => { logout(); navigate('/login'); };

  const NavLink = ({ item }) => {
    const active = location.pathname === item.to;
    return (
      <Link to={item.to} style={{ ...s.navLink, ...(active ? s.navLinkActive : {}) }}>
        <span style={s.navIcon}>{item.icon}</span>
        <span>{item.label}</span>
        {item.badge && reportCount > 0 && (
          <span style={s.badge}>{reportCount}</span>
        )}
      </Link>
    );
  };

  return (
    <div style={s.root}>
      {/* Sidebar */}
      <aside style={s.sidebar}>
        <div style={s.sidebarTop}>
          <div style={s.logoBlock}>
            <div style={s.logoIcon}>К</div>
            <div>
              <div style={s.logoTitle}>Концепт.Отчёты</div>
              {isAdmin && <div style={s.adminBadge}>ADMIN</div>}
            </div>
          </div>

          <nav style={s.nav}>
            <div style={s.navSection}>ОСНОВНОЕ</div>
            {mainLinks.map(item => <NavLink key={item.to} item={item} />)}

            {extraLinks.length > 0 && (
              <>
                <div style={{ ...s.navSection, marginTop: 24 }}>{extraLabel}</div>
                {extraLinks.map(item => <NavLink key={item.to} item={item} />)}
              </>
            )}
          </nav>
        </div>

        {/* User block */}
        <div style={s.userBlock}>
          <div style={{ ...s.userAvatar, background: getAvatarColor(user?.fullName) }}>
            {getInitials(user?.fullName)}
          </div>
          <div style={s.userInfo}>
            <div style={s.userName}>{user?.fullName || 'Пользователь'}</div>
            <div style={s.userRole}>
              {user?.role === 'admin' ? 'Администратор' : user?.role === 'manager' ? 'Руководитель отдела' : 'Сотрудник'}
            </div>
          </div>
          <button style={s.logoutBtn} onClick={handleLogout} title="Выйти">⎋</button>
        </div>
      </aside>

      {/* Main */}
      <div style={s.main}>
        <header style={s.header}>
          <div style={s.breadcrumb}>
            Главная / <span style={s.breadcrumbCurrent}>{getCurrentTitle(location.pathname)}</span>
          </div>
          <div style={s.headerRight}>
            <div style={s.searchBox}>
              <span style={s.searchIcon}>🔍</span>
              <input style={s.searchInput} placeholder="Найти сотрудника или отчёт..." />
            </div>
            <button style={s.notifBtn}>🔔</button>
          </div>
        </header>
        <div style={s.content}>{children}</div>
      </div>
    </div>
  );
}

function getCurrentTitle(path) {
  const map = {
    '/manager': 'Дашборд руководителя',
    '/manager/employees': 'Сотрудники',
    '/manager/reports': 'Отчёты',
    '/admin': 'Управление пользователями',
    '/admin/template': 'Шаблоны отчётов',
    '/admin/logs': 'Журнал событий',
    '/employee': 'Мои отчёты',
  };
  return map[path] || 'Главная';
}

const SIDEBAR_BG = '#1a1f36';
const SIDEBAR_HOVER = 'rgba(255,255,255,0.07)';
const SIDEBAR_ACTIVE = 'rgba(99,102,241,0.25)';
const ACCENT = '#6366f1';

const s = {
  root: { display: 'flex', minHeight: '100vh', fontFamily: '"Inter", "Roboto", Arial, sans-serif', background: '#f4f6fb' },
  sidebar: { width: 240, minWidth: 240, background: SIDEBAR_BG, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 100 },
  sidebarTop: { padding: '20px 0 0' },
  logoBlock: { display: 'flex', alignItems: 'center', gap: 10, padding: '0 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' },
  logoIcon: { width: 36, height: 36, borderRadius: 8, background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 16 },
  logoTitle: { color: '#fff', fontWeight: 700, fontSize: 14 },
  adminBadge: { fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600, letterSpacing: 1 },
  nav: { padding: '16px 0' },
  navSection: { fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 600, letterSpacing: 1.2, padding: '0 20px 8px' },
  navLink: { display: 'flex', alignItems: 'center', gap: 10, padding: '9px 20px', color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: 14, borderRadius: 0, transition: 'background 0.15s', position: 'relative' },
  navLinkActive: { background: SIDEBAR_ACTIVE, color: '#fff', borderRight: `3px solid ${ACCENT}` },
  navIcon: { fontSize: 16, width: 20, textAlign: 'center' },
  badge: { marginLeft: 'auto', background: '#ef4444', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 },
  userBlock: { display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.08)' },
  userAvatar: { width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0 },
  userInfo: { flex: 1, minWidth: 0 },
  userName: { color: '#fff', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  userRole: { color: 'rgba(255,255,255,0.4)', fontSize: 11 },
  logoutBtn: { background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 16, padding: 4 },
  main: { marginLeft: 240, flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' },
  header: { background: '#fff', borderBottom: '1px solid #e8eaf0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', height: 56 },
  breadcrumb: { fontSize: 13, color: '#9ca3af' },
  breadcrumbCurrent: { color: '#374151', fontWeight: 500 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 12 },
  searchBox: { display: 'flex', alignItems: 'center', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 12px', gap: 8 },
  searchIcon: { fontSize: 14, opacity: 0.5 },
  searchInput: { border: 'none', background: 'none', outline: 'none', fontSize: 13, width: 220, color: '#374151' },
  notifBtn: { background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', opacity: 0.6 },
  content: { padding: 32, flex: 1 },
};
