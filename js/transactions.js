/* Transactions rendering */
window.renderTransactions = function(){
  const container=document.getElementById('transactions-container');
  if(!window.currentUser){
    container.innerHTML=`<div class="text-center py-16"><div style="font-size:72px;margin-bottom:16px;">🔒</div><h3 class="text-xl font-bold mb-2" style="color:var(--text-primary)">Login Diperlukan</h3><button onclick="openLoginModal()" class="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold">Login</button></div>`;
    return;
  }
  const tx=window.getTransactions();
  if(!tx.length){
    container.innerHTML=`<div class="text-center py-16"><div style="font-size:72px;margin-bottom:16px;">📦</div><h3 class="text-xl font-bold mb-2" style="color:var(--text-primary)">Belum Ada Transaksi</h3><button onclick="navigateTo('home-page')" class="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold">Mulai Top Up</button></div>`;
    return;
  }
  container.innerHTML=tx.map(t=>{const date=new Date(t.created_at).toLocaleString('id-ID',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});const ok=t.status==='Berhasil';return`<div class="rounded-xl p-4 mb-3" style="background:var(--bg-card);box-shadow:var(--shadow);"><div class="flex items-center gap-4"><div class="w-12 h-12 rounded-xl flex items-center justify-center" style="background:var(--bg-primary);font-size:24px;">🎮</div><div class="flex-1 min-w-0"><div class="font-bold" style="color:var(--text-primary)">${t.game_name}</div><div class="text-sm" style="color:var(--text-secondary)">${t.package_name} · ${date}</div></div><div class="text-right"><div class="font-bold text-purple-600">${t.price}</div><span class="text-xs px-2 py-1 rounded-full ${ok?'bg-green-100 text-green-700':'bg-yellow-100 text-yellow-700'}">${t.status}</span></div></div></div>`;}).join('');
};
