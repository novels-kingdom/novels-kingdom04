function formatNumber(value) {
  return Number(value || 0).toLocaleString('ar');
}

function novelCard(novel) {
  const cover = novel.cover
    ? `<img src="${NK.escapeHtml(novel.cover)}" alt="غلاف ${NK.escapeHtml(novel.title)}" loading="lazy">`
    : '<span class="cover-fallback" aria-hidden="true">📖</span>';

  return `<article class="novel-card">
    <a class="novel-cover" href="novel.html?id=${encodeURIComponent(novel.id)}" aria-label="قراءة ${NK.escapeHtml(novel.title)}">${cover}</a>
    <div class="novel-body">
      <div class="tags">
        <span class="tag">${NK.escapeHtml(novel.category)}</span>
        <span class="tag">${NK.escapeHtml(novel.status)}</span>
        <span class="tag">${NK.escapeHtml(novel.type)}</span>
      </div>
      <h3>${NK.escapeHtml(novel.title)}</h3>
      <p class="novel-meta">✍️ ${NK.escapeHtml(novel.author)} · 👁️ ${formatNumber(novel.reads)} · ⭐ ${Number(novel.rating).toFixed(1)}</p>
      <p class="muted">${NK.escapeHtml(novel.description)}</p>
      <a class="btn btn-secondary" href="novel.html?id=${encodeURIComponent(novel.id)}">قراءة الرواية</a>
    </div>
  </article>`;
}

function featuredNovelCard(novel) {
  if (!novel) {
    return '<p class="muted">لا توجد روايات منشورة بعد. سجّل ككاتب وأرسل روايتك للمراجعة.</p>';
  }

  const cover = novel.cover
    ? `<img src="${NK.escapeHtml(novel.cover)}" alt="غلاف ${NK.escapeHtml(novel.title)}" loading="lazy">`
    : '<span class="cover-fallback" aria-hidden="true">📚</span>';

  return `<article class="featured-novel-card">
    <a class="featured-cover" href="novel.html?id=${encodeURIComponent(novel.id)}">${cover}</a>
    <div>
      <span class="eyebrow">الرواية المميزة</span>
      <h3>${NK.escapeHtml(novel.title)}</h3>
      <p class="novel-meta">${NK.escapeHtml(novel.author)} · ${NK.escapeHtml(novel.category)} · ${formatNumber(novel.reads)} قراءة</p>
      <p class="muted">${NK.escapeHtml(novel.description)}</p>
      <a class="btn btn-primary" href="novel.html?id=${encodeURIComponent(novel.id)}">اقرأ الآن</a>
    </div>
  </article>`;
}

function commentCard(comment) {
  const date = comment.createdAt ? new Date(comment.createdAt).toLocaleDateString('ar') : '';
  return `<article class="comment-preview">
    <div>
      <strong>${NK.escapeHtml(comment.name)}</strong>
      <span class="muted">${NK.escapeHtml(date)}</span>
    </div>
    <p>${NK.escapeHtml(comment.text)}</p>
  </article>`;
}

function filterNovels(novels) {
  const query = document.getElementById('searchInput')?.value.trim().toLowerCase() || '';
  const category = document.getElementById('categoryFilter')?.value || 'all';

  return novels.filter((novel) => {
    const searchableText = [novel.title, novel.author, novel.description].join(' ').toLowerCase();
    const matchesQuery = searchableText.includes(query);
    const matchesCategory = category === 'all' || novel.category === category;
    return matchesQuery && matchesCategory;
  });
}

function renderFilteredNovels(novels) {
  const grid = document.getElementById('novelsGrid');
  if (!grid) return;

  const filtered = filterNovels(novels);
  grid.innerHTML = filtered.length
    ? filtered.map(novelCard).join('')
    : '<div class="empty-state">لا توجد روايات مطابقة لبحثك.</div>';
}

function renderStats(stats) {
  const statsRoot = document.getElementById('homeStats');
  if (!statsRoot) return;

  const items = [
    ['novels', 'رواية منشورة', stats.novelsCount],
    ['reads', 'قراءة', stats.readsCount],
    ['comments', 'تعليق منشور', stats.commentsCount]
  ];

  statsRoot.innerHTML = items.map(([key, label, value]) => `<div class="home-stat" data-stat="${key}">
    <strong>${formatNumber(value)}</strong>
    <span>${label}</span>
  </div>`).join('');
}

async function initHomePage() {
  const grid = document.getElementById('novelsGrid');
  if (!grid) return;

  grid.innerHTML = '<div class="empty-state">جاري تحميل الروايات من Supabase...</div>';

  try {
    const [novels, stats, comments] = await Promise.all([
      NKBackend.getNovels(),
      NKBackend.getStats(),
      NKBackend.getRecentComments(4)
    ]);

    renderStats(stats);

    const featured = novels.find((novel) => novel.featured) || novels[0];
    const featuredRoot = document.getElementById('featuredNovel');
    if (featuredRoot) featuredRoot.innerHTML = featuredNovelCard(featured);

    const topRoot = document.getElementById('topNovels');
    if (topRoot) {
      const topNovels = [...novels].sort((a, b) => b.reads - a.reads).slice(0, 5);
      topRoot.innerHTML = topNovels.length
        ? topNovels.map((novel, index) => `<a href="novel.html?id=${encodeURIComponent(novel.id)}"><span>${index + 1}</span> ${NK.escapeHtml(novel.title)} <small>${formatNumber(novel.reads)} قراءة</small></a>`).join('')
        : '<p class="muted">لا توجد قراءات بعد.</p>';
    }

    const commentsRoot = document.getElementById('recentComments');
    if (commentsRoot) {
      commentsRoot.innerHTML = comments.length
        ? comments.map(commentCard).join('')
        : '<p class="muted">لا توجد تعليقات منشورة بعد.</p>';
    }

    renderFilteredNovels(novels);
    document.getElementById('searchInput')?.addEventListener('input', () => renderFilteredNovels(novels));
    document.getElementById('categoryFilter')?.addEventListener('change', () => renderFilteredNovels(novels));
  } catch (error) {
    grid.innerHTML = `<div class="empty-state">${NK.escapeHtml(NK.formatError(error, 'تعذر الاتصال بقاعدة بيانات Supabase.'))}</div>`;
  }
}

document.addEventListener('DOMContentLoaded', initHomePage);    
