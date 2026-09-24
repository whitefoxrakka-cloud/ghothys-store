/* Modal generic handlers (some specific modals handled in other modules) */
window.openNotificationModal = function(){document.getElementById('notification-modal').style.display='block';document.body.style.overflow='hidden';};
window.closeNotificationModal = function(){document.getElementById('notification-modal').style.display='none';document.body.style.overflow='auto';};
window.openCaraTopUpModal = function(){document.getElementById('cara-topup-modal').style.display='block';document.body.style.overflow='hidden';};
window.closeCaraTopUpModal = function(){document.getElementById('cara-topup-modal').style.display='none';document.body.style.overflow='auto';};
window.openFAQModal = function(){document.getElementById('faq-modal').style.display='block';document.body.style.overflow='hidden';};
window.closeFAQModal = function(){document.getElementById('faq-modal').style.display='none';document.body.style.overflow='auto';};
