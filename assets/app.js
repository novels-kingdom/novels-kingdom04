(function () {
  const STORAGE = {
    novels: 'nk_novels',
    users: 'nk_users',
    comments: 'nk_comments',
    session: 'nk_session',
    settings: 'nk_settings',
    legacyNovels: 'novels',
    legacyComments: 'comments'
  };

  const covers = [
    'https://images.unsplash.com/photo-1535223289827-42f1e9919769?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1519682337058-a94d519337bc?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=900&q=80'
  ];

  function uid(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  }

  function read(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      console.warn('Storage read failed:', key, error);
      return fallback;
    }
  }

  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function normalizeNovel(novel, index) {
    const id = novel.id || uid('novel');
    const status = novel.status === 'منشورة' ? 'مكتملة' : (novel.status || 'قيد النشر');
    return {
      id,
      title: novel.title || 'رواية بلا عنوان',
      author: novel.author || 'كاتب مجهول',
      authorId: novel.authorId || 'seed-admin',
      category: novel.category || 'عام',
      type: novel.type || 'عربية',
      status,
      reads: Number(novel.reads || 0),
      rating: Number(novel.rating || 4.5),
      description: novel.description || 'وصف مختصر للرواية.',
      cover: novel.cover || covers[index % covers.length],
      date: novel.date || new Date().toISOString().slice(0, 10),
      chapters: Array.isArray(novel.chapters)
        ? novel.chapters
        : [{ id: uid('chapter'), title: 'الفصل الأول', body: novel.body || 'ابدأ رحلتك القرائية من هنا. يمكن للكاتب إضافة فصول جديدة من لوحة التحكم.' }],
      featured: Boolean(novel.featured || index === 0),
      approved: novel.approved !== false,
      premium: Boolean(novel.premium)
    };
  }

  function seed() {
    const settings = read(STORAGE.settings, null) || {
      siteName: 'مملكة الروايات',
      description: 'منصة عربية احترافية لنشر الروايات وقراءتها وإدارة مجتمع القراء والكتّاب.',
      contactEmail: 'admin@novels-kingdom.local',
      patreonUrl: 'https://patreon.com/yourpage'
    };
    write(STORAGE.settings, settings);

    const users = read(STORAGE.users, null) || [
      { id: 'seed-admin', name: 'مدير المنصة', email: 'admin@site.com', password: 'admin123', role: 'admin', joinedAt: '2026-05-01' },
      { id: 'seed-author', name: 'سارة محمد', email: 'author@site.com', password: 'author123', role: 'author', joinedAt: '2026-05-03' }
    ];
    write(STORAGE.users, users);

    if (!localStorage.getItem(STORAGE.novels)) {
      const legacy = read(STORAGE.legacyNovels, []);
      const source = legacy.length ? legacy : [
        { title: 'ظلال الماضي', author: 'أحمد الكاتب', category: 'غموض', type: 'عربية', status: 'مكتملة', reads: 5847, rating: 4.8, description: 'رواية مشوقة تأخذك في رحلة عبر الزمن لكشف أسرار عائلة غامضة.', cover: covers[0], featured: true },
        { title: 'همسات القلب', author: 'سارة محمد', category: 'رومانسية', type: 'عربية', status: 'مكتملة', reads: 4521, rating: 4.6, description: 'قصة حب مؤثرة تجمع بين الواقع والخيال وتمنح القارئ تجربة عاطفية هادئة.', cover: covers[1] },
        { title: 'عالم بلا حدود', author: 'خالد عبدالله', category: 'خيال علمي', type: 'مترجمة', status: 'قيد النشر', reads: 3892, rating: 4.7, description: 'مغامرة في عالم المستقبل حيث لا حدود للخيال ولا نهاية للأسئلة الكبرى.', cover: covers[2] },
        { title: 'أسرار المدينة القديمة', author: 'منى العتيبي', category: 'مغامرات', type: 'عربية', status: 'مكتملة', reads: 3654, rating: 4.5, description: 'اكتشف أسرار مدينة عريقة مليئة بالخفايا والخرائط والممرات المنسية.', cover: covers[3] }
      ];
      write(STORAGE.novels, source.map(normalizeNovel));
    }

    if (!localStorage.getItem(STORAGE.comments)) {
      const legacyComments = read(STORAGE.legacyComments, []);
      const sourceComments = legacyComments.length ? legacyComments : [
        { name: 'محمد أحمد', text: 'موقع رائع! أحببت رواية ظلال الماضي كثيرًا 📚', date: new Date().toISOString() }
      ];
      write(STORAGE.comments, sourceComments.map((comment) => ({
        id: comment.id || uid('comment'),
        novelId: comment.novelId || null,
        userId: comment.userId || null,
        name: comment.name || 'قارئ',
        text: comment.text || '',
        date: comment.date || new Date().toISOString(),
        approved: comment.approved !== false
      })));
    }
  }

  function getNovels(includePending = false) {
    return read(STORAGE.novels, []).filter((novel) => includePending || novel.approved);
  }

  function saveNovels(novels) {
    write(STORAGE.novels, novels);
  }

  function getUsers() {
    return read(STORAGE.users, []);
  }

  function saveUsers(users) {
    write(STORAGE.users, users);
  }

  function currentUser() {
    const session = read(STORAGE.session, null);
    if (!session) return null;
    return getUsers().find((user) => user.id === session.userId) || null;
  }

  function register({ name, email, password, role }) {
    const users = getUsers();
    const normalizedEmail = email.trim().toLowerCase();
    if (users.some((user) => user.email.toLowerCase() === normalizedEmail)) {
      throw new Error('هذا البريد مسجل بالفعل. جرّب تسجيل الدخول.');
    }
    const user = {
      id: uid('user'),
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: role === 'reader' ? 'reader' : 'author',
      joinedAt: new Date().toISOString().slice(0, 10)
    };
    users.push(user);
    saveUsers(users);
    write(STORAGE.session, { userId: user.id, loggedAt: new Date().toISOString() });
    return user;
  }

  function login(email, password) {
    const normalized = email.trim().toLowerCase();
    const user = getUsers().find((item) => item.email.toLowerCase() === normalized && item.password === password);
    if (!user) throw new Error('بيانات الدخول غير صحيحة.');
    write(STORAGE.session, { userId: user.id, loggedAt: new Date().toISOString() });
    return user;
  }

  function logout() {
    localStorage.removeItem(STORAGE.session);
  }

  function saveNovel(data) {
    const novels = getNovels(true);
    const user = currentUser();
    const isAdmin = user && user.role === 'admin';
    const existingIndex = novels.findIndex((novel) => String(novel.id) === String(data.id));
    const existing = existingIndex >= 0 ? novels[existingIndex] : null;
    if (data.featured) {
      novels.forEach((item) => { item.featured = false; });
    }
    const novel = normalizeNovel({ ...existing, ...data }, novels.length);
    novel.authorId = data.authorId || existing?.authorId || user?.id || 'guest';
    novel.author = data.author || existing?.author || user?.name || 'كاتب زائر';
    novel.approved = typeof data.approved === 'boolean' ? data.approved : (isAdmin ? true : existing?.approved ?? false);
    novel.date = existing?.date || new Date().toISOString().slice(0, 10);
    if (existingIndex >= 0) novels[existingIndex] = novel;
    else novels.unshift(novel);
    saveNovels(novels);
    return novel;
  }

  function deleteNovel(id) {
    saveNovels(getNovels(true).filter((novel) => String(novel.id) !== String(id)));
  }

  function incrementRead(id) {
    const novels = getNovels(true);
    const novel = novels.find((item) => String(item.id) === String(id));
    if (novel) {
      novel.reads += 1;
      saveNovels(novels);
    }
    return novel;
  }

  function getComments(includePending = false) {
    return read(STORAGE.comments, []).filter((comment) => includePending || comment.approved);
  }

  function addComment({ novelId = null, name, text }) {
    const user = currentUser();
    const comments = getComments(true);
    comments.push({
      id: uid('comment'),
      novelId,
      userId: user?.id || null,
      name: user?.name || name || 'قارئ',
      text,
      date: new Date().toISOString(),
      approved: true
    });
    write(STORAGE.comments, comments);
  }

  function updateComment(id, changes) {
    const comments = getComments(true).map((comment) => String(comment.id) === String(id) ? { ...comment, ...changes } : comment);
    write(STORAGE.comments, comments);
  }

  function deleteComment(id) {
    write(STORAGE.comments, getComments(true).filter((comment) => String(comment.id) !== String(id)));
  }

  function getSettings() {
    return read(STORAGE.settings, {});
  }

  function saveSettings(settings) {
    write(STORAGE.settings, { ...getSettings(), ...settings });
  }

  function stats() {
    const novels = getNovels(true);
    const comments = getComments(true);
    const users = getUsers();
    return {
      novels: novels.length,
      published: novels.filter((novel) => novel.approved).length,
      pending: novels.filter((novel) => !novel.approved).length,
      reads: novels.reduce((sum, novel) => sum + Number(novel.reads || 0), 0),
      users: users.length,
      authors: users.filter((user) => user.role === 'author').length,
      comments: comments.length
    };
  }

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  }

  seed();

  window.NovelsKingdom = {
    covers,
    seed,
    read,
    write,
    getNovels,
    saveNovel,
    deleteNovel,
    incrementRead,
    getUsers,
    saveUsers,
    currentUser,
    register,
    login,
    logout,
    getComments,
    addComment,
    updateComment,
    deleteComment,
    getSettings,
    saveSettings,
    stats,
    escapeHtml,
    uid
  };
}());
