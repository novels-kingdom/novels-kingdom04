function novelCard(novel) {
  return `<article class="novel-card">
    <a class="novel-cover" href="novel.html?id=${encodeURIComponent(novel.id)}" aria-label="قراءة ${NK.escapeHtml(novel.title)}">📖</a>
    <div class="novel-body">
      <div class="tags">
        <span class="tag">${NK.escapeHtml(novel.category)}</span>
        <span class="tag">${NK.escapeHtml(novel.status)}</span>
      </div>
      <h3>${NK.escapeHtml(novel.title)}</h3>
<p class="novel-meta">✍️ ${NK.escapeHtml(novel.author)} · 👁️ ${Number(novel.reads).toLocaleString('ar')} · ⭐ ${Number(novel.rating).toFixed(1)}</p>
      <p class="muted">${NK.escapeHtml(novel.description)}</p>
      <a class="btn btn-secondary" href="novel.html?id=${encodeURIComponent(novel.id)}">قراءة الرواية</a>
    </div>
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

async function renderNovels() {
  const grid = document.getElementById('novelsGrid');
  if (!grid) return;

  grid.innerHTML = '<div class="empty-state">جاري تحميل الروايات...</div>';

  try {
    const novels = filterNovels(await NKBackend.getNovels());
    grid.innerHTML = novels.length
      ? novels.map(novelCard).join('')
      : '<div class="empty-state">لم نجد روايات مطابقة للبحث الحالي.</div>';
  } catch (error) {
    grid.innerHTML = `<div class="empty-state">${NK.escapeHtml(NK.formatError(error, 'تعذر تحميل الروايات.'))}</div>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('searchInput')?.addEventListener('input', renderNovels);
  document.getElementById('categoryFilter')?.addEventListener('change', renderNovels);
  renderNovels();
});  
