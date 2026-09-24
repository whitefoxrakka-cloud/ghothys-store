(function(){
  function fmtMoney(x){
    const n = Number(x || 0);
    return 'Rp ' + n.toLocaleString('id-ID');
  }

  function ensureToasts(){
    if(typeof window.showErrorToast !== 'function'){
      window.showErrorToast = (t,m)=> alert(`${t}\n\n${m||''}`);
    }
    if(typeof window.showToast !== 'function'){
      window.showToast = (t,m)=> alert(`${t}\n\n${m||''}`);
    }
  }

  function getQueryState(){
    const params = new URLSearchParams(window.location.search);
    return {
      page: Number(params.get('page') || '1'),
      limit: Number(params.get('limit') || '10'),
    };
  }

  function setLoading(isLoading){
    const applyBtn = document.getElementById('apply-btn');
    const spinner = document.getElementById('apply-spinner');
    if(spinner) spinner.style.display = isLoading ? 'inline-block' : 'none';
    if(applyBtn) applyBtn.disabled = isLoading;
  }

  async function fetchOrders(state){
    const search = document.getElementById('search').value.trim();
    const status = document.getElementById('status').value;
    const sortBy = document.getElementById('sortBy').value;
    const sortOrder = document.getElementById('sortOrder').value;

    const params = new URLSearchParams();
    params.set('page', String(state.page));
    params.set('limit', String(state.limit));
    if(search) params.set('search', search);
    if(status) params.set('status', status);
    if(sortBy) params.set('sortBy', sortBy);
    if(sortOrder) params.set('sortOrder', sortOrder);

    return window.AdminAPI.adminFetch(`/admin/orders?${params.toString()}`, { method:'GET' });
  }

  function renderOrders(data){
    const tbody = document.getElementById('orders-tbody');
    const meta = document.getElementById('meta-text');
    const pageText = document.getElementById('page-text');

    if(!tbody) return;
    tbody.innerHTML = '';

    const d = data && data.data ? data.data : null;
    if(!d || !Array.isArray(d.data)) {
      tbody.innerHTML = '';
      if(meta) meta.textContent = 'Tidak ada data';
      return;
    }

    const rows = d.data;
    if(meta) meta.textContent = `Total: ${d.totalRows} • Page: ${d.page}/${d.totalPages}`;

    if(pageText) pageText.textContent = `Page ${d.page} / ${d.totalPages}`;

    for(const o of rows){
      const tr = document.createElement('tr');

      const created = o.created_at ? new Date(o.created_at).toLocaleString('id-ID') : '—';

      const aksiHtml = `
        <button class="btn" type="button" data-open="${o.id}" style="padding:8px 12px; border-radius:10px;">Detail</button>
      `;

      tr.innerHTML = `
        <td>${o.order_id || o.orderId || ''}</td>
        <td>${o.customer_name || ''}</td>
        <td>${o.user_uid || ''}</td>
        <td>${o.game || ''}</td>
        <td>${fmtMoney(o.price)}</td>
        <td>${o.status || ''}</td>
        <td>${created}</td>
        <td>${aksiHtml}</td>
      `;
      tbody.appendChild(tr);
    }

    tbody.querySelectorAll('button[data-open]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const id = btn.getAttribute('data-open');
        window.location.href = `./order-detail.html?id=${encodeURIComponent(id)}`;
      });
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    ensureToasts();

    const backBtn = document.getElementById('back-dashboard');
    if(backBtn){
      backBtn.addEventListener('click', ()=> window.location.href = './dashboard.html');
    }

    const logoutBtn = document.getElementById('logout-btn');
    if(logoutBtn){
      logoutBtn.addEventListener('click', async ()=>{
        try{ await window.AdminAPI.adminFetch('/admin/logout',{method:'POST'}); }catch(e){}
        window.AdminAPI.clearToken();
        window.location.href = './login.html';
      });
    }

    const init = getQueryState();

    const search = document.getElementById('search');
    const status = document.getElementById('status');
    const sortBy = document.getElementById('sortBy');
    const sortOrder = document.getElementById('sortOrder');
    const limit = document.getElementById('limit');

    if(limit) limit.value = String(init.limit);

    let currentPage = init.page;
    let currentLimit = init.limit;
    let totalPages = 1;

    async function load(){
      setLoading(true);
      try{
        // read UI limit each time
        currentLimit = Number(limit.value || '10');
        const state = { page: currentPage, limit: currentLimit };
        const res = await fetchOrders(state);
        if(res && res.data){
          totalPages = res.data.totalPages || 1;
          renderOrders(res);
        }else{
          renderOrders({ data: { data: [] }});
        }
      }catch(err){
        const statusCode = err && err.status ? err.status : null;
        if(statusCode === 401 || statusCode === 403){
          window.AdminAPI.clearToken();
          window.location.href = './login.html';
          return;
        }
        window.showErrorToast('Gagal memuat order', err.message || 'Terjadi kesalahan');
      }finally{
        setLoading(false);
      }
    }

    const applyBtn = document.getElementById('apply-btn');
    if(applyBtn){
      applyBtn.addEventListener('click', ()=>{
        currentPage = 1;
        load();
      });
    }

    const prevBtn = document.getElementById('prev-btn');
    if(prevBtn){
      prevBtn.addEventListener('click', ()=>{
        if(currentPage > 1){
          currentPage -= 1;
          load();
        }
      });
    }

    const nextBtn = document.getElementById('next-btn');
    if(nextBtn){
      nextBtn.addEventListener('click', ()=>{
        if(currentPage < totalPages){
          currentPage += 1;
          load();
        }
      });
    }

    // initial load
    await load();
  });
})();
