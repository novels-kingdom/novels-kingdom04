function chapterTemplate(chapter, index) {
  return `<article class="chapter">
    <span class="tag">الفصل ${index + 1}</span>
    <h3>${NK.escapeHtml(chapter.title || `الفصل ${index + 1}`)}</h3>
    <p class="chapter-body">${NK.escapeHtml(chapter.body || '')}</p>
  </article>`;
}

async function renderComments(novelId) {
  const list = document.getElementById('commentsList');
  if (!list) return;
  list.innerHTML = '<p class="muted">جاري تحميل التعليقات...</p>';

  try {
    const comments = await NKBackend.getComments(novelId);
    list.innerHTML = comments.length
      ? comments.map((comment) => `<div class="comment"><strong>${NK.escapeHtml(comment.name)}</strong><p>${NK.escapeHtml(comment.text)}</p><span class="muted">${new Date(comment.createdAt).toLocaleDateString('ar')}</span></div>`).join('')
      : '<p class="muted">لا توجد تعليقات بعد.</p>';
  } catch (error) {
    list.innerHTML = `<p class="muted">${NK.escapeHtml(NK.formatError(error, 'تعذر تحميل التعليقات.'))}</p>`;
  }
}

async function renderNovelPage() {
  const root = document.getElementById('novelPage');
  if (!root) return;
  root.innerHTML = '<section class="container section"><div class="panel">جاري تحميل الرواية...</div></section>';

  try {
    const id = new URLSearchParams(location.search).get('id');
    const novel = id ? await NKBackend.getNovel(id) : null;
    if (!novel) {
      root.innerHTML = '<section class="container section"><div class="panel"><h1>الرواية غير موجودة</h1><p class="muted">ربما حُذفت أو لم تتم الموافقة عليها بعد.</p><a class="btn btn-primary" href="index.html">عودة للرئيسية</a></div></section>';
      return;
    }

    await NKBackend.incrementNovelReads(novel.id);
    novel.reads += 1;
    document.title = `${novel.title} | مملكة الروايات`;
    root.innerHTML = `<section class="container novel-hero">
      <div class="novel-art">📚</div>
      <div class="panel novel-info">
        <span class="eyebrow">${NK.escapeHtml(novel.type)} · ${NK.escapeHtml(novel.status)}</span>
        <h1>${NK.escapeHtml(novel.title)}</h1>
        <p class="lead">${NK.escapeHtml(novel.description)}</p>
        <p class="novel-meta">✍️ ${NK.escapeHtml(novel.author)} · ${NK.escapeHtml(novel.category)} · 👁️ ${Number(novel.reads).toLocaleString('ar')} · ⭐ ${novel.rating}</p>
      </div>
    </section>
    <section class="container section">
      <div class="section-head"><div><h2>الفصول</h2><p class="muted">ابدأ القراءة بالترتيب أو انتقل للفصل الذي تريده.</p></div></div>
      <div class="chapter-list">${novel.chapters.length ? novel.chapters.map(chapterTemplate).join('') : '<div class="empty-state">لم تُضاف فصول بعد.</div>'}</div>
    </section>
    <section class="container section"><div class="panel"><h2>التعليقات</h2><form id="commentForm" class="publish-form"><input class="form-control" name="name" placeholder="اسمك" required><textarea class="form-control" name="text" placeholder="اكتب تعليقك" required></textarea><button class="btn btn-primary">نشر التعليق</button></form><div id="commentsList" class="comments"></div></div></section>`;

    const user = await NK.currentUser();
    const nameInput = root.querySelector('[name="name"]');
    if (user) { nameInput.value = user.name; nameInput.readOnly = true; }

    root.querySelector('#commentForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      try {
        await NKBackend.addComment({ novelId: novel.id, name: form.get('name'), text: form.get('text') });
        event.currentTarget.reset();
        if (user) nameInput.value = user.name;
        NK.showToast('تم نشر التعليق بنجاح.');
        renderComments(novel.id);
      } catch (error) {
        NK.showToast(NK.formatError(error, 'تعذر نشر التعليق.'), 'error');
      }
    });

    renderComments(novel.id);
  } catch (error) {
    root.innerHTML = `<section class="container section"><div class="panel"><h1>تعذر تحميل الرواية</h1><p class="muted">${NK.escapeHtml(NK.formatError(error))}</p></div></section>`;
  }
}

async function handlePublish(event) {
  event.preventDefault();
  const user = await NK.currentUser();
  if (!user) {
    NK.showToast('سجّل الدخول أولًا لنشر روايتك.', 'error');
    setTimeout(() => { location.href = 'login.html'; }, 900);
    return;
  }

  const formElement = event.currentTarget;
  const button = formElement.querySelector('button[type="submit"]');
  const form = new FormData(formElement);
  const title = String(form.get('title')).trim();
  button.disabled = true;
  button.textContent = 'جاري النشر...';

  try {
    const novel = await NKBackend.createNovel({
      id: `${NK.slugify(title)}-${Date.now().toString(36)}`,
      title,
      author: String(form.get('author')).trim() || user.name,
      category: String(form.get('category')),
      status: String(form.get('status')),
      type: String(form.get('type')),
      description: String(form.get('description')).trim(),
      chapters: [{ title: String(form.get('chapterTitle')).trim() || 'الفصل الأول', body: String(form.get('chapterBody')).trim() }]
    });

    NK.showToast(user.role === 'admin' ? 'تم نشر الرواية بنجاح.' : 'تم إرسال الرواية للمراجعة. ستظهر بعد موافقة الإدارة.');
    setTimeout(() => { location.href = `novel.html?id=${encodeURIComponent(novel.id)}`; }, 900);
  } catch (error) {
    NK.showToast(NK.formatError(error, 'تعذر نشر الرواية.'), 'error');
  } finally {
    button.disabled = false;
    button.textContent = 'نشر الرواية';
  }
}

async function renderDashboard() {
  const root = document.getElementById('dashboardRoot');
  if (!root) return;
  root.innerHTML = '<div class="panel">جاري تحميل لوحة التحكم...</div>';

  try {
    const { user, novels, commentsCount, allNovels } = await NKBackend.getDashboardData();
    if (!user) {
      root.innerHTML = '<div class="panel"><h1>يلزم تسجيل الدخول</h1><p class="muted">سجّل الدخول للوصول إلى لوحة التحكم.</p><a class="btn btn-primary" href="login.html">تسجيل الدخول</a></div>';
      return;
    }

    root.innerHTML = `<div class="dashboard-hero"><div><h1>أهلًا، ${NK.escapeHtml(user.name)}</h1><p class="muted">تابع رواياتك وإحصاءات المنصة من قاعدة البيانات مباشرة.</p></div><a class="btn btn-primary" href="publish.html">نشر رواية جديدة</a></div>
    <div class="stats-grid"><div class="stat-card"><span>الروايات</span><strong>${novels.length}</strong></div><div class="stat-card"><span>القراءات</span><strong>${novels.reduce((sum, novel) => sum + Number(novel.reads || 0), 0).toLocaleString('ar')}</strong></div><div class="stat-card"><span>التعليقات</span><strong>${commentsCount}</strong></div><div class="stat-card"><span>الدور</span><strong>${user.role === 'admin' ? 'مدير' : user.role === 'author' ? 'كاتب' : 'قارئ'}</strong></div></div>
    <div class="dashboard-grid"><section class="panel table-wrap"><h2>${user.role === 'admin' ? 'كل الروايات' : 'رواياتي'}</h2><table><thead><tr><th>العنوان</th><th>التصنيف</th><th>الحالة</th><th>الموافقة</th><th>القراءات</th><th></th></tr></thead><tbody>${novels.map((novel) => `<tr><td>${NK.escapeHtml(novel.title)}</td><td>${NK.escapeHtml(novel.category)}</td><td><span class="status published">${NK.escapeHtml(novel.status)}</span></td><td>${novel.approved ? 'منشورة' : 'قيد المراجعة'}</td><td>${Number(novel.reads).toLocaleString('ar')}</td><td><a href="novel.html?id=${encodeURIComponent(novel.id)}">عرض</a></td></tr>`).join('') || '<tr><td colspan="6">لم تنشر روايات بعد.</td></tr>'}</tbody></table></section><aside class="panel"><h2>آخر النشاط</h2><div class="activity-list">${(allNovels || novels).slice(0, 4).map((novel) => `<div class="activity-item">رواية <strong>${NK.escapeHtml(novel.title)}</strong><br><span class="muted">${novel.publishedAt || 'اليوم'}</span></div>`).join('') || '<p class="muted">لا يوجد نشاط بعد.</p>'}</div></aside></div>`;
  } catch (error) {
    root.innerHTML = `<div class="panel"><h1>تعذر تحميل لوحة التحكم</h1><p class="muted">${NK.escapeHtml(NK.formatError(error))}</p></div>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderNovelPage();
  document.getElementById('publishForm')?.addEventListener('submit', handlePublish);
  renderDashboard();
});
