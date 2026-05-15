function chapterTemplate(chapter, index) {
  return `<article class="chapter">
    <span class="tag">الفصل ${index + 1}</span>
    <h3>${NK.escapeHtml(chapter.title || `الفصل ${index + 1}`)}</h3>
    <p class="chapter-body">${NK.escapeHtml(chapter.body || '')}</p>
  </article>`;
}

function commentTemplate(comment) {
  return `<div class="comment">
    <strong>${NK.escapeHtml(comment.name)}</strong>
    <p>${NK.escapeHtml(comment.text)}</p>
    <span class="muted">${new Date(comment.createdAt).toLocaleDateString('ar')}</span>
  </div>`;
}

async function renderComments(novelId) {
  const list = document.getElementById('commentsList');
  if (!list) return;

  list.innerHTML = '<p class="muted">جاري تحميل التعليقات...</p>';

  try {
    const comments = await NKBackend.getComments(novelId);
    list.innerHTML = comments.length
      ? comments.map(commentTemplate).join('')
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

    const chapters = Array.isArray(novel.chapters) ? novel.chapters : [];
    const coverMarkup = novel.cover
      ? `<img src="${NK.escapeHtml(novel.cover)}" alt="غلاف ${NK.escapeHtml(novel.title)}">`
      : '📚';

    root.innerHTML = `<section class="container novel-hero">
<div class="novel-art">${coverMarkup}</div>
      <div class="panel novel-info">
        <span class="eyebrow">${NK.escapeHtml(novel.type)} · ${NK.escapeHtml(novel.status)}</span>
        <h1>${NK.escapeHtml(novel.title)}</h1>
        <p class="lead">${NK.escapeHtml(novel.description)}</p>
<p class="novel-meta">✍️ ${NK.escapeHtml(novel.author)} · ${NK.escapeHtml(novel.category)} · 👁️ ${Number(novel.reads).toLocaleString('ar')} · ⭐ ${Number(novel.rating).toFixed(1)}</p>
      </div>
    </section>
    <section class="container section">
<div class="section-head">
        <div>
          <h2>الفصول</h2>
          <p class="muted">ابدأ القراءة بالترتيب أو انتقل للفصل الذي تريده.</p>
        </div>
      </div>
      <div class="chapter-list">${chapters.length ? chapters.map(chapterTemplate).join('') : '<p class="muted">لا توجد فصول منشورة بعد.</p>'}</div>
    </section>
    <section class="container section">
      <div class="panel">
        <h2>التعليقات</h2>
        <form id="commentForm" class="publish-form">
          <div class="form-field">
            <label for="commentName">اسمك</label>
            <input class="form-control" id="commentName" name="name" placeholder="اسمك" required>
          </div>
          <div class="form-field">
            <label for="commentText">تعليقك</label>
            <textarea class="form-control" id="commentText" name="text" placeholder="اكتب تعليقك" required></textarea>
          </div>
          <button class="btn btn-primary" type="submit">نشر التعليق</button>
        </form>
        <div id="commentsList" class="comments"></div>
      </div>
    </section>`;

    const user = await NK.currentUser();
    const nameInput = root.querySelector('[name="name"]');
if (user && nameInput) {
      nameInput.value = user.name;
      nameInput.readOnly = true;
    }

    root.querySelector('#commentForm')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const button = event.currentTarget.querySelector('button[type="submit"]');
      button.disabled = true;

      try {
        await NKBackend.addComment({
          novelId: novel.id,
          name: String(form.get('name')).trim(),
          text: String(form.get('text')).trim()
        });
                NK.showToast(user?.role === 'admin' ? 'تم نشر التعليق بنجاح.' : 'تم إرسال التعليق للمراجعة. سيظهر بعد موافقة الإدارة.');
event.currentTarget.reset();
        if (user && nameInput) nameInput.value = user.name;
        await renderComments(novel.id);
      } catch (error) {
        NK.showToast(NK.formatError(error, 'تعذر نشر التعليق.'), 'error');
      } finally {
        button.disabled = false;
      }
    });

await renderComments(novel.id);
  } catch (error) {
    root.innerHTML = `<section class="container section"><div class="panel">${NK.escapeHtml(NK.formatError(error, 'تعذر تحميل الرواية.'))}</div></section>`;
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
  const originalText = button?.textContent || 'نشر الرواية';
  const form = new FormData(formElement);
  const title = String(form.get('title')).trim();

  if (button) {
    button.disabled = true;
    button.textContent = 'جاري الإرسال...';
  }

  try {
    const novel = await NKBackend.createNovel({
      id: `${NK.slugify(title)}-${Date.now().toString(36)}`,
      title,
      author: String(form.get('author')).trim() || user.name,
      category: String(form.get('category')),
      status: String(form.get('status')),
      type: String(form.get('type')),
      cover: String(form.get('cover') || '').trim(),
      description: String(form.get('description')).trim(),
chapters: [{
        title: String(form.get('chapterTitle')).trim() || 'الفصل الأول',
        body: String(form.get('chapterBody')).trim()
      }]
    });

    NK.showToast(user.role === 'admin' ? 'تم نشر الرواية بنجاح.' : 'تم إرسال الرواية للمراجعة. ستظهر بعد موافقة الإدارة.');
    formElement.reset();
    setTimeout(() => { location.href = `novel.html?id=${encodeURIComponent(novel.id)}`; }, 900);
  } catch (error) {
    NK.showToast(NK.formatError(error, 'تعذر نشر الرواية.'), 'error');
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = originalText;
    }
  }
}

function dashboardNovelRow(novel, canManage = false) {
  const statusClass = novel.approved ? 'published' : 'draft';
  const approvalLabel = novel.approved ? 'إلغاء النشر' : 'اعتماد النشر';
  const actions = canManage
    ? `<div class="dashboard-actions">
        <button class="btn btn-small btn-secondary" type="button" data-novel-approval="${NK.escapeHtml(novel.id)}" data-approved="${String(!novel.approved)}">${approvalLabel}</button>
        <button class="btn btn-small btn-danger" type="button" data-novel-delete="${NK.escapeHtml(novel.id)}">حذف</button>
      </div>`
    : '';

  return `<article class="activity-item">
    <div>
      <h3>${NK.escapeHtml(novel.title)}</h3>
      <p class="muted">${NK.escapeHtml(novel.category)} · ${NK.escapeHtml(novel.status)} · ${Number(novel.reads).toLocaleString('ar')} قراءة</p>
    </div>
    <div class="dashboard-row-meta">
      <span class="status ${statusClass}">${novel.approved ? 'منشورة' : 'بانتظار المراجعة'}</span>
      ${actions}
    </div>
  </article>`;
}

function dashboardCommentRow(comment) {
  const date = comment.createdAt ? new Date(comment.createdAt).toLocaleDateString('ar') : '';
  return `<article class="activity-item">
    <div>
      <h3>${NK.escapeHtml(comment.name)}</h3>
      <p class="muted">${NK.escapeHtml(comment.text)}</p>
      <small class="muted">${NK.escapeHtml(date)}</small>
    </div>
    <div class="dashboard-row-meta">
      <span class="status ${comment.approved ? 'published' : 'draft'}">${comment.approved ? 'منشور' : 'بانتظار المراجعة'}</span>
      <div class="dashboard-actions">
        <button class="btn btn-small btn-secondary" type="button" data-comment-approval="${NK.escapeHtml(comment.id)}" data-approved="${String(!comment.approved)}">${comment.approved ? 'إخفاء' : 'اعتماد'}</button>
        <button class="btn btn-small btn-danger" type="button" data-comment-delete="${NK.escapeHtml(comment.id)}">حذف</button>
      </div>
    </div>
  </article>`;
}

async function handleDashboardAction(event) {
  const approvalNovelId = event.target.closest('[data-novel-approval]')?.dataset.novelApproval;
  const deleteNovelId = event.target.closest('[data-novel-delete]')?.dataset.novelDelete;
  const approvalCommentId = event.target.closest('[data-comment-approval]')?.dataset.commentApproval;
  const deleteCommentId = event.target.closest('[data-comment-delete]')?.dataset.commentDelete;

  if (!approvalNovelId && !deleteNovelId && !approvalCommentId && !deleteCommentId) return;

  const button = event.target.closest('button');
  if (button) button.disabled = true;

  try {
    if (approvalNovelId) {
      await NKBackend.setNovelApproval(approvalNovelId, event.target.closest('[data-novel-approval]').dataset.approved === 'true');
      NK.showToast('تم تحديث حالة الرواية.');
    }

    if (deleteNovelId) {
      if (!confirm('هل أنت متأكد من حذف هذه الرواية وكل تعليقاتها؟')) return;
      await NKBackend.deleteNovel(deleteNovelId);
      NK.showToast('تم حذف الرواية.');
    }

    if (approvalCommentId) {
      await NKBackend.setCommentApproval(approvalCommentId, event.target.closest('[data-comment-approval]').dataset.approved === 'true');
      NK.showToast('تم تحديث حالة التعليق.');
    }

    if (deleteCommentId) {
      if (!confirm('هل أنت متأكد من حذف هذا التعليق؟')) return;
      await NKBackend.deleteComment(deleteCommentId);
      NK.showToast('تم حذف التعليق.');
    }

    await renderDashboard();
  } catch (error) {
    NK.showToast(NK.formatError(error, 'تعذر تنفيذ العملية.'), 'error');
  } finally {
    if (button) button.disabled = false;
  }
}

async function renderDashboard() {
  const root = document.getElementById('dashboardRoot');
  if (!root) return;

  root.innerHTML = '<section class="panel"><p class="muted">جاري تحميل لوحة التحكم...</p></section>';

  try {
    const { user, novels, comments = [], commentsCount, allNovels } = await NKBackend.getDashboardData();

    if (!user) {
      root.innerHTML = `<section class="panel">
        <span class="eyebrow">تسجيل الدخول مطلوب</span>
        <h1>لوحة التحكم</h1>
        <p class="muted">سجّل الدخول لمتابعة رواياتك وتعليقاتك.</p>
        <a class="btn btn-primary" href="login.html">تسجيل الدخول</a>
      </section>`;
      return;
    }

    const canManage = user.role === 'admin'
    const totalNovels = canManage ? allNovels.length : novels.length;
    const pendingNovels = novels.filter((novel) => !novel.approved).length;
    const pendingComments = comments.filter((comment) => !comment.approved).length;

    root.innerHTML = `<section class="dashboard-hero panel">
      <div>
        <span class="eyebrow">${canManage ? 'مدير المنصة' : 'حساب الكاتب'}</span>
        <h1>مرحبًا، ${NK.escapeHtml(user.name)}</h1>
        <p class="muted">${NK.escapeHtml(user.email)}</p>
      </div>
      <a class="btn btn-primary" href="publish.html">نشر رواية جديدة</a>
    </section>

    <section class="stats-grid">
      <article class="stat-card"><strong>${totalNovels}</strong><span>رواية</span></article>
      <article class="stat-card"><strong>${pendingNovels}</strong><span>رواية بانتظار المراجعة</span></article>
      <article class="stat-card"><strong>${canManage ? pendingComments : commentsCount}</strong><span>${canManage ? 'تعليق بانتظار المراجعة' : 'تعليق'}</span></article>
    </section>

    <section class="panel">
      <div class="section-head">
        <div>
<h2>${canManage ? 'إدارة الروايات' : 'رواياتي'}</h2>
          <p class="muted">${canManage ? 'اعتمد الروايات أو ألغِ نشرها أو احذف غير المناسب.' : 'تابع حالة الروايات وأرقام القراءة.'}</p>
        </div>
      </div>
      <div class="activity-list">
${novels.length ? novels.map((novel) => dashboardNovelRow(novel, canManage)).join('') : '<p class="muted">لا توجد روايات بعد.</p>'}
      </div>
</section>

    ${canManage ? `<section class="panel">
      <div class="section-head">
        <div>
          <h2>مراجعة التعليقات</h2>
          <p class="muted">التعليقات الجديدة تبقى مخفية حتى تعتمدها الإدارة.</p>
        </div>
      </div>
      <div class="activity-list">
        ${comments.length ? comments.map(dashboardCommentRow).join('') : '<p class="muted">لا توجد تعليقات للمراجعة.</p>'}
      </div>
    </section>` : ''}`;

    root.removeEventListener('click', handleDashboardAction);
    root.addEventListener('click', handleDashboardAction);
  } catch (error) {
root.innerHTML = `<section class="panel"><p class="muted">${NK.escapeHtml(NK.formatError(error, 'تعذر تحميل لوحة التحكم.'))}</p></section>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderNovelPage();
    renderDashboard();
  document.getElementById('publishForm')?.addEventListener('submit', handlePublish);
});
