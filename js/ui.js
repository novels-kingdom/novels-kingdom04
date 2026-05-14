const NK_STORAGE = {
  novels: 'nk_novels_v2',
  users: 'nk_users_v2',
  session: 'nk_session_v2',
  comments: 'nk_comments_v2'
};

const seedNovels = [
  {
    id: 'shadows-of-ink',
    title: 'ظلال الحبر',
    author: 'ليان السامرائي',
    category: 'غموض',
    status: 'مستمرة',
    type: 'عربية',
    reads: 12840,
    rating: 4.8,
    description: 'كاتبة شابة تجد مخطوطة قديمة تفتح لها أبواب مدينة لا تظهر إلا في منتصف الليل.',
    chapters: [
      { title: 'الباب الذي لا ينام', body: 'في تلك الليلة، كان الحبر يلمع كأنه يعرف الطريق. مدّت ليان يدها إلى الصفحة الأولى، فسمعت المدينة تتنفس خلف الجدار.' },
      { title: 'سوق الهمسات', body: 'كل بائع كان يبيع ذكرى، وكل زائر كان يترك ظله رهينة للضوء الأزرق.' }
    ],
    publishedAt: '2026-02-18'
  },
  {
    id: 'moon-gate',
    title: 'بوابة القمر',
    author: 'رامي الأندلسي',
    category: 'فانتازيا',
    status: 'مكتملة',
    type: 'مترجمة',
    reads: 9350,
    rating: 4.6,
    description: 'رحلة عبر ممالك مضاءة بالقمر حيث يحرس الشعراء مفاتيح الزمن.',
    chapters: [
      { title: 'المفتاح الفضي', body: 'قال الحارس: لا تعبر البوابة إلا إذا تذكرت اسمك الأول، الاسم الذي نسيته قبل أن تولد.' }
    ],
    publishedAt: '2026-01-09'
  },
  {
    id: 'coffee-letters',
    title: 'رسائل القهوة',
    author: 'سارة محمود',
    category: 'رومانسي',
    status: 'مستمرة',
    type: 'عربية',
    reads: 7140,
    rating: 4.4,
    description: 'رسائل مجهولة تصل كل صباح إلى مقهى صغير وتغيّر حياة أصحابه وزواره.',
    chapters: [
      { title: 'طاولة قرب النافذة', body: 'كانت الرسالة مطوية بعناية، وعليها رائحة قهوة لا تُنسى: أرجوك لا تغادر قبل المطر.' }
    ],
    publishedAt: '2026-03-27'
  }
];
function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[char]));
}

function readStore(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}-]+/gu, '')
    .replace(/-+/g, '-') || crypto.randomUUID();
}
function writeStore(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}
function ensureData() {
  if (!localStorage.getItem(NK_STORAGE.novels)) writeStore(NK_STORAGE.novels, seedNovels);
  if (!localStorage.getItem(NK_STORAGE.users)) writeStore(NK_STORAGE.users, [{ id: 'admin', name: 'مدير المنصة', email: 'admin@novels.local', password: 'admin123', role: 'admin' }]);
  if (!localStorage.getItem(NK_STORAGE.comments)) writeStore(NK_STORAGE.comments, [{ id: crypto.randomUUID(), novelId: 'shadows-of-ink', name: 'قارئ شغوف', text: 'بداية مشوقة وأسلوب جميل!', createdAt: new Date().toISOString() }]);

function formatError(error, fallback = 'حدث خطأ غير متوقع.') {
  return error?.message || fallback;
}
function getNovels() { ensureData(); return readStore(NK_STORAGE.novels, []); }
function saveNovels(novels) { writeStore(NK_STORAGE.novels, novels); }
function getUsers() { ensureData(); return readStore(NK_STORAGE.users, []); }
function saveUsers(users) { writeStore(NK_STORAGE.users, users); }
function getSession() { return readStore(NK_STORAGE.session, null); }
function setSession(user) { writeStore(NK_STORAGE.session, { userId: user.id }); }
function currentUser() { const session = getSession(); return session ? getUsers().find((user) => user.id === session.userId) || null : null; }
function logout() { localStorage.removeItem(NK_STORAGE.session); location.href = 'index.html'; }
function getComments(novelId) { ensureData(); return readStore(NK_STORAGE.comments, []).filter((comment) => comment.novelId === novelId); }
function addComment(comment) { const comments = readStore(NK_STORAGE.comments, []); comments.push({ id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...comment }); writeStore(NK_STORAGE.comments, comments); }
function slugify(value) { return String(value).trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\p{L}\p{N}-]+/gu, '').replace(/-+/g, '-') || crypto.randomUUID(); }
function showToast(message, type = 'success') { const toast = document.createElement('div'); toast.className = `toast ${type}`; toast.textContent = message; document.body.appendChild(toast); setTimeout(() => toast.remove(), 2800); }

async function loadComponent(targetId, path) {
  const target = document.getElementById(targetId);
  if (!target) return;
  try {
    const response = await fetch(path);
    if (!response.ok) throw new Error('component unavailable');
    target.innerHTML = await response.text();
  } catch {
    target.innerHTML = '';
  }
}

async function logout() {
  try {
    await NKBackend.signOut();
    location.href = 'index.html';
  } catch (error) {
    showToast(formatError(error, 'تعذر تسجيل الخروج.'), 'error');
  }
}

async function currentUser() {
  try {
    return await NKBackend.getCurrentUser();
  } catch {
    return null;
  }
}

async function initLayout() {
  await Promise.all([
    loadComponent('app-header', 'components/header.html'),
    loadComponent('app-footer', 'components/footer.html')
  ]);

  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.site-nav');
  toggle?.addEventListener('click', () => {
    nav?.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(nav?.classList.contains('open')));
  });
  const user = currentUser();
  document.querySelectorAll('[data-guest-link]').forEach((item) => item.hidden = Boolean(user));
  document.querySelectorAll('[data-logout]').forEach((item) => { item.hidden = !user; item.addEventListener('click', logout); });

  const user = await currentUser();
  document.querySelectorAll('[data-guest-link]').forEach((item) => { item.hidden = Boolean(user); });
  document.querySelectorAll('[data-auth-link]').forEach((item) => { item.hidden = !user; });
  document.querySelectorAll('[data-logout]').forEach((item) => {
    item.hidden = !user;
    item.addEventListener('click', logout);
  });

  if (!NKBackend.isConfigured) {
    showToast('إعداد Supabase غير مكتمل. راجع js/supabase.js.', 'error');
  }
}

document.addEventListener('DOMContentLoaded', initLayout);
window.NK = { escapeHtml, getNovels, saveNovels, getUsers, saveUsers, currentUser, setSession, logout, getComments, addComment, slugify, showToast };
window.NK = { escapeHtml, slugify, showToast, formatError, currentUser, logout };
