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

async function handleRegister(event) {
  event.preventDefault();

  const formElement = event.currentTarget;
  const button = formElement.querySelector('button[type="submit"]');
  const form = new FormData(formElement);
  setButtonLoading(button, true, 'جاري إنشاء الحساب...');

  try {
    await NKBackend.signUp({
      name: String(form.get('name')).trim(),
      email: String(form.get('email')).trim().toLowerCase(),
      password: String(form.get('password')),
      role: String(form.get('role'))
    });
    NK.showToast('تم إنشاء الحساب. إذا كان تأكيد البريد مفعلًا، راجع بريدك الإلكتروني.');
    setTimeout(() => { location.href = 'dashboard.html'; }, 900);
  } catch (error) {
    NK.showToast(NK.formatError(error, 'تعذر إنشاء الحساب.'), 'error');
  } finally {
    setButtonLoading(button, false);
  }
}

async function handleLogin(event) {
  event.preventDefault();

  const formElement = event.currentTarget;
  const button = formElement.querySelector('button[type="submit"]');
  const form = new FormData(formElement);
  setButtonLoading(button, true, 'جاري الدخول...');

  try {
    await NKBackend.signIn({
      email: String(form.get('email')).trim().toLowerCase(),
      password: String(form.get('password'))
    });
    location.href = 'dashboard.html';
  } catch (error) {
    NK.showToast(NK.formatError(error, 'بيانات الدخول غير صحيحة.'), 'error');
  } finally {
    setButtonLoading(button, false);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('registerForm')?.addEventListener('submit', handleRegister);
  document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
});  
