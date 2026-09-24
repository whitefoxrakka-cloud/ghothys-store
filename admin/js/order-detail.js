(function(){
  function moneyIdr(n){
    const x = Number(n || 0);
    return 'Rp ' + x.toLocaleString('id-ID');
  }

  function ensureToasts(){
    if(typeof window.showErrorToast !== 'function'){
      window.showErrorToast = (t,m)=> alert(`${t}\n\n${m||''}`);
    }
    if(typeof window.showToast !== 'function'){
      window.showToast = (t,m)=> alert(`${t}\n\n${m||''}`);
    }
  }

  function getQueryId(){
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
  }

  async function fetchOrder(id){
    return window.AdminAPI.adminFetch(`/admin/orders/${encodeURIComponent(id)}`, { method:'GET' });
  }

  async function setStatus(id, status){
    return window.AdminAPI.adminFetch(`/admin/orders/${encodeURIComponent(id)}/status`, {
      method:'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  function setText(id, text){
    const el = document.getElementById(id);
    if(el) el.textContent = text;
  }

  function setButtonsForStatus(status){
    const st = status || '';

    const btnProcess = document.getElementById('btn-process');
    const btnSuccess = document.getElementById('btn-success');
    const btnCancel = document.getElementById('btn-cancel');

    if(btnProcess) btnProcess.disabled = st === 'Success' || st === 'Cancel';
    if(btnSuccess) btnSuccess.disabled = st === 'Success' || st === 'Cancel';
    if(btnCancel) btnCancel.disabled = st === 'Success' || st === 'Cancel';

    // extra: disable invalid transitions locally (best-effort)
    const allowed = {
      Pending: ['Diproses', 'Cancel'],
      Diproses: ['Success', 'Cancel'],
      Success: [],
      Cancel: [],
    };

    if(btnProcess){
      const will = 'Diproses';
      btnProcess.disabled = !allowed[st] || !allowed[st].includes(will);
    }
    if(btnSuccess){
      const will = 'Success';
      btnSuccess.disabled = !allowed[st] || !allowed[st].includes(will);
    }
    if(btnCancel){
      const will = 'Cancel';
      btnCancel.disabled = !allowed[st] || !allowed[st].includes(will);
    }
  }

  function setLoading(btn, isLoading, text){
    if(!btn) return;
    if(isLoading){
      btn.disabled = true;
      if(btn.dataset.originalText) {
        // keep original
      } else {
        btn.dataset.originalText = btn.textContent;
      }
      if(text) btn.textContent = text;
    } else {
      btn.disabled = false;
      if(btn.dataset.originalText) btn.textContent = btn.dataset.originalText;
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    ensureToasts();

    const logoutBtn = document.getElementById('logout-btn');
    if(logoutBtn){
      logoutBtn.addEventListener('click', async ()=>{
        try{ await window.AdminAPI.adminFetch('/admin/logout',{method:'POST'}); }catch(e){}
        window.AdminAPI.clearToken();
        window.location.href = './login.html';
      });
    }

    const backBtn = document.getElementById('back-orders');
    if(backBtn){
      backBtn.addEventListener('click', ()=>{
        window.location.href = './orders.html';
      });
    }

    const id = getQueryId();
    if(!id){
      window.showErrorToast('Error', 'Order ID tidak ditemukan di query string');
      return;
    }

    const btnProcess = document.getElementById('btn-process');
    const btnSuccess = document.getElementById('btn-success');
    const btnCancel = document.getElementById('btn-cancel');

    let order = null;

    try{
      const res = await fetchOrder(id);
      // backend returns {success:true, data: rows[0]} per response.success shape
      // but our response.success wraps {success,message,data}
      order = res && res.data ? res.data : null;
      if(!order){
        throw new Error('Response data kosong');
      }

      setText('f-order-id', order.order_id || order.orderId || '');
      setText('f-status', order.status || '');
      setText('f-customer-name', order.customer_name || '');
      setText('f-uid', order.user_uid || '');
      setText('f-game', order.game || '');
      setText('f-server', order.server || '');
      setText('f-product', order.product || '');
      setText('f-price', moneyIdr(order.price));
      setText('f-payment', order.payment || '');
      const createdAt = order.created_at ? new Date(order.created_at).toLocaleString('id-ID') : '—';
      setText('f-created-at', createdAt);

      setButtonsForStatus(order.status);
    }catch(err){
      const st = err && err.status ? err.status : null;
      if(st === 401 || st === 403){
        window.AdminAPI.clearToken();
        window.location.href = './login.html';
        return;
      }
      window.showErrorToast('Gagal memuat order', err.message || 'Terjadi kesalahan');
      return;
    }

    async function handleTransition(targetStatus, btnEl){
      if(!order) return;

      const original = btnEl ? btnEl.textContent : '';
      try{
        setLoading(btnEl, true, 'Memproses...');
        const res = await setStatus(order.id || order.order_id, targetStatus);

        // refresh page for correctness
        window.showToast('✅ Update Status', 'Status order berhasil diperbarui');
        // Reload to reflect locked state
        window.location.reload();
      }catch(err){
        const st = err && err.status ? err.status : null;
        if(st === 401 || st === 403){
          window.AdminAPI.clearToken();
          window.location.href = './login.html';
          return;
        }
        window.showErrorToast('Gagal update status', err.message || 'Terjadi kesalahan');
      }finally{
        if(btnEl){
          setLoading(btnEl, false, original);
          setButtonsForStatus(order.status);
        }
      }
    }

    if(btnProcess){
      btnProcess.addEventListener('click', ()=> handleTransition('Diproses', btnProcess));
    }
    if(btnSuccess){
      btnSuccess.addEventListener('click', ()=> handleTransition('Success', btnSuccess));
    }
    if(btnCancel){
      btnCancel.addEventListener('click', ()=> handleTransition('Cancel', btnCancel));
    }
  });
})();
