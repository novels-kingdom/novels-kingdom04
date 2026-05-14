 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/assets/app.js b/assets/app.js
index 9ba67922b0eca6a99f8207db97b7b79e88975699..7217fbc2cadfd417b386fc0d4ef6d5a6d6491aec 100644
--- a/assets/app.js
+++ b/assets/app.js
@@ -1,520 +1,474 @@
 (function () {
+  'use strict';
+
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
-    'https://images.unsplash.com/photo-1535223289827-42f1e9919769?auto=format&fit=crop&w=900&q=80',
+    'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=900&q=80',
     'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=900&q=80',
-    'https://images.unsplash.com/photo-1519682337058-a94d519337bc?auto=format&fit=crop&w=900&q=80',
-    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=900&q=80'
+    'https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&w=900&q=80',
+    'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=900&q=80'
   ];
 
   const config = window.NK_SUPABASE || {};
   const hasSupabase = Boolean(config.url && config.publishableKey && window.supabase?.createClient);
   const supabaseClient = hasSupabase
     ? window.supabase.createClient(config.url, config.publishableKey, {
       auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
     })
     : null;
-
   let remoteReady = false;
 
-  function uid(prefix) {
-    if (crypto?.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
-    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
+  function uid(prefix = 'id') {
+    if (window.crypto?.randomUUID) return `${prefix}-${window.crypto.randomUUID()}`;
+    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
   }
 
   function read(key, fallback) {
     try {
       const value = localStorage.getItem(key);
       return value ? JSON.parse(value) : fallback;
     } catch (error) {
-      console.warn('Storage read failed:', key, error);
+      console.warn('تعذر قراءة التخزين المحلي:', key, error);
       return fallback;
     }
   }
 
   function write(key, value) {
     localStorage.setItem(key, JSON.stringify(value));
   }
 
-  function normalizeNovel(novel, index) {
-  function normalizeNovel(novel, index = 0) {
-    const id = novel.id || uid('novel');
-    const status = novel.status === 'منشورة' ? 'مكتملة' : (novel.status || 'قيد النشر');
-    return {
-      id,
-      title: novel.title || 'رواية بلا عنوان',
-      author: novel.author || 'كاتب مجهول',
-      authorId: novel.authorId || 'seed-admin',
-      category: novel.category || 'عام',
-      type: novel.type || 'عربية',
-      title: String(novel.title || 'رواية بلا عنوان').trim(),
-      author: String(novel.author || 'كاتب مجهول').trim(),
-      authorId: novel.authorId || novel.author_id || 'guest',
-      category: String(novel.category || 'عام').trim(),
-      type: novel.type === 'مترجمة' ? 'مترجمة' : 'عربية',
-      status,
-      reads: Number(novel.reads || 0),
-      rating: Number(novel.rating || 4.5),
-      description: novel.description || 'وصف مختصر للرواية.',
-      description: String(novel.description || 'وصف مختصر للرواية.').trim(),
-      cover: novel.cover || covers[index % covers.length],
-      date: novel.date || new Date().toISOString().slice(0, 10),
-      chapters: Array.isArray(novel.chapters)
-      date: novel.date || novel.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
-      chapters: Array.isArray(novel.chapters) && novel.chapters.length
-        ? novel.chapters
-        : [{ id: uid('chapter'), title: 'الفصل الأول', body: novel.body || 'ابدأ رحلتك القرائية من هنا. يمكن للكاتب إضافة فصول جديدة من لوحة التحكم.' }],
-        : [{ id: uid('chapter'), title: 'الفصل الأول', body: novel.body || 'ابدأ رحلتك القرائية من هنا.' }],
-      featured: Boolean(novel.featured || index === 0),
-      approved: novel.approved !== false,
-      premium: Boolean(novel.premium)
-    };
-  }
-
-  function seed() {
   function sanitizeText(value, max = 5000) {
     return String(value || '').replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, max);
   }
 
   function validateUrl(url) {
     if (!url) return '';
     try {
       const parsed = new URL(url);
       return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : '';
     } catch {
       return '';
     }
   }
 
   function escapeHtml(value = '') {
-    return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
+    return String(value).replace(/[&<>'"]/g, (char) => ({
+      '&': '&amp;',
+      '<': '&lt;',
+      '>': '&gt;',
+      "'": '&#39;',
+      '"': '&quot;'
+    }[char]));
   }
 
   async function sha256(value) {
-    const data = new TextEncoder().encode(value);
+    const data = new TextEncoder().encode(String(value));
     const hash = await crypto.subtle.digest('SHA-256', data);
     return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
   }
 
-  function seedLocalData() {
-    const settings = read(STORAGE.settings, null) || {
-      siteName: 'مملكة الروايات',
-      description: 'منصة عربية احترافية لنشر الروايات وقراءتها وإدارة مجتمع القراء والكتّاب.',
-      contactEmail: 'admin@novels-kingdom.local',
-      patreonUrl: 'https://patreon.com/yourpage'
+  function normalizeChapter(chapter, index = 0) {
+    return {
+      id: chapter?.id || uid('chapter'),
+      title: sanitizeText(chapter?.title || `الفصل ${index + 1}`, 180),
+      body: sanitizeText(chapter?.body || 'لم يضف الكاتب نص هذا الفصل بعد.', 50000)
     };
-    write(STORAGE.settings, settings);
+  }
+
+  function normalizeNovel(novel = {}, index = 0) {
+    const status = novel.status === 'منشورة' ? 'مكتملة' : sanitizeText(novel.status || 'قيد النشر', 40);
+    const chapters = Array.isArray(novel.chapters) && novel.chapters.length
+      ? novel.chapters.map(normalizeChapter)
+      : [normalizeChapter({ title: 'الفصل الأول', body: novel.body || 'اكتب الفصل الأول من هذه الرواية من لوحة التحكم.' })];
+
+    return {
+      id: String(novel.id || uid('novel')),
+      title: sanitizeText(novel.title || 'رواية بلا عنوان', 180),
+      author: sanitizeText(novel.author || 'كاتب مستقل', 120),
+      authorId: novel.authorId || novel.author_id || null,
+      category: sanitizeText(novel.category || 'عام', 80),
+      type: novel.type === 'مترجمة' ? 'مترجمة' : 'عربية',
+      status: ['مكتملة', 'قيد النشر'].includes(status) ? status : 'قيد النشر',
+      reads: Number(novel.reads || 0),
+      rating: Number(novel.rating || 4.6),
+      description: sanitizeText(novel.description || 'وصف مختصر للرواية يظهر للقراء قبل البدء.', 1500),
+      cover: validateUrl(novel.cover) || covers[index % covers.length],
+      date: novel.date || novel.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
+      chapters,
+      featured: Boolean(novel.featured || index === 0),
+      approved: novel.approved !== false,
+      premium: Boolean(novel.premium)
+    };
+  }
+
+  function seedLocalData() {
+    if (!localStorage.getItem(STORAGE.settings)) {
+      write(STORAGE.settings, {
+        siteName: 'مملكة الروايات',
+        description: 'منصة عربية احترافية للقراءة ونشر الروايات والفصول ومناقشة الأعمال الأدبية.',
+        contactEmail: 'hello@novels-kingdom.com',
+        patreonUrl: '#membership'
+      });
+    }
 
-    const users = read(STORAGE.users, null) || [
-      { id: 'seed-admin', name: 'مدير المنصة', email: 'admin@site.com', password: 'admin123', role: 'admin', joinedAt: '2026-05-01' },
-      { id: 'seed-author', name: 'سارة محمد', email: 'author@site.com', password: 'author123', role: 'author', joinedAt: '2026-05-03' }
-    ];
-    write(STORAGE.users, users);
     if (!localStorage.getItem(STORAGE.users)) write(STORAGE.users, []);
 
     if (!localStorage.getItem(STORAGE.novels)) {
       const legacy = read(STORAGE.legacyNovels, []);
-      const source = legacy.length ? legacy : [
-        { title: 'ظلال الماضي', author: 'أحمد الكاتب', category: 'غموض', type: 'عربية', status: 'مكتملة', reads: 5847, rating: 4.8, description: 'رواية مشوقة تأخذك في رحلة عبر الزمن لكشف أسرار عائلة غامضة.', cover: covers[0], featured: true },
-        { title: 'همسات القلب', author: 'سارة محمد', category: 'رومانسية', type: 'عربية', status: 'مكتملة', reads: 4521, rating: 4.6, description: 'قصة حب مؤثرة تجمع بين الواقع والخيال وتمنح القارئ تجربة عاطفية هادئة.', cover: covers[1] },
-        { title: 'عالم بلا حدود', author: 'خالد عبدالله', category: 'خيال علمي', type: 'مترجمة', status: 'قيد النشر', reads: 3892, rating: 4.7, description: 'مغامرة في عالم المستقبل حيث لا حدود للخيال ولا نهاية للأسئلة الكبرى.', cover: covers[2] },
-        { title: 'أسرار المدينة القديمة', author: 'منى العتيبي', category: 'مغامرات', type: 'عربية', status: 'مكتملة', reads: 3654, rating: 4.5, description: 'اكتشف أسرار مدينة عريقة مليئة بالخفايا والخرائط والممرات المنسية.', cover: covers[3] }
+      const starter = legacy.length ? legacy : [
+        {
+          title: 'ظلال المكتبة الأخيرة',
+          author: 'فريق التحرير',
+          category: 'غموض',
+          type: 'عربية',
+          status: 'قيد النشر',
+          reads: 18420,
+          rating: 4.9,
+          featured: true,
+          description: 'في مدينة لا تنام، يكتشف أمين مكتبة مخطوطة تقود إلى تاريخ مخفي يربط القراء بأسرار قديمة.',
+          cover: covers[0],
+          chapters: [{ title: 'باب من ورق', body: 'كان المطر يطرق زجاج المكتبة كأنّه يطلب الدخول. في تلك الليلة وجد يونس رسالة مطوية بين صفحات كتاب لم يستعِره أحد منذ عقود...' }]
+        },
+        {
+          title: 'مدن على حافة الضوء',
+          author: 'ليان المغربي',
+          category: 'خيال علمي',
+          type: 'عربية',
+          status: 'مكتملة',
+          reads: 12980,
+          rating: 4.7,
+          description: 'رحلة مستقبلية بين مدن عائمة تبحث عن ذاكرة الأرض بعد انطفاء الخرائط القديمة.',
+          cover: covers[1]
+        },
+        {
+          title: 'ترجمة: حديقة الرماد',
+          author: 'دار الترجمة',
+          category: 'دراما',
+          type: 'مترجمة',
+          status: 'مكتملة',
+          reads: 9300,
+          rating: 4.6,
+          description: 'عمل مترجم بلغة عربية سلسة عن عائلة تحاول ترميم ما بقي من بيتها وذاكرتها.',
+          cover: covers[2]
+        }
       ];
-      write(STORAGE.novels, source.map(normalizeNovel));
+      write(STORAGE.novels, starter.map(normalizeNovel));
     }
 
     if (!localStorage.getItem(STORAGE.comments)) {
       const legacyComments = read(STORAGE.legacyComments, []);
-      const sourceComments = legacyComments.length ? legacyComments : [
-        { name: 'محمد أحمد', text: 'موقع رائع! أحببت رواية ظلال الماضي كثيرًا 📚', date: new Date().toISOString() }
-      ];
-      write(STORAGE.comments, sourceComments.map((comment) => ({
-        id: comment.id || uid('comment'),
-        novelId: comment.novelId || null,
-        userId: comment.userId || null,
-        name: comment.name || 'قارئ',
-        text: comment.text || '',
-        date: comment.date || new Date().toISOString(),
-        novelId: comment.novelId || comment.novel_id || null,
-        userId: comment.userId || comment.user_id || null,
-        name: sanitizeText(comment.name || 'قارئ', 80),
-        text: sanitizeText(comment.text || '', 1000),
-        date: comment.date || comment.created_at || new Date().toISOString(),
-        approved: comment.approved !== false
-      })));
+      write(STORAGE.comments, legacyComments.map(normalizeComment));
     }
   }
 
+  function normalizeComment(comment = {}) {
+    return {
+      id: String(comment.id || uid('comment')),
+      novelId: comment.novelId || comment.novel_id || null,
+      userId: comment.userId || comment.user_id || null,
+      name: sanitizeText(comment.name || 'قارئ', 80),
+      text: sanitizeText(comment.text || '', 1000),
+      date: comment.date || comment.created_at || new Date().toISOString(),
+      approved: comment.approved !== false
+    };
+  }
+
   function fromNovelRow(row, index) {
     return normalizeNovel({ ...row, authorId: row.author_id, date: row.created_at?.slice(0, 10) || row.date }, index);
   }
 
   function toNovelRow(novel) {
     return {
       id: String(novel.id),
       title: sanitizeText(novel.title, 180),
       author: sanitizeText(novel.author, 120),
       author_id: novel.authorId || null,
       category: sanitizeText(novel.category, 80),
       type: novel.type,
       status: novel.status,
       reads: Number(novel.reads || 0),
-      rating: Number(novel.rating || 4.5),
+      rating: Number(novel.rating || 4.6),
       description: sanitizeText(novel.description, 1500),
       cover: validateUrl(novel.cover) || covers[0],
-      chapters: Array.isArray(novel.chapters) ? novel.chapters.map((chapter) => ({
-        id: chapter.id || uid('chapter'),
-        title: sanitizeText(chapter.title, 180),
-        body: sanitizeText(chapter.body, 50000)
-      })) : [],
+      chapters: Array.isArray(novel.chapters) ? novel.chapters.map(normalizeChapter) : [],
       featured: Boolean(novel.featured),
       approved: Boolean(novel.approved),
       premium: Boolean(novel.premium)
     };
   }
 
-  function fromCommentRow(row) {
-    return {
-      id: row.id,
-      novelId: row.novel_id || null,
-      userId: row.user_id || null,
-      name: row.name || 'قارئ',
-      text: row.text || '',
-      date: row.created_at || new Date().toISOString(),
-      approved: row.approved !== false
-    };
-  }
-
-  function currentUser() {
-    const session = read(STORAGE.session, null);
-    if (!session) return null;
-    return getUsers().find((user) => user.id === session.userId) || session.user || null;
-  }
-
   function getNovels(includePending = false) {
-    return read(STORAGE.novels, []).filter((novel) => includePending || novel.approved);
+    return read(STORAGE.novels, []).map(normalizeNovel).filter((novel) => includePending || novel.approved);
   }
 
   function saveNovels(novels) {
-    write(STORAGE.novels, novels);
-    write(STORAGE.novels, novels.map(normalizeNovel));
+    const normalized = novels.map(normalizeNovel);
+    if (normalized.some((novel) => novel.featured)) {
+      let featuredSeen = false;
+      normalized.forEach((novel) => {
+        if (novel.featured && !featuredSeen) featuredSeen = true;
+        else if (novel.featured) novel.featured = false;
+      });
+    }
+    write(STORAGE.novels, normalized);
   }
 
   function getUsers() {
     return read(STORAGE.users, []);
   }
 
   function saveUsers(users) {
-    write(STORAGE.users, users);
+    write(STORAGE.users, users.map((user) => ({
+      ...user,
+      name: sanitizeText(user.name, 100),
+      email: sanitizeText(user.email, 180).toLowerCase(),
+      role: ['admin', 'author', 'reader'].includes(user.role) ? user.role : 'reader'
+    })));
   }
 
   function currentUser() {
     const session = read(STORAGE.session, null);
     if (!session) return null;
-    return getUsers().find((user) => user.id === session.userId) || null;
-  function getComments(includePending = false) {
-    return read(STORAGE.comments, []).filter((comment) => includePending || comment.approved);
-  }
-
-  function register({ name, email, password, role }) {
-    const users = getUsers();
-    const normalizedEmail = email.trim().toLowerCase();
-    if (users.some((user) => user.email.toLowerCase() === normalizedEmail)) {
-      throw new Error('هذا البريد مسجل بالفعل. جرّب تسجيل الدخول.');
-  function getSettings() {
-    return read(STORAGE.settings, {});
+    return getUsers().find((user) => user.id === session.userId) || session.user || null;
   }
 
   async function refreshSession() {
     if (!supabaseClient) return currentUser();
-    const { data: authData } = await supabaseClient.auth.getUser();
-    if (!authData?.user) {
-      localStorage.removeItem(STORAGE.session);
-      return null;
-    }
+    const { data } = await supabaseClient.auth.getUser();
+    if (!data?.user) return currentUser();
     const { data: profile } = await supabaseClient
       .from('profiles')
       .select('id,name,email,role,created_at')
-      .eq('id', authData.user.id)
+      .eq('id', data.user.id)
       .maybeSingle();
     const user = {
-      id: uid('user'),
-      name: name.trim(),
-      email: normalizedEmail,
-      password,
-      role: role === 'reader' ? 'reader' : 'author',
-      joinedAt: new Date().toISOString().slice(0, 10)
-      id: authData.user.id,
-      name: profile?.name || authData.user.user_metadata?.name || authData.user.email?.split('@')[0] || 'مستخدم',
-      email: profile?.email || authData.user.email || '',
-      role: profile?.role || authData.user.user_metadata?.role || 'reader',
-      joinedAt: (profile?.created_at || authData.user.created_at || new Date().toISOString()).slice(0, 10)
+      id: data.user.id,
+      name: profile?.name || data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'مستخدم',
+      email: profile?.email || data.user.email || '',
+      role: profile?.role || data.user.user_metadata?.role || 'reader',
+      joinedAt: (profile?.created_at || data.user.created_at || new Date().toISOString()).slice(0, 10)
     };
-    const users = getUsers().filter((item) => item.id !== user.id);
-    users.push(user);
-    saveUsers(users);
-    write(STORAGE.session, { userId: user.id, loggedAt: new Date().toISOString() });
+    saveUsers([...getUsers().filter((item) => item.id !== user.id), user]);
     write(STORAGE.session, { userId: user.id, user, loggedAt: new Date().toISOString() });
     return user;
   }
 
-  function login(email, password) {
-    const normalized = email.trim().toLowerCase();
-    const user = getUsers().find((item) => item.email.toLowerCase() === normalized && item.password === password);
   async function syncFromSupabase() {
     if (!supabaseClient) return;
     const [settingsResult, novelsResult, commentsResult, profilesResult] = await Promise.all([
       supabaseClient.from('settings').select('*').eq('id', 'main').maybeSingle(),
       supabaseClient.from('novels').select('*').order('created_at', { ascending: false }),
       supabaseClient.from('comments').select('*').order('created_at', { ascending: false }),
       supabaseClient.from('profiles').select('id,name,email,role,created_at')
     ]);
 
     if (!settingsResult.error && settingsResult.data) write(STORAGE.settings, settingsResult.data.value || {});
     if (!novelsResult.error && Array.isArray(novelsResult.data)) write(STORAGE.novels, novelsResult.data.map(fromNovelRow));
-    if (!commentsResult.error && Array.isArray(commentsResult.data)) write(STORAGE.comments, commentsResult.data.map(fromCommentRow));
+    if (!commentsResult.error && Array.isArray(commentsResult.data)) write(STORAGE.comments, commentsResult.data.map(normalizeComment));
     if (!profilesResult.error && Array.isArray(profilesResult.data)) {
-      write(STORAGE.users, profilesResult.data.map((profile) => ({
+      saveUsers(profilesResult.data.map((profile) => ({
         id: profile.id,
         name: profile.name || 'مستخدم',
         email: profile.email || '',
         role: profile.role || 'reader',
         joinedAt: (profile.created_at || new Date().toISOString()).slice(0, 10)
       })));
     }
     remoteReady = true;
   }
 
-  async function register({ name, email, password, role }) {
-    const normalizedEmail = sanitizeText(email, 180).toLowerCase();
+  async function register({ name, email, password, role = 'reader' }) {
     const cleanName = sanitizeText(name, 100);
-    const cleanRole = role === 'reader' ? 'reader' : 'author';
+    const normalizedEmail = sanitizeText(email, 180).toLowerCase();
+    const cleanRole = role === 'author' ? 'author' : 'reader';
     if (!cleanName || !normalizedEmail || String(password || '').length < 8) {
       throw new Error('أدخل اسمًا وبريدًا صحيحين وكلمة مرور لا تقل عن 8 أحرف.');
     }
 
     if (supabaseClient) {
       const { data, error } = await supabaseClient.auth.signUp({
         email: normalizedEmail,
         password,
         options: { data: { name: cleanName, role: cleanRole } }
       });
       if (error) throw new Error(error.message);
-      const authUser = data.user;
-      if (!authUser) throw new Error('تحقق من بريدك لإكمال التسجيل.');
-      await supabaseClient.from('profiles').upsert({ id: authUser.id, name: cleanName, email: normalizedEmail, role: cleanRole });
+      if (!data.user) throw new Error('تحقق من بريدك لإكمال التسجيل.');
+      await supabaseClient.from('profiles').upsert({ id: data.user.id, name: cleanName, email: normalizedEmail, role: cleanRole });
       return refreshSession();
     }
 
     const users = getUsers();
-    if (users.some((user) => user.email.toLowerCase() === normalizedEmail)) throw new Error('هذا البريد مسجل بالفعل.');
+    if (users.some((user) => user.email === normalizedEmail)) throw new Error('هذا البريد مسجل بالفعل.');
     const user = { id: uid('user'), name: cleanName, email: normalizedEmail, passwordHash: await sha256(password), role: cleanRole, joinedAt: new Date().toISOString().slice(0, 10) };
-    users.push(user);
-    saveUsers(users);
+    saveUsers([...users, user]);
     write(STORAGE.session, { userId: user.id, user, loggedAt: new Date().toISOString() });
     return user;
   }
 
   async function login(email, password) {
-    const normalized = sanitizeText(email, 180).toLowerCase();
+    const normalizedEmail = sanitizeText(email, 180).toLowerCase();
     if (supabaseClient) {
-      const { error } = await supabaseClient.auth.signInWithPassword({ email: normalized, password });
+      const { error } = await supabaseClient.auth.signInWithPassword({ email: normalizedEmail, password });
       if (error) throw new Error('بيانات الدخول غير صحيحة أو البريد لم يتم تأكيده.');
       return refreshSession();
     }
+
     const passwordHash = await sha256(password);
-    const user = getUsers().find((item) => item.email.toLowerCase() === normalized && item.passwordHash === passwordHash);
+    const user = getUsers().find((item) => item.email === normalizedEmail && (item.passwordHash === passwordHash || item.password === password));
     if (!user) throw new Error('بيانات الدخول غير صحيحة.');
-    write(STORAGE.session, { userId: user.id, loggedAt: new Date().toISOString() });
     write(STORAGE.session, { userId: user.id, user, loggedAt: new Date().toISOString() });
     return user;
   }
 
-  function logout() {
   async function logout() {
-    if (supabaseClient) await supabaseClient.auth.signOut();
+    if (supabaseClient) await supabaseClient.auth.signOut().catch(console.warn);
     localStorage.removeItem(STORAGE.session);
   }
 
   function saveNovel(data) {
-    const novels = getNovels(true);
     const user = currentUser();
-    const isAdmin = user && user.role === 'admin';
     const isAdmin = user?.role === 'admin';
+    const novels = getNovels(true);
     const existingIndex = novels.findIndex((novel) => String(novel.id) === String(data.id));
     const existing = existingIndex >= 0 ? novels[existingIndex] : null;
-    if (data.featured) {
-      novels.forEach((item) => { item.featured = false; });
-    }
-    const novel = normalizeNovel({ ...existing, ...data }, novels.length);
-    novel.authorId = data.authorId || existing?.authorId || user?.id || 'guest';
-    novel.author = data.author || existing?.author || user?.name || 'كاتب زائر';
-    if (data.featured) novels.forEach((item) => { item.featured = false; });
+    if (data.featured) novels.forEach((novel) => { novel.featured = false; });
+
     const novel = normalizeNovel({ ...existing, ...data, cover: validateUrl(data.cover) || existing?.cover || covers[0] }, novels.length);
     novel.authorId = data.authorId || existing?.authorId || user?.id || null;
-    novel.author = sanitizeText(data.author || existing?.author || user?.name || 'كاتب زائر', 120);
+    novel.author = sanitizeText(data.author || existing?.author || user?.name || 'كاتب مستقل', 120);
     novel.approved = typeof data.approved === 'boolean' ? data.approved : (isAdmin ? true : existing?.approved ?? false);
     novel.date = existing?.date || new Date().toISOString().slice(0, 10);
+
     if (existingIndex >= 0) novels[existingIndex] = novel;
     else novels.unshift(novel);
     saveNovels(novels);
 
     if (supabaseClient) {
-      supabaseClient.from('novels').upsert(toNovelRow(novel)).select().single()
-        .then(({ error }) => { if (error) console.warn('Novel sync failed:', error.message); })
-        .then(() => syncFromSupabase().catch(console.warn));
+      supabaseClient.from('novels').upsert(toNovelRow(novel)).then(({ error }) => {
+        if (error) console.warn('Novel sync failed:', error.message);
+      });
     }
     return novel;
   }
 
   function deleteNovel(id) {
     saveNovels(getNovels(true).filter((novel) => String(novel.id) !== String(id)));
-    if (supabaseClient) {
-      supabaseClient.from('novels').delete().eq('id', String(id))
-        .then(({ error }) => { if (error) console.warn('Delete novel sync failed:', error.message); });
-    }
+    if (supabaseClient) supabaseClient.from('novels').delete().eq('id', String(id)).then(({ error }) => error && console.warn(error.message));
   }
 
   function incrementRead(id) {
     const novels = getNovels(true);
     const novel = novels.find((item) => String(item.id) === String(id));
-    if (novel) {
-      novel.reads += 1;
-      saveNovels(novels);
-    }
-    if (supabaseClient && id) {
-      Promise.resolve(supabaseClient.rpc('increment_novel_reads', { novel_id: String(id) })).catch(console.warn);
-    }
+    if (!novel) return null;
+    novel.reads += 1;
+    saveNovels(novels);
+    if (supabaseClient) supabaseClient.rpc('increment_novel_reads', { novel_id: String(id) }).catch(console.warn);
     return novel;
   }
 
   function getComments(includePending = false) {
-    return read(STORAGE.comments, []).filter((comment) => includePending || comment.approved);
+    return read(STORAGE.comments, []).map(normalizeComment).filter((comment) => includePending || comment.approved);
   }
 
   function addComment({ novelId = null, name, text }) {
     const user = currentUser();
-    const comments = getComments(true);
-    comments.push({
-    const comment = {
-      id: uid('comment'),
+    const comment = normalizeComment({
       novelId,
       userId: user?.id || null,
       name: user?.name || name || 'قارئ',
       text,
-      name: sanitizeText(user?.name || name || 'قارئ', 80),
-      text: sanitizeText(text, 1000),
-      date: new Date().toISOString(),
       approved: true
     });
-    };
     if (!comment.text) throw new Error('لا يمكن نشر تعليق فارغ.');
-    const comments = getComments(true);
-    comments.push(comment);
-    write(STORAGE.comments, comments);
+    write(STORAGE.comments, [...getComments(true), comment]);
     if (supabaseClient) {
       supabaseClient.from('comments').insert({ id: comment.id, novel_id: comment.novelId, user_id: comment.userId, name: comment.name, text: comment.text, approved: true })
-        .then(({ error }) => { if (error) console.warn('Comment sync failed:', error.message); });
+        .then(({ error }) => error && console.warn('Comment sync failed:', error.message));
     }
     return comment;
   }
 
   function updateComment(id, changes) {
-    const comments = getComments(true).map((comment) => String(comment.id) === String(id) ? { ...comment, ...changes } : comment);
-    write(STORAGE.comments, comments);
-    if (supabaseClient) Promise.resolve(supabaseClient.from('comments').update(changes).eq('id', String(id))).catch(console.warn);
+    write(STORAGE.comments, getComments(true).map((comment) => String(comment.id) === String(id) ? normalizeComment({ ...comment, ...changes }) : comment));
+    if (supabaseClient) supabaseClient.from('comments').update(changes).eq('id', String(id)).then(({ error }) => error && console.warn(error.message));
   }
 
   function deleteComment(id) {
     write(STORAGE.comments, getComments(true).filter((comment) => String(comment.id) !== String(id)));
+    if (supabaseClient) supabaseClient.from('comments').delete().eq('id', String(id)).then(({ error }) => error && console.warn(error.message));
   }
 
   function getSettings() {
     return read(STORAGE.settings, {});
-    if (supabaseClient) {
-      supabaseClient.from('comments').delete().eq('id', String(id))
-        .then(({ error }) => { if (error) console.warn('Delete comment sync failed:', error.message); });
-    }
   }
 
   function saveSettings(settings) {
-    write(STORAGE.settings, { ...getSettings(), ...settings });
     const safeSettings = {
       siteName: sanitizeText(settings.siteName, 120),
       description: sanitizeText(settings.description, 500),
       contactEmail: sanitizeText(settings.contactEmail, 180),
-      patreonUrl: validateUrl(settings.patreonUrl)
+      patreonUrl: validateUrl(settings.patreonUrl) || '#membership'
     };
     write(STORAGE.settings, { ...getSettings(), ...safeSettings });
-    if (supabaseClient) {
-      supabaseClient.from('settings').upsert({ id: 'main', value: getSettings() })
-        .then(({ error }) => { if (error) console.warn('Settings sync failed:', error.message); });
-    }
+    if (supabaseClient) supabaseClient.from('settings').upsert({ id: 'main', value: getSettings() }).then(({ error }) => error && console.warn(error.message));
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
 
-  function escapeHtml(value = '') {
-    return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
-  }
   seedLocalData();
-
-  seed();
   const ready = (async () => {
     await refreshSession().catch(console.warn);
     await syncFromSupabase().catch((error) => console.warn('Supabase sync failed:', error));
   })();
 
   window.NovelsKingdom = {
     covers,
-    seed,
     supabase: supabaseClient,
     isSupabaseEnabled: hasSupabase,
     isRemoteReady: () => remoteReady,
     ready,
-    seed: seedLocalData,
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
 
EOF
)
