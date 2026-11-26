(() => {
  "use strict";

  const PACKAGES = [50, 75, 100, 150, 250, 350, 500, 750, 1000, 1500, 2500, 5000, 10000, 25000, 35000, 50000, 100000, 150000, 500000, 1000000, 5000000, 10000000];
  const SHOP = window.SHOP_CONFIG || {};
  const ADMIN = String(SHOP.adminUsername || "op_star").replace(/^@/, "");
  const REQUISITES = String(SHOP.sberRequisites || "").trim();
  const RECIPIENT = String(SHOP.recipientName || "").trim();
  const tg = window.Telegram && window.Telegram.WebApp;
  const isMiniApp = Boolean(tg);
  let selectedStars = 100;
  let activeFilter = "all";
  let toastTimer;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const priceOf = stars => stars * 1.5;
  const numberFormat = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });
  const priceFormat = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 });
  const formatNumber = number => numberFormat.format(number).replace(/[\u00a0\u202f]/g, " ");
  const formatPrice = stars => priceFormat.format(priceOf(stars)).replace(/[\u00a0\u202f]/g, " ") + " ₽";
  const icon = name => '<svg class="icon" aria-hidden="true"><use href="#i-' + name + '"></use></svg>';

  function showToast(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2300);
  }

  function applyTheme(theme) {
    const isDark = theme === "dark";
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
    const meta = $('meta[name="theme-color"]');
    const bg = tg && tg.themeParams && tg.themeParams.bg_color;
    if (meta && bg) meta.setAttribute("content", bg);
  }

  if (tg) {
    tg.ready();
    if (typeof tg.expand === "function") tg.expand();
    if (typeof tg.setHeaderColor === "function") tg.setHeaderColor("bg_color");
    if (typeof tg.setBackgroundColor === "function") tg.setBackgroundColor("bg_color");
    applyTheme(tg.colorScheme || "light");
    if (typeof tg.onEvent === "function") tg.onEvent("themeChanged", () => applyTheme(tg.colorScheme || "light"));
  } else {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    applyTheme(media.matches ? "dark" : "light");
    if (typeof media.addEventListener === "function") media.addEventListener("change", event => applyTheme(event.matches ? "dark" : "light"));
  }

  const packagesGrid = $("#package-grid");

  function categoryOf(stars) {
    if (stars <= 750) return "small";
    if (stars <= 10000) return "thousands";
    if (stars <= 500000) return "large";
    return "millions";
  }

  function renderPackages() {
    packagesGrid.innerHTML = PACKAGES.map(stars => {
      const selected = stars === selectedStars;
      const popular = stars === 100;
      return '<button class="package-card' + (selected ? " is-selected" : "") + (popular ? " is-popular" : "") +
        '" type="button" data-stars="' + stars + '" data-category="' + categoryOf(stars) + '" aria-pressed="' + selected +
        '" aria-label="' + formatNumber(stars) + " звёзд за " + formatPrice(stars) + '">' +
        '<span class="package-star">' + icon("star") + '</span>' +
        '<span class="package-data"><span class="package-count">' + formatNumber(stars) +
        '</span><span class="package-unit">звёзд</span></span>' +
        '<span class="package-price">' + formatPrice(stars) + '</span></button>';
    }).join("");

    $$(".package-card", packagesGrid).forEach(card => {
      card.hidden = activeFilter !== "all" && card.dataset.category !== activeFilter;
      card.addEventListener("click", () => {
        selectedStars = Number(card.dataset.stars);
        renderPackages();
        updateSummary();
      });
    });
  }

  function updateSummary() {
    const count = formatNumber(selectedStars);
    const price = formatPrice(selectedStars);
    $("#selected-count").textContent = count;
    $("#selected-price").textContent = price;
    $("#selected-total").textContent = price;
    $("#mobile-total").textContent = price;
    $("#checkout-stars").textContent = count + " звёзд";
    $("#checkout-price").textContent = price;
    $("#payment-amount").textContent = price;
  }

  $$(".filter-chip").forEach(button => {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.filter;
      $$(".filter-chip").forEach(chip => {
        const active = chip === button;
        chip.classList.toggle("is-active", active);
        chip.setAttribute("aria-pressed", String(active));
      });
      renderPackages();
    });
  });

  renderPackages();
  updateSummary();

  if (isMiniApp) {
    $("#step-two-title").textContent = "Оплата через Telegram";
    $("#step-two-text").textContent = "Для заказа внутри Mini App подключим оплату Telegram Stars.";
    $("#step-three-title").textContent = "Свяжись с админом";
    $("#step-three-text").textContent = "По доступности заказа и вопросам напиши @op_star.";
    $("#order-secure-text").textContent = "Оплату в Mini App подключим через бота";
  }

  const promoDialog = $("#promo-dialog");
  const checkoutDialog = $("#checkout-dialog");
  const usernameInput = $("#telegram-username");
  const telegramUser = tg && tg.initDataUnsafe && tg.initDataUnsafe.user;
  const telegramUsername = telegramUser && telegramUser.username ? String(telegramUser.username).replace(/^@/, "") : "";

  function openDialog(dialog) {
    if (!dialog.open) dialog.showModal();
  }

  $("#open-promo").addEventListener("click", () => openDialog(promoDialog));
  $("#order-button").addEventListener("click", openCheckout);
  $("#mobile-order-button").addEventListener("click", openCheckout);

  function openCheckout() {
    updateSummary();
    $("#username-step").hidden = false;
    $("#payment-step").hidden = true;
    $("#progress-one").classList.add("is-current");
    $("#progress-one").classList.remove("is-done");
    $("#progress-two").classList.remove("is-current");
    $("#checkout-title").textContent = "Остался один шаг";
    $("#username-error").textContent = "";
    usernameInput.removeAttribute("aria-invalid");
    if (telegramUsername && !usernameInput.value) usernameInput.value = telegramUsername;
    openDialog(checkoutDialog);
    window.setTimeout(() => usernameInput.focus({ preventScroll: true }), 80);
  }

  $$(".modal-close").forEach(button => {
    button.addEventListener("click", () => button.closest("dialog").close());
  });
  [promoDialog, checkoutDialog].forEach(dialog => {
    dialog.addEventListener("click", event => {
      if (event.target === dialog) dialog.close();
    });
  });

  $("#username-form").addEventListener("submit", event => {
    event.preventDefault();
    const username = usernameInput.value.trim().replace(/^@+/, "");
    const error = $("#username-error");
    if (!/^[A-Za-z0-9_]{5,32}$/.test(username)) {
      error.textContent = "Проверь юзернейм: нужно от 5 до 32 латинских букв, цифр или знаков _.";
      usernameInput.setAttribute("aria-invalid", "true");
      usernameInput.focus();
      return;
    }

    usernameInput.value = username;
    usernameInput.removeAttribute("aria-invalid");
    error.textContent = "";
    $("#username-step").hidden = true;
    $("#payment-step").hidden = false;
    $("#progress-one").classList.remove("is-current");
    $("#progress-one").classList.add("is-done");
    $("#progress-two").classList.add("is-current");
    $("#checkout-title").textContent = isMiniApp ? "Свяжись с админом" : "Оплати и напиши админу";
    renderPaymentDetails();
    updateAdminLink();
  });

  usernameInput.addEventListener("input", () => {
    usernameInput.value = usernameInput.value.replace(/^@+/, "").replace(/\s/g, "");
    usernameInput.removeAttribute("aria-invalid");
    $("#username-error").textContent = "";
  });

  $("#back-to-username").addEventListener("click", () => {
    $("#payment-step").hidden = true;
    $("#username-step").hidden = false;
    $("#progress-two").classList.remove("is-current");
    $("#progress-one").classList.add("is-current");
    $("#progress-one").classList.remove("is-done");
    $("#checkout-title").textContent = "Остался один шаг";
    usernameInput.focus({ preventScroll: true });
  });

  function renderPaymentDetails() {
    const container = $("#payment-requisites");
    container.classList.toggle("is-miniapp", isMiniApp);
    container.classList.toggle("is-unconfigured", !REQUISITES && !isMiniApp);
    $("#payment-reminder").hidden = isMiniApp;
    $("#copy-amount").hidden = isMiniApp;

    if (isMiniApp) {
      $("#payment-heading").textContent = "Оплата Telegram Stars";
      container.innerHTML =
        '<div class="requisite-topline"><span>ОПЛАТА В MINI APP</span><span class="requisite-bank">Telegram Stars</span></div>' +
        '<p class="requisite-placeholder">Подключим оплату через бота</p>' +
        '<p class="requisite-placeholder-note">Telegram требует оплачивать цифровые товары внутри Mini App через Telegram Stars. После настройки бот откроет встроенное окно оплаты.</p>';
      $("#payment-description").textContent = "Стоимость заказа уже рассчитана. Сейчас можно написать админу и уточнить подключение оплаты.";
      $("#payment-label").textContent = "Стоимость заказа";
      return;
    }

    $("#payment-heading").textContent = "Оплати переводом на Сбер";
    $("#payment-label").textContent = "К оплате";
    if (!REQUISITES) {
      container.innerHTML =
        '<div class="requisite-topline"><span>СПОСОБ ОПЛАТЫ</span><span class="requisite-bank">Сбербанк</span></div>' +
        '<p class="requisite-placeholder">Реквизиты добавим перед запуском</p>' +
        '<p class="requisite-placeholder-note">Сейчас можно написать админу и запросить реквизиты для перевода.</p>';
      $("#payment-description").textContent = "После перевода открой чат с администратором и прикрепи фото чека.";
      return;
    }

    const safeRequisites = escapeHtml(REQUISITES);
    const safeRecipient = RECIPIENT ? '<p class="requisite-recipient">Получатель: ' + escapeHtml(RECIPIENT) + '</p>' : "";
    container.innerHTML =
      '<div class="requisite-topline"><span>ПЕРЕВОД НА</span><span class="requisite-bank">Сбербанк</span></div>' +
      '<div class="requisite-detail"><p class="requisite-value">' + safeRequisites + '</p>' + safeRecipient + '</div>' +
      '<button type="button" class="requisite-copy" id="copy-requisites" aria-label="Скопировать реквизиты">' + icon("copy") + '</button>';
    const copyButton = $("#copy-requisites");
    copyButton.addEventListener("click", () => copyText(REQUISITES, "Реквизиты скопированы"));
    $("#payment-description").textContent = "Переведи ровно указанную сумму. После оплаты открой чат с администратором и прикрепи фото чека.";
  }

  function updateAdminLink() {
    const link = $("#admin-link");
    const username = usernameInput.value.trim().replace(/^@+/, "");
    const needsRequisites = !REQUISITES && !isMiniApp;
    const orderLine = "@" + username + "; " + formatNumber(selectedStars) + " Stars; " + priceFormat.format(priceOf(selectedStars)).replace(/[\u00a0\u202f]/g, " ") + " ₽";
    let message;
    if (isMiniApp) {
      message = "Заказ " + orderLine + "; оплата Telegram Stars.";
    } else if (needsRequisites) {
      message = "Заказ " + orderLine + "; нужны реквизиты Сбера.";
    } else {
      message = "Заказ " + orderLine + "; оплатил, чек в чате.";
    }
    link.href = "https://t.me/" + encodeURIComponent(ADMIN) + "?text=" + encodeURIComponent(message);
    const label = isMiniApp ? "Уточнить заказ у админа " : (needsRequisites ? "Запросить реквизиты у админа " : "Оплатил — написать админу ");
    link.innerHTML = label + icon("arrow");
  }

  $("#admin-link").addEventListener("click", event => {
    if (tg && typeof tg.openTelegramLink === "function") {
      event.preventDefault();
      tg.openTelegramLink(event.currentTarget.href);
    }
  });

  $("#copy-amount").addEventListener("click", () => {
    const amount = priceFormat.format(priceOf(selectedStars)).replace(/[\u00a0\u202f]/g, "");
    copyText(amount, "Сумма скопирована");
  });

  const referralHandle = $("#referral-handle");
  const referralButton = $("#copy-referral");
  if (telegramUsername) {
    referralHandle.textContent = "@" + telegramUsername;
    referralButton.disabled = false;
    referralButton.addEventListener("click", () => copyText("@" + telegramUsername, "Юзернейм скопирован"));
  } else {
    referralHandle.textContent = "Открой сайт в Telegram";
    referralButton.title = "Юзернейм появится в Telegram Mini App";
  }

  async function copyText(value, successMessage) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
      } else {
        const field = document.createElement("textarea");
        field.value = value;
        field.setAttribute("readonly", "");
        field.style.position = "fixed";
        field.style.opacity = "0";
        document.body.appendChild(field);
        field.select();
        document.execCommand("copy");
        field.remove();
      }
      showToast(successMessage);
    } catch (error) {
      showToast("Не удалось скопировать — выдели текст вручную");
    }
  }

  function escapeHtml(value) {
    return value.replace(/[&<>"']/g, character => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);
  }
})();
