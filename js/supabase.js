// إعداد Supabase العام للمتصفح.
// مفتاح publishable آمن للنشر في الواجهة عند تفعيل Row Level Security.
// لا تضع service_role أو كلمات مرور قاعدة البيانات هنا أبدًا.
window.NK_SUPABASE = window.NK_SUPABASE || {
  url: 'https://pblyetwbtiwvdbgvuixhs.supabase.co',
  publishableKey: 'sb_publishable_8VYhJI_VHzE-NgdM-SR9kg_W6jNTh__'
};

const NK_SUPABASE_CONFIG = window.NK_SUPABASE;
const NK_HAS_SUPABASE_SDK = Boolean(window.supabase?.createClient);
const NK_ALLOWED_ROLES = new Set(['reader', 'author', 'admin']);
const NK_ALLOWED_SIGNUP_ROLES = new Set(['reader', 'author']);
const NK_ALLOWED_NOVEL_TYPES = new Set(['عربية', 'مترجمة']);
const NK_ALLOWED_NOVEL_STATUSES = new Set(['مستمرة', 'مكتملة', 'مسودة']);

function cleanText(value, fallback = '') {
  return String(value ?? fallback).trim();
}

function randomId(prefix = 'id') {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function isSupabaseConfigComplete(config = {}) {
  return Boolean(
    config.url
    && config.publishableKey
    && /^https:\/\/[^\s]+\.supabase\.co$/i.test(config.url)
    && /^(sb_publishable_|eyJ)/.test(config.publishableKey)
  );
}

const nkSupabase = NK_HAS_SUPABASE_SDK && isSupabaseConfigComplete(NK_SUPABASE_CONFIG)
  ? window.supabase.createClient(NK_SUPABASE_CONFIG.url, NK_SUPABASE_CONFIG.publishableKey)
  : null;

function normalizeNovel(row = {}) {
  return {
    id: row.id,
    title: row.title || '',
    author: row.author || '',
    authorId: row.author_id || row.authorId || null,
    category: row.category || 'عام',
    status: row.status || 'مستمرة',
    type: row.type || 'عربية',
    reads: Number(row.reads || 0),
    rating: Number(row.rating || 4.5),
    description: row.description || '',
    cover: row.cover || '',
    chapters: Array.isArray(row.chapters) ? row.chapters : [],
    featured: Boolean(row.featured),
    approved: row.approved !== false,
    premium: Boolean(row.premium),
    publishedAt: row.created_at?.slice(0, 10) || row.publishedAt || ''
  };
}

function normalizeProfile(profile, authUser) {
  if (!authUser && !profile) return null;

  const profileRole = NK_ALLOWED_ROLES.has(profile?.role) ? profile.role : null;
  const metadataRole = authUser?.user_metadata?.role === 'author' ? 'author' : 'reader';

  return {
    id: profile?.id || authUser?.id,
    name: profile?.name || authUser?.user_metadata?.name || authUser?.email?.split('@')[0] || 'مستخدم',
    email: profile?.email || authUser?.email || '',
    role: profileRole || metadataRole,
    createdAt: profile?.created_at || authUser?.created_at || ''
  };
}

function normalizeComment(comment = {}) {
  return {
    id: comment.id,
    novelId: comment.novel_id,
    userId: comment.user_id,
    name: comment.name || '',
    text: comment.text || '',
    approved: Boolean(comment.approved),
    createdAt: comment.created_at || ''
  };
}

function validateAuthPayload({ name, email, password, role } = {}) {
  const cleanedName = cleanText(name);
  const cleanedEmail = cleanText(email).toLowerCase();
  const cleanedPassword = String(password ?? '');
  const requestedRole = cleanText(role, 'reader');
  const safeRole = NK_ALLOWED_SIGNUP_ROLES.has(requestedRole) ? requestedRole : 'reader';

  if (cleanedName.length < 2 || cleanedName.length > 100) {
    throw new Error('الاسم يجب أن يكون بين حرفين و100 حرف.');
  }
  if (!cleanedEmail || !cleanedEmail.includes('@')) {
    throw new Error('أدخل بريدًا إلكترونيًا صحيحًا.');
  }
  if (cleanedPassword.length < 6) {
    throw new Error('كلمة المرور يجب ألا تقل عن 6 أحرف.');
  }

  return { name: cleanedName, email: cleanedEmail, password: cleanedPassword, role: safeRole };
}

function validateNovelPayload(novel = {}, user) {
  const title = cleanText(novel.title);
  const author = cleanText(novel.author) || user?.name || 'كاتب';
  const category = cleanText(novel.category) || 'عام';
  const status = cleanText(novel.status) || 'مستمرة';
  const type = cleanText(novel.type) || 'عربية';
  const description = cleanText(novel.description);
  const cover = cleanText(novel.cover);
  const chapters = Array.isArray(novel.chapters) ? novel.chapters : [];

  if (!title || title.length > 180) throw new Error('عنوان الرواية مطلوب ويجب ألا يتجاوز 180 حرفًا.');
  if (!author || author.length > 120) throw new Error('اسم الكاتب مطلوب ويجب ألا يتجاوز 120 حرفًا.');
  if (!description) throw new Error('نبذة الرواية مطلوبة.');
  if (!NK_ALLOWED_NOVEL_STATUSES.has(status)) throw new Error('حالة الرواية غير صحيحة.');
  if (!NK_ALLOWED_NOVEL_TYPES.has(type)) throw new Error('نوع الرواية غير صحيح.');

  const cleanedChapters = chapters
    .map((chapter, index) => ({
      title: cleanText(chapter?.title, `الفصل ${index + 1}`),
      body: cleanText(chapter?.body)
    }))
    .filter((chapter) => chapter.title && chapter.body);

  if (!cleanedChapters.length) throw new Error('أضف فصلًا واحدًا على الأقل.');

  return {
    id: cleanText(novel.id, randomId('novel')),
    title,
    author,
    author_id: user.id,
    category,
    status,
    type,
    reads: 0,
    rating: 4.5,
    description,
    cover,
    chapters: cleanedChapters,
    approved: user.role === 'admin'
  };
}

async function requireClient() {
  if (!nkSupabase) {
    throw new Error('لم يتم تحميل Supabase أو أن إعداداته غير مكتملة. تأكد من تضمين مكتبة Supabase ومن صحة js/supabase.js.');
  }
  return nkSupabase;
}

async function getCurrentUser() {
  const client = await requireClient();
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError || !authData?.user) return null;

  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('id,name,email,role,created_at')
    .eq('id', authData.user.id)
    .maybeSingle();

  if (profileError) throw profileError;
  return normalizeProfile(profile, authData.user);
}

async function signUp(payload) {
  const client = await requireClient();
  const { name, email, password, role } = validateAuthPayload(payload);
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: { data: { name, role } }
  });
  if (error) throw error;
  return normalizeProfile(null, data.user);
}

async function signIn({ email, password }) {
  const client = await requireClient();
  const cleanedEmail = cleanText(email).toLowerCase();
  const cleanedPassword = String(password ?? '');
  if (!cleanedEmail || !cleanedPassword) throw new Error('البريد الإلكتروني وكلمة المرور مطلوبان.');

  const { data, error } = await client.auth.signInWithPassword({ email: cleanedEmail, password: cleanedPassword });
  if (error) throw error;
  return normalizeProfile(null, data.user);
}

async function signOut() {
  const client = await requireClient();
  const { error } = await client.auth.signOut();
  if (error) throw error;
}

async function getNovels({ includeMine = false } = {}) {
  const client = await requireClient();
  let query = client
    .from('novels')
    .select('*')
    .order('created_at', { ascending: false });

  if (!includeMine) query = query.eq('approved', true);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(normalizeNovel);
}

async function getNovel(id) {
  const client = await requireClient();
  const novelId = cleanText(id);
  if (!novelId) return null;

  const { data, error } = await client
    .from('novels')
    .select('*')
    .eq('id', novelId)
    .maybeSingle();
  if (error) throw error;
  return data ? normalizeNovel(data) : null;
}

async function incrementNovelReads(id) {
  const client = await requireClient();
  const novelId = cleanText(id);
  if (!novelId) return;

  const { error } = await client.rpc('increment_novel_reads', { novel_id: novelId });
  if (error) console.warn('تعذر تحديث عدد القراءات:', error.message);
}

async function createNovel(novel) {
  const client = await requireClient();
  const user = await getCurrentUser();
  if (!user) throw new Error('سجّل الدخول أولًا لنشر روايتك.');

const row = validateNovelPayload(novel, user);
  const { data, error } = await client.from('novels').insert(row).select('*').single();
  if (error) throw error;
  return normalizeNovel(data);
}

async function getComments(novelId, includePending = false) {
  const client = await requireClient();
  const safeNovelId = cleanText(novelId);
  if (!safeNovelId) return [];

  let query = client
    .from('comments')
    .select('*')
    .eq('novel_id', safeNovelId)
    .order('created_at', { ascending: false });
  if (!includePending) query = query.eq('approved', true);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(normalizeComment);
}

async function addComment({ novelId, name, text }) {
  const client = await requireClient();
  const user = await getCurrentUser();
  const safeText = cleanText(text);
  const safeName = cleanText(user?.name || name || 'قارئ');
  const safeNovelId = cleanText(novelId);

  if (!safeNovelId) throw new Error('الرواية غير محددة.');
  if (!safeName || safeName.length > 80) throw new Error('اسم المعلّق مطلوب ويجب ألا يتجاوز 80 حرفًا.');
  if (!safeText || safeText.length > 1000) throw new Error('التعليق مطلوب ويجب ألا يتجاوز 1000 حرف.');

  const row = {
    id: randomId('comment'),
    novel_id: safeNovelId,
    user_id: user?.id || null,
    name: safeName,
    text: safeText,
    approved: user?.role === 'admin'
  };
  const { data, error } = await client.from('comments').insert(row).select('*').single();
  if (error) throw error;
  return normalizeComment(data);
}

async function getDashboardData() {
  const user = await getCurrentUser();
  if (!user) return { user: null, novels: [], commentsCount: 0, allNovels: [] };

  const novels = await getNovels({ includeMine: true });
  const visibleNovels = user.role === 'admin' ? novels : novels.filter((novel) => novel.authorId === user.id);
  const commentCounts = await Promise.all(
    visibleNovels.map((novel) => getComments(novel.id, user.role === 'admin').then((items) => items.length).catch(() => 0))
  );

  return {
    user,
    novels: visibleNovels,
    commentsCount: commentCounts.reduce((sum, count) => sum + count, 0),
    allNovels: novels
  };
}

window.NKBackend = {
  client: nkSupabase,
  isConfigured: Boolean(nkSupabase),
  getCurrentUser,
  signUp,
  signIn,
  signOut,
  getNovels,
  getNovel,
  incrementNovelReads,
  createNovel,
  getComments,
  addComment,
  getDashboardData
};
