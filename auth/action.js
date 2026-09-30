// Обработчик ссылок из писем Firebase для писем, открытых на компьютере или без приложения.
// Страница ничего не сохраняет: параметры ссылки читаются один раз и убираются из адресной
// строки, Auth работает в памяти (inMemoryPersistence). Никаких console.* — код из письма не
// должен попасть ни в один лог.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import {
  initializeAuth,
  inMemoryPersistence,
  verifyPasswordResetCode,
  confirmPasswordReset,
  checkActionCode,
  applyActionCode,
  sendPasswordResetEmail,
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';

// Web API key проекта (не секрет: он же в каждом письме). Другой apiKey в ссылке — не наша ссылка.
const API_KEY = 'AIzaSyA70yKWxZ5S0rivB56xFctCR_zmaufEC3g';
const PROJECT_ID = 'five-in-a-row-29e21';
const AUTH_DOMAIN = 'five-in-a-row-29e21.firebaseapp.com';

// ─── Параметры: читаются один раз, адресная строка очищается сразу ───
const params = new URLSearchParams(window.location.search);
const link = {
  mode: params.get('mode'),
  code: params.get('oobCode'),
  apiKey: params.get('apiKey'),
  lang: params.get('lang'),
  duplicated: params.getAll('mode').length > 1 || params.getAll('oobCode').length > 1,
};
window.history.replaceState(null, '', window.location.pathname);

// ─── Тексты ───
const STRINGS = {
  ru: {
    titleReset: 'Сброс пароля',
    titleVerify: 'Подтверждение email',
    titleRecover: 'Восстановление email',
    checking: 'Проверяем ссылку…',
    resetIntro: (email) => `Придумайте новый пароль для аккаунта ${email}`,
    newPassword: 'Новый пароль',
    confirmPassword: 'Повторите пароль',
    showPassword: 'Показать пароль',
    hidePassword: 'Скрыть пароль',
    savePassword: 'Сохранить пароль',
    saving: 'Сохраняем…',
    rules: ['Не менее 6 символов', 'Хотя бы одна цифра', 'Строчная латинская буква (a–z)', 'Заглавная латинская буква (A–Z)', 'Без пробелов'],
    rulesMet: 'Пароль подходит',
    requiredConfirm: 'Повторите пароль',
    mismatch: 'Пароли не совпадают',
    weakPassword: 'Пароль не соответствует требованиям.',
    tooMany: 'Слишком много попыток. Попробуйте позже.',
    unknown: 'Не удалось выполнить запрос. Попробуйте ещё раз.',
    passwordChangedTitle: 'Пароль изменён',
    passwordChangedText: 'Войдите в приложение с новым паролем.',
    verifiedTitle: 'Email подтверждён',
    verifiedText: (email) => `Адрес ${email} подтверждён. Вернитесь в приложение Five in a Row — игра онлайн уже доступна.`,
    changedTitle: 'Email изменён',
    changedText: (email) => `Новый адрес ${email} подтверждён. В приложении войдите снова с этим адресом.`,
    recoveredTitle: 'Email восстановлен',
    recoveredText: (email) => `Адрес ${email} снова привязан к аккаунту.`,
    recoveredWarning: 'Если email меняли не вы, смените пароль: кто-то мог получить доступ к аккаунту.',
    resetPassword: 'Сбросить пароль',
    resetSending: 'Отправляем…',
    resetSent: (email) => `Письмо для сброса пароля отправлено на ${email}`,
    invalidTitle: 'Ссылка недействительна',
    invalidText: 'Ссылка уже использована или повреждена. Запросите новое письмо в приложении.',
    expiredTitle: 'Ссылка истекла',
    expiredText: 'Срок действия ссылки закончился. Запросите новое письмо в приложении.',
    networkTitle: 'Нет соединения',
    networkText: 'Ссылка ещё не применена. Проверьте интернет и нажмите «Повторить».',
    retry: 'Повторить',
    uncertainTitle: 'Результат неизвестен',
    uncertainText: 'Ответ сервера не получен: ссылка могла уже сработать. Проверьте в приложении; если нужно — запросите новое письмо.',
    footClose: 'Эту страницу можно закрыть. Она ничего не сохраняет и не отправляет ничего, кроме запроса к Firebase.',
    footApp: 'После смены пароля войдите в приложение заново.',
  },
  en: {
    titleReset: 'Reset password',
    titleVerify: 'Email confirmation',
    titleRecover: 'Recover email',
    checking: 'Checking the link…',
    resetIntro: (email) => `Choose a new password for ${email}`,
    newPassword: 'New password',
    confirmPassword: 'Confirm password',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    savePassword: 'Save password',
    saving: 'Saving…',
    rules: ['At least 6 characters', 'At least one digit', 'A lowercase Latin letter (a–z)', 'An uppercase Latin letter (A–Z)', 'No spaces'],
    rulesMet: 'Password is fine',
    requiredConfirm: 'Confirm the password',
    mismatch: 'Passwords do not match',
    weakPassword: 'The password does not meet the requirements.',
    tooMany: 'Too many attempts. Try again later.',
    unknown: 'Something went wrong. Please try again.',
    passwordChangedTitle: 'Password changed',
    passwordChangedText: 'Sign in to the app with your new password.',
    verifiedTitle: 'Email confirmed',
    verifiedText: (email) => `${email} is confirmed. Go back to the Five in a Row app — online play is now available.`,
    changedTitle: 'Email changed',
    changedText: (email) => `Your new address ${email} is confirmed. Sign in to the app again with this address.`,
    recoveredTitle: 'Email recovered',
    recoveredText: (email) => `${email} is linked to your account again.`,
    recoveredWarning: 'If you did not change your email, reset your password: someone may have access to your account.',
    resetPassword: 'Reset password',
    resetSending: 'Sending…',
    resetSent: (email) => `A password reset email has been sent to ${email}`,
    invalidTitle: 'Link is invalid',
    invalidText: 'This link has already been used or is damaged. Request a new email in the app.',
    expiredTitle: 'Link has expired',
    expiredText: 'The link is no longer valid. Request a new email in the app.',
    networkTitle: 'No connection',
    networkText: 'The link has not been applied yet. Check your internet connection and tap “Retry”.',
    retry: 'Retry',
    uncertainTitle: 'Result unknown',
    uncertainText: 'No reply from the server: the link may already have worked. Check in the app; request a new email if needed.',
    footClose: 'You can close this page. It stores nothing and sends nothing except the request to Firebase.',
    footApp: 'After changing the password, sign in to the app again.',
  },
};

function pickLang(explicit) {
  const candidate = (explicit || navigator.language || 'en').toLowerCase();
  return candidate.startsWith('ru') ? 'ru' : 'en';
}

let lang = pickLang(link.lang);
let t = STRINGS[lang];

// ─── Правила пароля — копия PasswordRules из feature/auth/validation/AuthValidation.kt ───
// (синхронизировать вручную; перекрёстный комментарий есть и там)
const MIN_LENGTH = 6;
function passwordRules(pw) {
  return [
    pw.length >= MIN_LENGTH,
    /[0-9]/.test(pw),
    /[a-z]/.test(pw),
    /[A-Z]/.test(pw),
    pw.length > 0 && !/\s/.test(pw),
  ];
}

// ─── DOM-помощники: только textContent, никакого innerHTML ───
const SVG_NS = 'http://www.w3.org/2000/svg';
const ICONS = {
  check: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
  info: 'M11 15h2v2h-2zm0-8h2v6h-2zm.99-5C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z',
  clock: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z',
  help: 'M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z',
  cancel: 'M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z',
  eye: 'M12 6c3.79 0 7.17 2.13 8.82 5.5C19.17 14.87 15.79 17 12 17s-7.17-2.13-8.82-5.5C4.83 8.13 8.21 6 12 6m0-2C7 4 2.73 7.11 1 11.5 2.73 15.89 7 19 12 19s9.27-3.11 11-7.5C21.27 7.11 17 4 12 4zm0 5c1.38 0 2.5 1.12 2.5 2.5S13.38 14 12 14s-2.5-1.12-2.5-2.5S10.62 9 12 9m0-2c-2.48 0-4.5 2.02-4.5 4.5S9.52 16 12 16s4.5-2.02 4.5-4.5S14.48 7 12 7z',
  eyeOff: 'M12 6c3.79 0 7.17 2.13 8.82 5.5-.59 1.22-1.42 2.27-2.41 3.12l1.41 1.41c1.39-1.23 2.49-2.77 3.18-4.53C21.27 7.11 17 4 12 4c-1.27 0-2.49.2-3.64.57l1.65 1.65C10.66 6.09 11.32 6 12 6zm-1.07 1.14L13 9.21c.57.25 1.03.71 1.28 1.28l2.07 2.07c.08-.34.14-.7.14-1.07C16.5 9.01 14.48 7 12 7c-.37 0-.72.05-1.07.14zM2.01 3.87l2.68 2.68C3.06 7.83 1.77 9.53 1 11.5 2.73 15.89 7 19 12 19c1.52 0 2.98-.29 4.32-.82l3.42 3.42 1.41-1.41L3.42 2.45 2.01 3.87zm7.5 7.5 2.61 2.61c-.04.01-.08.02-.12.02-1.38 0-2.5-1.12-2.5-2.5 0-.05.01-.08.01-.13zm-3.4-3.4 1.75 1.75c-.23.55-.36 1.15-.36 1.78 0 2.48 2.02 4.5 4.5 4.5.63 0 1.23-.13 1.77-.36l.98.98c-.88.24-1.8.38-2.75.38-3.79 0-7.17-2.13-8.82-5.5.7-1.43 1.72-2.61 2.93-3.53z',
};

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function svg(pathData, className) {
  const node = document.createElementNS(SVG_NS, 'svg');
  node.setAttribute('viewBox', '0 0 24 24');
  node.setAttribute('aria-hidden', 'true');
  if (className) node.setAttribute('class', className);
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', pathData);
  node.appendChild(path);
  return node;
}

function button(className, text, onClick) {
  const node = el('button', className, text);
  node.type = 'button';
  node.addEventListener('click', onClick);
  return node;
}

function emailText(template, email) {
  // Email вставляется отдельным узлом — textContent, не разметка
  const p = el('p', 'body-text');
  const text = template(email);
  const at = text.indexOf(email);
  if (at < 0) {
    p.textContent = text;
    return p;
  }
  p.append(text.slice(0, at), Object.assign(el('span', 'email'), { textContent: email }), text.slice(at + email.length));
  return p;
}

const titleNode = document.getElementById('title');
const content = document.getElementById('content');
const footnote = document.getElementById('footnote');

function setTitle(text) { titleNode.textContent = text; }
function setFootnote(text) { footnote.textContent = text || ''; }
// Поле, которое было в фокусе до перерисовки, — чтобы вернуть фокус тому же полю
let lastFocused = null;
function clear() {
  const active = document.activeElement;
  lastFocused = active && active.getAttribute ? active.getAttribute('aria-label') : null;
  content.replaceChildren();
  content.className = 'card-body';
}

// ─── Состояния ───
// Текущее состояние хранится как функция рендера, чтобы переключатель языка перерисовывал его
let current = () => {};
function render(fn) {
  current = fn;
  fn();
}

function outcome({ icon, title, text, email, primary, link: secondary, extra }) {
  clear();
  content.classList.add('centered');
  content.appendChild(svg(ICONS[icon], 'icon'));
  content.appendChild(el('h2', 'outcome-title', title));
  content.appendChild(email ? emailText(text, email) : el('p', 'body-text', text));
  if (extra) content.appendChild(extra);
  if (primary) content.appendChild(button('btn-primary', primary.text, primary.onClick));
  if (secondary) content.appendChild(button('btn-link', secondary.text, secondary.onClick));
}

function showChecking() {
  render(() => {
    clear();
    content.classList.add('centered');
    content.appendChild(el('div', 'spinner'));
    const status = el('p', 'body-text', t.checking);
    status.setAttribute('role', 'status');
    content.appendChild(status);
    setFootnote('');
  });
}

function showInvalid(expired) {
  render(() => {
    outcome({
      icon: expired ? 'clock' : 'info',
      title: expired ? t.expiredTitle : t.invalidTitle,
      text: expired ? t.expiredText : t.invalidText,
    });
    setFootnote(t.footClose);
  });
}

function showNetwork(retry) {
  render(() => {
    outcome({ icon: 'info', title: t.networkTitle, text: t.networkText, primary: { text: t.retry, onClick: retry } });
    setFootnote('');
  });
}

function showUncertain() {
  render(() => {
    outcome({ icon: 'help', title: t.uncertainTitle, text: t.uncertainText });
    setFootnote(t.footClose);
  });
}

// ─── Ошибки Firebase ───
function codeOf(error) {
  return (error && typeof error.code === 'string') ? error.code : '';
}

const INVALID_CODES = new Set(['auth/invalid-action-code', 'auth/user-disabled', 'auth/user-not-found', 'auth/argument-error']);

// Ошибка ДО применения кода: код не тронут, сеть — можно повторить
function handleCheckError(error, retry) {
  const code = codeOf(error);
  if (code === 'auth/expired-action-code') return showInvalid(true);
  if (INVALID_CODES.has(code)) return showInvalid(false);
  if (code === 'auth/network-request-failed') return showNetwork(retry);
  return showUncertain();
}

// Ошибка ПРИ применении: ответ мог не дойти — повторно не применяем
function handleApplyError(error) {
  const code = codeOf(error);
  if (code === 'auth/expired-action-code') return showInvalid(true);
  if (INVALID_CODES.has(code)) return showInvalid(false);
  return showUncertain();
}

// ─── Firebase ───
let authInstance = null;
function auth() {
  if (!authInstance) {
    const app = initializeApp({ apiKey: API_KEY, authDomain: AUTH_DOMAIN, projectId: PROJECT_ID });
    authInstance = initializeAuth(app, { persistence: inMemoryPersistence });
    authInstance.languageCode = lang;
  }
  return authInstance;
}

// ─── Сброс пароля ───
function startReset() {
  showChecking();
  verifyPasswordResetCode(auth(), link.code)
    .then((email) => showResetForm(email))
    .catch((error) => handleCheckError(error, startReset));
}

function showResetForm(email) {
  const form = { password: '', confirm: '', shown: false, shown2: false, submitted: false, submitting: false, banner: null };
  render(() => {
    clear();
    if (form.banner) content.appendChild(bannerNode(form.banner));
    content.appendChild(emailText(t.resetIntro, email));

    const rulesState = passwordRules(form.password);
    const allMet = rulesState.every(Boolean);
    const confirmError = form.confirm.length === 0 ? t.requiredConfirm : (form.confirm !== form.password ? t.mismatch : null);
    const rulesFailed = form.submitted && !allMet;

    content.appendChild(passwordField(t.newPassword, form.password, form.shown, rulesFailed, (v) => { form.password = v; current(); }, () => { form.shown = !form.shown; current(); }));
    if (form.password.length > 0 || form.submitted) content.appendChild(rulesList(rulesState, rulesFailed));
    const showConfirmError = form.submitted && confirmError !== null;
    content.appendChild(passwordField(t.confirmPassword, form.confirm, form.shown2, showConfirmError, (v) => { form.confirm = v; current(); }, () => { form.shown2 = !form.shown2; current(); }));
    if (showConfirmError) content.appendChild(fieldMessage(confirmError));

    const save = button('btn-primary', form.submitting ? t.saving : t.savePassword, () => {
      if (form.submitting) return;
      form.submitted = true;
      form.banner = null;
      if (!allMet || confirmError !== null) { current(); return; }
      form.submitting = true;
      current();
      confirmPasswordReset(auth(), link.code, form.password)
        .then(() => showPasswordChanged())
        .catch((error) => {
          const code = codeOf(error);
          if (code === 'auth/weak-password' || code === 'auth/password-does-not-meet-requirements') {
            form.submitting = false;
            form.banner = t.weakPassword;
            current();
          } else if (code === 'auth/too-many-requests') {
            form.submitting = false;
            form.banner = t.tooMany;
            current();
          } else {
            handleApplyError(error);
          }
        });
    });
    save.disabled = form.submitting;
    content.appendChild(save);
    setFootnote(t.footApp);
  });
}

function showPasswordChanged() {
  render(() => {
    outcome({ icon: 'check', title: t.passwordChangedTitle, text: t.passwordChangedText });
    setFootnote(t.footApp);
  });
}

function passwordField(placeholder, value, shown, isError, onInput, onToggle) {
  const label = el('label', isError ? 'field field-error' : 'field');
  const input = el('input');
  input.type = shown ? 'text' : 'password';
  input.placeholder = placeholder;
  input.setAttribute('aria-label', placeholder);
  input.autocomplete = 'new-password';
  input.value = value;
  input.addEventListener('input', () => onInput(input.value));
  const focused = lastFocused === placeholder;
  label.appendChild(input);
  const eye = button('eye', '', onToggle);
  eye.setAttribute('aria-label', shown ? t.hidePassword : t.showPassword);
  eye.appendChild(svg(shown ? ICONS.eyeOff : ICONS.eye));
  label.appendChild(eye);
  if (focused) queueMicrotask(() => { input.focus(); input.setSelectionRange(value.length, value.length); });
  return label;
}

function rulesList(state, failed) {
  if (state.every(Boolean)) {
    const line = el('div', 'status-line');
    line.appendChild(svg(ICONS.check));
    line.appendChild(el('span', '', t.rulesMet));
    return line;
  }
  const list = el('ul', 'rules');
  list.setAttribute('aria-label', t.rules.join(', '));
  state.forEach((ok, i) => {
    const item = el('li', ok ? 'rule ok' : (failed ? 'rule failed' : 'rule'));
    if (ok) {
      item.appendChild(svg(ICONS.check));
    } else if (failed) {
      item.appendChild(svg(ICONS.cancel));
    } else {
      const circle = document.createElementNS(SVG_NS, 'svg');
      circle.setAttribute('viewBox', '0 0 24 24');
      circle.setAttribute('aria-hidden', 'true');
      const c = document.createElementNS(SVG_NS, 'circle');
      c.setAttribute('cx', '12'); c.setAttribute('cy', '12'); c.setAttribute('r', '8');
      c.setAttribute('fill', 'none'); c.setAttribute('stroke', '#7A8589'); c.setAttribute('stroke-width', '2');
      circle.appendChild(c);
      item.appendChild(circle);
    }
    item.appendChild(el('span', '', t.rules[i]));
    list.appendChild(item);
  });
  return list;
}

function fieldMessage(text) {
  const node = el('div', 'field-message');
  node.setAttribute('role', 'alert');
  node.appendChild(svg(ICONS.info));
  node.appendChild(el('span', '', text));
  return node;
}

function bannerNode(text) {
  const node = el('div', 'banner');
  node.setAttribute('role', 'alert');
  node.appendChild(svg(ICONS.info));
  node.appendChild(el('span', '', text));
  return node;
}

// ─── Подтверждение / смена / восстановление email ───
const OPERATIONS = { verifyEmail: 'VERIFY_EMAIL', verifyAndChangeEmail: 'VERIFY_AND_CHANGE_EMAIL', recoverEmail: 'RECOVER_EMAIL' };

function startEmailAction() {
  showChecking();
  const expected = OPERATIONS[link.mode];
  checkActionCode(auth(), link.code)
    .then((info) => {
      // Операция кода должна совпадать с режимом ссылки; адрес — из самого кода
      if (!info || info.operation !== expected || !info.data || !info.data.email) return showInvalid(false);
      const email = info.data.email;
      return applyActionCode(auth(), link.code)
        .then(() => showApplied(email))
        .catch((error) => handleApplyError(error));
    })
    .catch((error) => handleCheckError(error, startEmailAction));
}

function showApplied(email) {
  if (link.mode === 'recoverEmail') return showRecovered(email);
  render(() => {
    const changed = link.mode === 'verifyAndChangeEmail';
    outcome({
      icon: 'check',
      title: changed ? t.changedTitle : t.verifiedTitle,
      text: changed ? t.changedText : t.verifiedText,
      email,
    });
    setFootnote(t.footClose);
  });
}

function showRecovered(email) {
  const state = { status: 'idle', banner: null };
  render(() => {
    const sent = state.status === 'sent';
    let extra;
    if (sent) {
      extra = el('div', 'status-line');
      extra.appendChild(svg(ICONS.check));
      extra.appendChild(el('span', '', t.resetSent(email)));
    } else {
      extra = el('p', 'body-text', t.recoveredWarning);
    }
    outcome({
      icon: 'check',
      title: t.recoveredTitle,
      text: t.recoveredText,
      email,
      extra,
      primary: sent ? null : {
        text: state.status === 'sending' ? t.resetSending : t.resetPassword,
        onClick: () => {
          if (state.status === 'sending') return;
          state.status = 'sending';
          state.banner = null;
          current();
          sendPasswordResetEmail(auth(), email)
            .then(() => { state.status = 'sent'; current(); })
            .catch((error) => {
              state.status = 'idle';
              state.banner = codeOf(error) === 'auth/too-many-requests' ? t.tooMany : t.unknown;
              current();
            });
        },
      },
    });
    if (state.banner) content.insertBefore(bannerNode(state.banner), content.firstChild);
    setFootnote(t.footClose);
  });
}

// ─── Язык ───
function applyLang(next) {
  lang = next;
  t = STRINGS[lang];
  document.documentElement.lang = lang;
  if (authInstance) authInstance.languageCode = lang;
  document.querySelectorAll('.lang-btn').forEach((btn) => {
    if (btn.dataset.lang === lang) btn.setAttribute('aria-current', 'true');
    else btn.removeAttribute('aria-current');
  });
  setTitle(titleFor(link.mode));
  current();
}

function titleFor(mode) {
  if (mode === 'resetPassword') return t.titleReset;
  if (mode === 'recoverEmail') return t.titleRecover;
  return t.titleVerify;
}

document.querySelectorAll('.lang-btn').forEach((btn) => {
  btn.addEventListener('click', () => applyLang(btn.dataset.lang));
});

// ─── Старт ───
function main() {
  applyLang(lang);
  const badCode = !link.code || link.code.length > 512 || /[\s\u0000-\u001f]/.test(link.code);
  if (link.duplicated || badCode || link.apiKey !== API_KEY) return showInvalid(false);
  if (link.mode === 'resetPassword') return startReset();
  if (OPERATIONS[link.mode]) return startEmailAction();
  return showInvalid(false);
}

main();
