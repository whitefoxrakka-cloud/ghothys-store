(function(){
  function moneyIdr(n){
    const x = Number(n || 0);
    return 'Rp ' + x.toLocaleString('id-ID');
  }

  function max(arr){
    return (arr || []).reduce((m,v)=> Math.max(m, Number(v||0)), 0);
  }

  async function fetchDashboard(){
    return window.AdminAPI.adminFetch('/admin/dashboard', { method:'GET' });
  }

  function renderChart(chart){
    const wrap = document.getElementById('chart-orders');
    if(!wrap || !chart) return;
    wrap.innerHTML = '';

    const orders = chart.orders || [];
    const labels = chart.days || [];
    const m = max(orders) || 1;

    for(let i=0;i<orders.length;i++){
      const val = Number(orders[i] || 0);
      const ratio = val / m;
      const heightPct = Math.max(6, ratio*100);

      const bar = document.createElement('div');
      bar.className = 'bar';

      const col = document.createElement('div');
      col.className = 'col';
      col.style.height = heightPct + '%';

      const lbl = document.createElement('div');
      lbl.className = 'lbl';
      lbl.textContent = labels[i] || '';

      bar.appendChild(col);
      bar.appendChild(lbl);
      wrap.appendChild(bar);
    }
  }

  function renderStats(data){
    if(!data || !data.data) return;
    const d = data.data;

    const totalOrders = document.getElementById('stat-total-orders');
    const totalRevenue = document.getElementById('stat-total-revenue');
    const totalMembers = document.getElementById('stat-total-members');
    const statusSummary = document.getElementById('status-summary');
    const pills = document.getElementById('status-pills');

    if(totalOrders) totalOrders.textContent = String(d.totals?.totalOrdersToday ?? '0');
    if(totalRevenue) totalRevenue.textContent = moneyIdr(d.totals?.totalRevenueToday ?? 0);
    if(totalMembers) totalMembers.textContent = String(d.totals?.totalOrders ?? 0);

    const sc = d.statusCounts || {};
    const sumText = `Pending ${sc.Pending || 0} • Diproses ${sc.Diproses || 0} • Success ${sc.Success || 0} • Cancel ${sc.Cancel || 0}`;
    if(statusSummary) statusSummary.textContent = sumText;

    if(pills){
      pills.innerHTML = '';
      const items = [
        ['Pending', sc.Pending || 0],
        ['Diproses', sc.Diproses || 0],
        ['Success', sc.Success || 0],
        ['Cancel', sc.Cancel || 0],
      ];
      for(const [name, cnt] of items){
        const p = document.createElement('div');
        p.className = 'pill';
        p.innerHTML = `<span>${name}</span>${cnt}`;
        pills.appendChild(p);
      }
    }
  }

  function renderAll(data){
    renderStats(data);
    if(data && data.data && data.data.chart) renderChart(data.data.chart);
  }

  function ensureToasts(){
    if(typeof window.showErrorToast !== 'function'){
      window.showErrorToast = (t,m)=> alert(`${t}\n\n${m||''}`);
    }
    if(typeof window.showToast !== 'function'){
      window.showToast = (t,m)=> alert(`${t}\n\n${m||''}`);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    ensureToasts();

    const refreshBtn = document.getElementById('refresh-btn');
    if(refreshBtn){
      refreshBtn.addEventListener('click', async () => {
        try{
          refreshBtn.disabled = true;
          const res = await fetchDashboard();
          renderAll(res);
          window.showToast('✅ Dashboard', 'Data diperbarui');
        }catch(err){
          const status = err && err.status ? err.status : null;
          if(status === 401 || status === 403){
            window.AdminAPI.clearToken();
            window.location.href = './login.html';
            return;
          }
          window.showErrorToast('Gagal memuat dashboard', err.message || 'Terjadi kesalahan');
        }finally{
          refreshBtn.disabled = false;
        }
      });
    }

    (async () => {
      try{
        const res = await fetchDashboard();
        renderAll(res);
      }catch(err){
        const status = err && err.status ? err.status : null;
        if(status === 401 || status === 403){
          window.AdminAPI.clearToken();
          window.location.href = './login.html';
          return;
        }
        window.showErrorToast('Gagal memuat dashboard', err.message || 'Terjadi kesalahan');
      }
    })();

    const logoutBtn = document.getElementById('logout-btn');
    if(logoutBtn){
      logoutBtn.addEventListener('click', async () => {
        try{
          await window.AdminAPI.adminFetch('/admin/logout', { method:'POST' });
        }catch(e){
          // ignore
        }finally{
          window.AdminAPI.clearToken();
          window.location.href = './login.html';
        }
      });
    }
  });
})();
