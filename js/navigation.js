/* Additional navigation setup (sidebar menu, etc) */
window.setupNavigation = function(){
  // Community sidebar menu
  document.querySelectorAll('.comm-menu-item').forEach(item=>{
    item.addEventListener('click',()=>{document.querySelectorAll('.comm-menu-item').forEach(i=>i.classList.remove('active'));item.classList.add('active');});
  });
};
