const AUTH_ERROR_MESSAGES = [
  { match: /invalid login credentials/i, message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' },
  { match: /email not confirmed/i, message: 'يرجى تأكيد بريدك الإلكتروني أولًا، ثم أعد محاولة تسجيل الدخول.' },
  { match: /already registered|already exists|user already registered/i, message: 'هذا البريد الإلكتروني مسجل مسبقًا. جرّب تسجيل الدخول بدل إنشاء حساب جديد.' },
  { match: /password/i, message: 'كلمة المرور غير مقبولة. استخدم 6 أحرف على الأقل ويفضل مزيجًا أقوى.' },
  { match: /fetch|network|failed to fetch/i, message: 'تعذر الاتصال بالخادم. تحقق من الإنترنت أو إعدادات Supabase.' }
];

function setButtonLoading(button, isLoading, loadingLabel) {
  if (!button) return;

  if (isLoading) {
    button.dataset.originalText = button.textContent;
        button.textContent = loadingLabel;
    button.disabled = true;
    return;
  }

  button.textContent = button.dataset.originalText || button.textContent;
  button.disabled = false;
}

function getAuthMessageTarget(formElement) {
  return formElement?.querySelector('[data-auth-message]') || document.querySelector('[data-auth-message]');
}

function showAuthMessage(formElement, message, type = 'info') {
  const target = getAuthMessageTarget(formElement);
  if (target) {
    target.textContent = message;
    target.className = `auth-message ${type}`;
    target.hidden = false;
  }
  NK.showToast(message, type === 'error' ? 'error' : 'success');
}

function clearAuthMessage(formElement) {
  const target = getAuthMessageTarget(formElement);
  if (!target) return;
  target.textContent = '';
  target.hidden = true;
}

function friendlyAuthError(error, fallback = 'حدث خطأ غير متوقع.') {
  const rawMessage = error?.message || '';
  const mapped = AUTH_ERROR_MESSAGES.find((item) => item.match.test(rawMessage));
  return mapped?.message || rawMessage || fallback;
}

async function getActiveSession() {
  if (!NKBackend.client) return null;
  const { data, error } = await NKBackend.client.auth.getSession();
  if (error) throw error;
  return data?.session || null;
}

async function resendConfirmationEmail(email, formElement) {
  if (!NKBackend.client) {
    showAuthMessage(formElement, 'إعداد Supabase غير مكتمل، لذلك تعذرت إعادة إرسال رابط التأكيد.', 'error');
    return;
  }

  try {
    const { error } = await NKBackend.client.auth.resend({ type: 'signup', email });
    if (error) throw error;
    showAuthMessage(formElement, 'تم إرسال رابط التأكيد مرة أخرى. افحص بريدك والبريد غير المرغوب فيه.', 'success');
  } catch (error) {
    showAuthMessage(formElement, friendlyAuthError(error, 'تعذر إعادة إرسال رابط التأكيد.'), 'error');
  }
}

function renderResendConfirmation(formElement, email) {
  const target = getAuthMessageTarget(formElement);
  if (!target || target.querySelector('[data-resend-confirmation]')) return;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn btn-secondary btn-small';
  button.dataset.resendConfirmation = 'true';
  button.textContent = 'إعادة إرسال رابط التأكيد';
  button.addEventListener('click', () => resendConfirmationEmail(email, formElement));
  target.appendChild(document.createElement('br'));
  target.appendChild(button);
}

async function assertProfileReady(formElement) {
  try {
    const profile = await NKBackend.getCurrentUser();
    if (!profile) {
      throw new Error('لم يتم العثور على جلسة مستخدم نشطة بعد تسجيل الدخول.');
    }
    return profile;
  } catch (error) {
    console.error('تعذر تحميل الملف الشخصي:', error);
    showAuthMessage(
      formElement,
      'تم تسجيل الدخول، لكن تعذر تحميل ملفك الشخصي. تأكد من تنفيذ ملف supabase/schema.sql كاملًا وأن جدول profiles وسياسات RLS مفعلة.',
      'error'
    );
    throw error;
  }
}

async function handleRegister(event) {
  event.preventDefault();

  const formElement = event.currentTarget;
  const button = formElement.querySelector('button[type="submit"]');
  const form = new FormData(formElement);
  const password = String(form.get('password'));
  const confirmPassword = String(form.get('confirmPassword') || password);
  const email = String(form.get('email')).trim().toLowerCase();

  clearAuthMessage(formElement);

  if (password !== confirmPassword) {
    showAuthMessage(formElement, 'كلمتا المرور غير متطابقتين.', 'error');
    return;
  }

  setButtonLoading(button, true, 'جاري إنشاء الحساب...');

  try {
    await NKBackend.signUp({
      name: String(form.get('name')).trim(),
       email,
      password,
      role: String(form.get('role'))
    });

    const session = await getActiveSession();

    if (!session) {
      showAuthMessage(
        formElement,
        'تم إنشاء الحساب بنجاح. يرجى فتح رسالة التأكيد في بريدك الإلكتروني قبل تسجيل الدخول. افحص مجلد Spam إذا لم تصل الرسالة.',
        'success'
      );
      renderResendConfirmation(formElement, email);
      return;
    }

    await assertProfileReady(formElement);
    showAuthMessage(formElement, 'تم إنشاء الحساب وتسجيل الدخول بنجاح. سيتم تحويلك إلى لوحة التحكم.', 'success');
    setTimeout(() => { location.href = 'dashboard.html'; }, 900);
  } catch (error) {
    showAuthMessage(formElement, friendlyAuthError(error, 'تعذر إنشاء الحساب.'), 'error');
  } finally {
    setButtonLoading(button, false);
  }
}

async function handleLogin(event) {
  event.preventDefault();

  const formElement = event.currentTarget;
  const button = formElement.querySelector('button[type="submit"]');
  const form = new FormData(formElement);
  const email = String(form.get('email')).trim().toLowerCase();

  clearAuthMessage(formElement);
  setButtonLoading(button, true, 'جاري الدخول...');

  try {
    await NKBackend.signIn({
            email,
      password: String(form.get('password'))
    });

    const session = await getActiveSession();
    if (!session) {
      showAuthMessage(formElement, 'تعذر إنشاء جلسة دخول. إذا كان بريدك غير مؤكد فافتح رابط التأكيد أولًا.', 'error');
      renderResendConfirmation(formElement, email);
      return;
    }

    await assertProfileReady(formElement);
    showAuthMessage(formElement, 'تم تسجيل الدخول بنجاح. سيتم تحويلك إلى لوحة التحكم.', 'success');
    setTimeout(() => { location.href = 'dashboard.html'; }, 500);
  } catch (error) {
    const message = friendlyAuthError(error, 'بيانات الدخول غير صحيحة.');
    showAuthMessage(formElement, message, 'error');
    if (/confirm|تأكيد|email not confirmed/i.test(error?.message || message)) {
      renderResendConfirmation(formElement, email);
    }
  } finally {
    setButtonLoading(button, false);
  }
}

async function redirectAuthenticatedUsers() {
  const currentPage = location.pathname.split('/').pop();
  if (!['login.html', 'register.html'].includes(currentPage)) return;

  try {
    const session = await getActiveSession();
    if (!session) return;
    const user = await NKBackend.getCurrentUser();
    if (user) location.href = 'dashboard.html';
  } catch (error) {
    console.warn('تعذر فحص حالة المصادقة:', error.message);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('registerForm')?.addEventListener('submit', handleRegister);
  document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
  redirectAuthenticatedUsers();
});  
