function handleRegister(event) {
function setButtonLoading(button, isLoading, label) {
  if (!button) return;
  button.disabled = isLoading;
  if (isLoading) {
    button.dataset.originalText = button.textContent;
    button.textContent = label;
  } else {
    button.textContent = button.dataset.originalText || button.textContent;
  }
}

async function handleRegister(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const users = NK.getUsers();
  const email = String(form.get('email')).trim().toLowerCase();
  if (users.some((user) => user.email === email)) return NK.showToast('هذا البريد مسجل بالفعل.', 'error');
  const user = { id: crypto.randomUUID(), name: form.get('name').trim(), email, password: form.get('password'), role: form.get('role') };
  users.push(user);
  NK.saveUsers(users);
  NK.setSession(user);
  location.href = 'dashboard.html';
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

function handleLogin(event) {
async function handleLogin(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const email = String(form.get('email')).trim().toLowerCase();
  const password = String(form.get('password'));
  const user = NK.getUsers().find((item) => item.email === email && item.password === password);
  if (!user) return NK.showToast('بيانات الدخول غير صحيحة.', 'error');
  NK.setSession(user);
  location.href = 'dashboard.html';
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
