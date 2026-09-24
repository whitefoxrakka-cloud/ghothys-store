/* Dark mode toggle */
window.toggleDarkMode = function(){
  const d=document.documentElement.getAttribute('data-theme')==='dark';
  if(d){document.documentElement.removeAttribute('data-theme');document.getElementById('dark-mode-btn').textContent='🌙';localStorage.setItem('ghothys_dark','false');}
  else{document.documentElement.setAttribute('data-theme','dark');document.getElementById('dark-mode-btn').textContent='☀️';localStorage.setItem('ghothys_dark','true');}
};
