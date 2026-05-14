// إعداد Supabase العام للمتصفح.
// مفتاح publishable آمن للنشر في الواجهة عند تفعيل Row Level Security.
// لا تضع service_role أو كلمات مرور قاعدة البيانات هنا أبدًا.
window.NK_SUPABASE = window.NK_SUPABASE || {
  url: 'https://pblyetwbtiwvdbgvuixhs.supabase.co',
  publishableKey: 'sb_publishable_8VYhJI_VHzE-NgdM-SR9kg_W6jNTh__'
};

const NK_SUPABASE_CONFIG = window.NK_SUPABASE;
const NK_HAS_SUPABASE_SDK = Boolean(window.supabase?.createClient);
const nkSupabase = NK_HAS_SUPABASE_SDK && NK_SUPABASE_CONFIG.url && NK_SUPABASE_CONFIG.publishableKey
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
  return {
    id: profile?.id || authUser?.id,
    name: profile?.name || authUser?.user_metadata?.name || authUser?.email?.split('@')[0] || 'مستخدم',
    email: profile?.email || authUser?.email || '',
    role: profile?.role || authUser?.user_metadata?.role || 'reader',
    createdAt: profile?.created_at || authUser?.created_at || ''
  };
}

async function requireClient() {
  if (!nkSupabase) {
    throw new Error('لم يتم تحميل Supabase. تأكد من الاتصال بالإنترنت ومن تضمين مكتبة Supabase في الصفحة.');
  }
  return nkSupabase;
}

async function getCurrentUser() {
  const client = await requireClient();
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError || !authData?.user) return null;

  const { data: profile } = await client
    .from('profiles')
    .select('id,name,email,role,created_at')
    .eq('id', authData.user.id)
    .maybeSingle();

  return normalizeProfile(profile, authData.user);
}

async function signUp({ name, email, password, role }) {
  const client = await requireClient();
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: { data: { name, role: role === 'writer' ? 'author' : role } }
  });
  if (error) throw error;
  return normalizeProfile(null, data.user);
}

async function signIn({ email, password }) {
  const client = await requireClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
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
  const { data, error } = await client
    .from('novels')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? normalizeNovel(data) : null;
}

async function incrementNovelReads(id) {
  const client = await requireClient();
  const { error } = await client.rpc('increment_novel_reads', { novel_id: id });
  if (error) console.warn('تعذر تحديث عدد القراءات:', error.message);
}

async function createNovel(novel) {
  const client = await requireClient();
  const user = await getCurrentUser();
  if (!user) throw new Error('سجّل الدخول أولًا لنشر روايتك.');

  const row = {
    id: novel.id,
    title: novel.title,
    author: novel.author || user.name,
    author_id: user.id,
    category: novel.category,
    status: novel.status,
    type: novel.type,
    reads: 0,
    rating: 4.5,
    description: novel.description,
    cover: novel.cover || '',
    chapters: novel.chapters || [],
    approved: user.role === 'admin'
  };

  const { data, error } = await client.from('novels').insert(row).select('*').single();
  if (error) throw error;
  return normalizeNovel(data);
}

async function getComments(novelId, includePending = false) {
  const client = await requireClient();
  let query = client
    .from('comments')
    .select('*')
    .eq('novel_id', novelId)
    .order('created_at', { ascending: false });
  if (!includePending) query = query.eq('approved', true);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((comment) => ({
    id: comment.id,
    novelId: comment.novel_id,
    userId: comment.user_id,
    name: comment.name,
    text: comment.text,
    approved: comment.approved,
    createdAt: comment.created_at
  }));
}

async function addComment({ novelId, name, text }) {
  const client = await requireClient();
  const user = await getCurrentUser();
  const row = {
    id: crypto.randomUUID(),
    novel_id: novelId,
    user_id: user?.id || null,
    name: user?.name || name,
    text,
    approved: true
  };
  const { data, error } = await client.from('comments').insert(row).select('*').single();
  if (error) throw error;
  return data;
}

async function getDashboardData() {
  const user = await getCurrentUser();
  if (!user) return { user: null, novels: [], commentsCount: 0 };
  const novels = await getNovels({ includeMine: true });
  const visibleNovels = user.role === 'admin' ? novels : novels.filter((novel) => novel.authorId === user.id);
  const commentCounts = await Promise.all(visibleNovels.map((novel) => getComments(novel.id, user.role === 'admin').then((items) => items.length).catch(() => 0)));
  return { user, novels: visibleNovels, commentsCount: commentCounts.reduce((sum, count) => sum + count, 0), allNovels: novels };
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
