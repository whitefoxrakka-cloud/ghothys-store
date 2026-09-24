/* Simple router/navigation between pages */
window.navigateTo = function(pageId,event){
  if(event)event.preventDefault();
  if((pageId==='transactions-page'||pageId==='profile-page')&&!window.currentUser){
    window.showErrorToast('Login Diperlukan','Silakan login terlebih dahulu');
    window.openLoginModal();
    return;
  }
  document.querySelectorAll('.page-content').forEach(p=>p.classList.remove('active'));
  const target=document.getElementById(pageId);if(target)target.classList.add('active');
  document.querySelectorAll('.nav-link').forEach(l=>{l.classList.toggle('active',l.dataset.page===pageId);});
  document.getElementById('site-footer').style.display=(pageId==='home-page')?'block':'none';
  if(pageId==='transactions-page')window.renderTransactions();
  if(pageId==='profile-page')window.updateProfileStats();
  if(pageId==='community-page')lucide.createIcons();
  window.scrollTo({top:0,behavior:'smooth'});
};
