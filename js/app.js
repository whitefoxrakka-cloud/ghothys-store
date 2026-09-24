function closeCurrentModal(button) {
  const backdrop = button.closest('.modal-backdrop');
  if (!backdrop) return;
  backdrop.style.display = 'none';
  document.body.style.overflow = 'auto';
}

function attachAppListeners() {
  document.querySelectorAll('.nav-link[data-page]').forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      const page = link.dataset.page;
      if (page && typeof navigateTo === 'function') {
        navigateTo(page, event);
      }
    });
  });

  document.querySelectorAll('[data-action]').forEach(el => {
    const action = el.dataset.action;
    if (!action) return;

    if (action === 'navigate-home') {
      el.addEventListener('click', () => {
        if (typeof navigateTo === 'function') navigateTo('home-page');
      });
      return;
    }

    if (action === 'avatar-upload') {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const input = document.getElementById('avatar-upload');
        if (input) input.click();
      });
      return;
    }

    if (action === 'toggle-dark' && typeof toggleDarkMode === 'function') {
      el.addEventListener('click', toggleDarkMode);
      return;
    }

    if (action === 'logout' && typeof handleLogout === 'function') {
      el.addEventListener('click', handleLogout);
      return;
    }

    const actionMap = {
      'open-login': 'openLoginModal',
      'open-register': 'openRegisterModal',
      'open-change-username': 'openChangeUsernameModal',
      'open-change-password': 'openChangePasswordModal',
      'open-change-phone': 'openChangePhoneModal',
      'open-notification': 'openNotificationModal',
      'open-owner-panel': 'openOwnerPanel',
      'open-owner-announcements': 'openAnnouncementManager',
      'open-owner-events': 'openEventManager',
      'open-owner-banners': 'openBannerManager',
      'open-topup-points': 'openTopUpPointsModal',
      'open-faq': 'openFAQModal',
      'open-cara-topup': 'openCaraTopUpModal',
      'open-forgot-password': 'openForgotPasswordModal',
      'close-modal': 'closeCurrentModal',
      'scroll-games': 'scrollGames',
      'toggle-emoji': 'toggleEmojiPicker',
      'send-community-message': 'sendCommunityMessage',
    };

    if (action === 'slider-prev') {
      el.addEventListener('click', event => {
        event.preventDefault();
        if (typeof prevSlide === 'function') prevSlide();
      });
      return;
    }

    if (action === 'slider-next') {
      el.addEventListener('click', event => {
        event.preventDefault();
        if (typeof nextSlide === 'function') nextSlide();
      });
      return;
    }

    if (action === 'slider-dot') {
      el.addEventListener('click', event => {
        event.preventDefault();
        const target = Number(el.dataset.slide || 0);
        if (typeof goToSlide === 'function') goToSlide(target);
      });
      return;
    }

    if (action === 'switch-register') {
      el.addEventListener('click', event => {
        event.preventDefault();
        if (typeof switchToRegister === 'function') switchToRegister(event);
      });
      return;
    }

    if (action === 'switch-login') {
      el.addEventListener('click', event => {
        event.preventDefault();
        if (typeof switchToLogin === 'function') switchToLogin(event);
      });
      return;
    }

    if (action === 'back-phone-step1') {
      el.addEventListener('click', event => {
        event.preventDefault();
        if (typeof backToPhoneStep1 === 'function') backToPhoneStep1();
      });
      return;
    }

    if (action === 'scroll-games') {
      el.addEventListener('click', event => {
        event.preventDefault();
        const gamesContainer = document.getElementById('games-container');
        if (gamesContainer) gamesContainer.scrollIntoView({ behavior: 'smooth' });
      });
      return;
    }

    if (action === 'close-modal') {
      el.addEventListener('click', event => {
        event.preventDefault();
        closeCurrentModal(el);
      });
      return;
    }

    if (action === 'toggle-faq') {
      el.addEventListener('click', () => {
        if (typeof toggleFAQ === 'function') toggleFAQ(el);
      });
      return;
    }

    const mapped = actionMap[action];
    if (mapped && typeof window[mapped] === 'function') {
      el.addEventListener('click', event => {
        if (['open-forgot-password', 'switch-register', 'switch-login'].includes(action)) {
          event.preventDefault();
        }
        window[mapped](event);
      });
    }
  });

  const avatarUpload = document.getElementById('avatar-upload');
  if (avatarUpload && typeof handleAvatarUpload === 'function') {
    avatarUpload.addEventListener('change', handleAvatarUpload);
  }

  document.querySelectorAll('.comm-menu-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.comm-menu-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
    });
  });

  document.querySelectorAll('.faq-question').forEach(question => {
    question.addEventListener('click', () => {
      if (typeof toggleFAQ === 'function') toggleFAQ(question);
    });
  });

  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', event => {
      if (event.target === backdrop) {
        if (typeof window.closeOwnerPanel === 'function') {
          window.closeOwnerPanel();
        } else {
          backdrop.style.display = 'none';
          document.body.style.overflow = 'auto';
        }
      }
    });
  });

  // Close owner modal on Escape key if open
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || e.key === 'Esc') {
      const modal = document.getElementById('owner-panel-modal');
      if (modal && modal.style.display === 'block') {
        if (typeof window.closeOwnerPanel === 'function') window.closeOwnerPanel();
        else { modal.style.display = 'none'; document.body.style.overflow = 'auto'; }
      }
    }
  });

  const formMappings = {
    'topup-form': 'handleTopUp',
    'login-form': 'handleLogin',
    'register-form': 'handleRegister',
    'change-password-form': 'handleChangePassword',
    'forgot-password-form': 'handleForgotPassword',
    'phone-verify-form': 'sendPhoneVerification',
    'phone-code-form': 'verifyPhoneCode',
    'change-username-form': 'handleChangeUsername',
    'topup-points-form': 'handleTopUpPoints',
  };

  Object.entries(formMappings).forEach(([formId, fnName]) => {
    const form = document.getElementById(formId);
    if (form && typeof window[fnName] === 'function') {
      form.addEventListener('submit', event => {
        event.preventDefault();
        window[fnName](event);
      });
    }
  });

  // Special async handler for topup form with Backend API integration
  const topupForm = document.getElementById('topup-form');
  if(topupForm && typeof window.handleTopUpWithBackend === 'function'){
    topupForm.removeEventListener('submit', window.formSubmitListener);
    topupForm.addEventListener('submit', window.handleTopUpWithBackend);
  }

  const commInput = document.getElementById('comm-message-input');
  if (commInput) {
    commInput.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        if (typeof sendCommunityMessage === 'function') sendCommunityMessage();
      }
    });
  }

  const notificationCheckboxes = [
    { id: 'notif-email', type: 'email' },
    { id: 'notif-whatsapp', type: 'whatsapp' },
    { id: 'notif-push', type: 'push' },
    { id: 'notif-promo', type: 'promo' },
  ];

  notificationCheckboxes.forEach(({ id, type }) => {
    const checkbox = document.getElementById(id);
    if (checkbox && typeof handleNotificationChange === 'function') {
      checkbox.addEventListener('change', event => {
        handleNotificationChange(type, event.target.checked);
      });
    }
  });
}

function initializeApp() {
  if (localStorage.getItem('ghothys_dark') === 'true') {
    document.documentElement.setAttribute('data-theme', 'dark');
    const btn = document.getElementById('dark-mode-btn');
    if (btn) btn.textContent = '☀️';
  }

  if (typeof updateSlider === 'function') {
    updateSlider();
    window.autoSlideTimer = setInterval(window.nextSlide, 5000);
  }

  if (typeof restoreSession === 'function') restoreSession();
  if (typeof renderGames === 'function') renderGames();
  if (typeof setupSearchFunction === 'function') setupSearchFunction();
  if (typeof updateUI === 'function') updateUI();
  if (typeof startFallingStars === 'function') startFallingStars();
  if (typeof renderCommunityChat === 'function') renderCommunityChat();
  if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') lucide.createIcons();
  attachAppListeners();
}

document.addEventListener('DOMContentLoaded', initializeApp);
