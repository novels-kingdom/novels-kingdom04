function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[char]));
}

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}-]+/gu, '')
    .replace(/-+/g, '-') || crypto.randomUUID();
}

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

function formatError(error, fallback = 'حدث خطأ غير متوقع.') {
  return error?.message || fallback;
}

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
window.NK = { escapeHtml, slugify, showToast, formatError, currentUser, logout };
