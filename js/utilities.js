/* Utility helpers, toasts, formatters */
(function(){
  window.showToast = function(title,msg){const t=document.getElementById('success-toast');document.getElementById('toast-title').textContent=title;document.getElementById('toast-message').textContent=msg;t.style.display='block';setTimeout(()=>t.style.display='none',3000);};
  window.showErrorToast = function(title,msg){const t=document.getElementById('error-toast');document.getElementById('error-toast-title').textContent=title;document.getElementById('error-toast-message').textContent=msg;t.style.display='block';setTimeout(()=>t.style.display='none',3000);};
})();
