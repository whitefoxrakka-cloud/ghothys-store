/* Top-up modal and checkout */
(function(){
  window.openGameDetail = function(game){
    if(!window.currentUser){window.showErrorToast('Login Diperlukan','Silakan login dulu');window.openLoginModal();return;}
    window.currentGame=game;
    document.getElementById('modal-icon').innerHTML=`<img src="${game.icon}" alt="${game.name}" style="width:60px;height:60px;object-fit:cover;border-radius:12px;" onerror="this.outerHTML='🎮'">`;
    document.getElementById('modal-title').textContent=game.name;
    document.getElementById('package-options').innerHTML=game.packages.map((p,i)=>{const dp=p.discount>0?p.price*(1-p.discount/100):p.price;return`<label class="border-2 rounded-lg p-4 cursor-pointer hover:border-purple-500" style="border-color:var(--border-color);"><input type="radio" name="package" value='${JSON.stringify(p)}' ${i===0?'required':''} class="mr-2"><div class="flex justify-between items-start"><div><span class="font-semibold" style="color:var(--text-primary)">${p.name}</span>${p.discount>0?`<div class="text-xs text-green-600">🔥 -${p.discount}%</div>`:''}</div><div class="text-purple-600 font-bold">Rp ${Math.floor(dp).toLocaleString('id-ID')}</div></div></label>`;}).join('');
    document.getElementById('available-points').textContent=window.currentUser.points||0;
    const pv = document.getElementById('payment-success-view');
    const pf = document.getElementById('topup-form');
    if(pv) pv.style.display='none';
    if(pf) pf.style.display='';
    document.getElementById('topup-modal').style.display='block';document.body.style.overflow='hidden';
  };

  window.closeModal = function(){document.getElementById('topup-modal').style.display='none';document.body.style.overflow='auto';};

  // Matikan handler lama agar tidak mengganggu flow pembayaran
  window.handleTopUp = function(event){
    console.warn('[TOPUP] handleTopUp() legacy is disabled. Use handleTopUpWithBackend().');
    try { if(event && event.preventDefault) event.preventDefault(); } catch(_) {}
  };

  /**
   * Instrumented handler with Backend API integration
   * Focus: end-to-end trace from click -> validation -> API -> success/error
   */
  window.handleTopUpWithBackend = async function(event){
    // ==========================
    // BUTTON CLICK
    // ==========================
    console.log('==========================');
    console.log('BUTTON CLICK');
    console.log('==========================');

    console.log('[STEP 1] Button Clicked', {
      event,
      target: event ? event.target : null,
      currentTarget: event ? event.currentTarget : null,
    });

    const btn = document.getElementById('submit-btn');
    const currentForm = document.getElementById('topup-form');

    console.log('[STEP 1] submit button element:', btn);
    console.log('[STEP 1] submit button disabled:', btn ? btn.disabled : 'btn missing');
    console.log('[STEP 1] current form:', currentForm);

    // Prevent default submit
    let preventCalled = false;
    try {
      event.preventDefault();
      preventCalled = true;
    } catch (_) {}
    console.log('[STEP 2] Form Submit preventDefault called:', preventCalled);

    // ==========================
    // FORM SUBMIT
    // ==========================
    console.log('==========================');
    console.log('FORM SUBMIT');
    console.log('==========================');

    const handlerName = (window.handleTopUpWithBackend === arguments.callee) ? 'handleTopUpWithBackend' : 'handleTopUpWithBackend';
    console.log('[STEP 2] nama handler aktif:', handlerName);

    // Apakah ada handleTopUp lama aktif?
    console.log('[STEP 2] handleTopUp() legacy exists:', typeof window.handleTopUp === 'function');
    console.log('[STEP 2] handleTopUp() legacy reference:', window.handleTopUp);

    console.log('[STEP 2] handleTopUpWithBackend used:', window.handleTopUpWithBackend === handlerName ? true : true);
    console.log('[FRONTEND] handleTopUpWithBackend Called');

    // ==========================
    // VALIDATION
    // ==========================
    if(!window.currentUser){
      window.showErrorToast('Login Diperlukan','Silakan login dulu');
      window.openLoginModal();
      console.log('==========================');
      console.log('[FLOW STOPPED] No currentUser');
      console.log('==========================');
      return;
    }

    // Prevent double click / re-entry
    console.log('[STEP 3] Validation start');
    if(btn && btn.disabled){
      console.log('[TOPUP] submit ignored, button disabled');
      if(window.__topupInFlight){
        console.log('==========================');
        console.log('[FLOW STOPPED] in-flight duplicate click');
        console.log('==========================');
        return;
      }
      console.warn('[TOPUP] btn.disabled is true but no in-flight order. Resetting btn.disabled=false and continuing.');
      btn.disabled = false;
    }

    console.log('[DEBUG] submit button:', btn);
    console.log('[DEBUG] disabled before check:', btn ? btn.disabled : 'btn missing');
    console.trace('[DEBUG] stack trace');

    window.__topupInFlight = true;

    try {
      const userId = document.getElementById('user-id').value.trim();
      const serverId = document.getElementById('server-id').value.trim();
      const packageSelect = document.querySelector('input[name="package"]:checked');
      const paymentSelect = document.querySelector('input[name="payment"]:checked');

      // Parse package and payment (may be undefined)
      const pkg = packageSelect ? JSON.parse(packageSelect.value) : undefined;
      const payment = paymentSelect ? paymentSelect.value : undefined;

      // Calculate price
      let finalPrice = pkg && typeof pkg.price !== 'undefined'
        ? (pkg.discount > 0 ? pkg.price * (1 - pkg.discount / 100) : pkg.price)
        : undefined;

      // Points check
      if(payment === 'Points'){
        const currentPoints = window.currentUser.points || 0;
        const neededPoints = (pkg && pkg.points) ? pkg.points : 0;

        if(currentPoints < neededPoints){
          console.log('[STEP 3] Validation fail: points not enough', { currentPoints, neededPoints });
          window.showErrorToast('Points Tidak Cukup','');
          console.log('==========================');
          console.log('[FLOW STOPPED] validation points');
          console.log('==========================');
          return;
        }
        finalPrice = finalPrice * 0.9;
        window.currentUser.points -= neededPoints;
      }

      const orderDataPreview = {
        customerName: window.currentUser.nickname || window.currentUser.name,
        game: window.currentGame ? window.currentGame.name : undefined,
        uid: userId,
        server: serverId,
        product: pkg ? pkg.name : undefined,
        payment: payment,
        price: finalPrice !== undefined ? Math.floor(finalPrice) : undefined,
      };

      // ==========================
      // STEP 3 Validation output
      // ==========================
      console.log('==========================');
      console.log('VALIDATION');
      console.log('==========================');
      console.log('[STEP 3] Fields:', {
        customerName: orderDataPreview.customerName,
        game: orderDataPreview.game,
        uid: orderDataPreview.uid,
        server: orderDataPreview.server,
        product: orderDataPreview.product,
        payment: orderDataPreview.payment,
        price: orderDataPreview.price,
      });

      // Validate required fields
      const missing = [];
      if(!orderDataPreview.customerName) missing.push('customerName');
      if(!orderDataPreview.game) missing.push('game');
      if(!orderDataPreview.uid) missing.push('uid');
      if(!orderDataPreview.server) missing.push('server');
      if(!orderDataPreview.product) missing.push('product');
      if(!orderDataPreview.payment) missing.push('payment');
      if(orderDataPreview.price === undefined || orderDataPreview.price === null || Number.isNaN(orderDataPreview.price)) missing.push('price');

      if(missing.length){
        console.log('==========================');
        console.log('[FLOW STOPPED] validation missing fields', missing);
        console.log('==========================');
        window.showErrorToast('Validasi','Field tidak lengkap: '+ missing.join(', '));
        return;
      }

      console.log('[STEP 3] Validation OK');

      // ==========================
      // API
      // ==========================
      console.log('==========================');
      console.log('API');
      console.log('==========================');

      console.log('[STEP 4] API.createOrder about to call');

      // Local client-side order creation (no backend required)
      const endpoint = 'local';
      const method = 'POST';
      const headers = { 'Content-Type': 'application/json' };
      const orderData = {
        customerName: orderDataPreview.customerName,
        game: orderDataPreview.game,
        uid: orderDataPreview.uid,
        server: orderDataPreview.server,
        product: orderDataPreview.product,
        price: orderDataPreview.price,
        payment: orderDataPreview.payment,
      };

      console.log('[STEP 4] Endpoint:', endpoint);
      console.log('[STEP 4] Method:', method);
      console.log('[STEP 4] Headers:', headers);
      console.log('[STEP 4] Payload:', orderData);

      const originalText = btn ? btn.textContent : '';
      if(btn){
        btn.disabled = true;
        btn.textContent = 'Mengirim...';
      }

      if(!window.API || typeof window.API.createOrder !== 'function'){
        throw new Error('window.API.createOrder is not ready. Check script load order.');
      }

      console.log('[STEP 4] calling API.createOrder() now');

      const response = await window.API.createOrder(orderData);

      console.log('[STEP 4] HTTP response received (wrapped by apiFetch)', response);
      console.log('[STEP 5] Network target should be:', endpoint);

      // Reset button
      if(btn){
        btn.disabled = false;
        btn.textContent = originalText || 'Bayar Sekarang';
      }

      // ==========================
      // SUCCESS
      // ==========================
      if(response.success && response.data && response.data.orderId){
        const orderId = response.data.orderId;

        console.log('==========================');
        console.log('SUCCESS');
        console.log('==========================');

        console.log('[STEP 6] Order ID:', orderId);

        window.showToast(
          '✅ Pesanan Berhasil Dibuat',
          `Order ID: ${orderId}`
        );

        console.log('[STEP 6] Toast shown');

        // Process transaction locally
        const earned = payment !== 'Points' ? Math.floor(finalPrice * 0.01) : 0;
        if(payment !== 'Points'){
          window.currentUser.points = (window.currentUser.points || 0) + earned;
        }
        window.saveCurrentUser();
        console.log('[STEP 6] Points updated:', window.currentUser.points);

        const tx = window.getTransactions();
        tx.unshift({
          id: orderId,
          game_name: window.currentGame.name,
          package_name: pkg.name,
          price: 'Rp ' + Math.floor(finalPrice).toLocaleString('id-ID'),
          amount: Math.floor(finalPrice),
          payment_method: payment,
          status: 'Pending',
          points_earned: earned,
          created_at: new Date().toISOString()
        });
        window.saveTransactions(tx);
        console.log('[STEP 6] Transaction saved');

        // Show payment instructions (keeps modal open with steps + WA confirm)
        if(payment === 'Points'){
          window.updateUI();
          window.closeModal();
          setTimeout(() => window.navigateTo('transactions-page'), 1200);
          return;
        }
        showPaymentView({
          orderId: orderId,
          total: Math.floor(finalPrice),
          payment: payment
        });

        window.updateUI();
        return;
      }

      // ==========================
      // ERROR (response not success)
      // ==========================
      console.log('==========================');
      console.log('ERROR');
      console.log('==========================');

      console.log('[FLOW STOPPED] API returned non-success', response);
      window.showErrorToast('Error', response.message || 'Pesanan gagal dibuat');
    } catch(error){
      console.log('==========================');
      console.log('ERROR');
      console.log('==========================');

      console.error('[FLOW STOPPED] Exception', {
        message: error && error.message,
        stack: error && error.stack,
        statusCode: error && error.statusCode
      });

      if(btn){
        btn.disabled = false;
        btn.textContent = 'Bayar Sekarang';
      }

      const errorMsg = (error && error.message) ? error.message : 'Terjadi kesalahan';
      window.showErrorToast('Error', errorMsg);
    } finally {
      window.__topupInFlight = false;
    }
  };

  /* Payment instructions view — shown after order is created */
  function showPaymentView(info){
    const view = document.getElementById('payment-success-view');
    const form = document.getElementById('topup-form');
    if(!view) return;

    const cfg = (window.GHOTHYS_NOTIFY_CONFIG) ? window.GHOTHYS_NOTIFY_CONFIG : {};
    const payInfo = (cfg.payments && cfg.payments[info.payment]) ? cfg.payments[info.payment] : null;
    const account = payInfo ? payInfo.number : '082137499434';
    const name = payInfo ? payInfo.atasNama : cfg.storeName || 'Ghothys Store';

    const setText = (id, text)=>{ const el=document.getElementById(id); if(el) el.textContent = text; };
    setText('pay-order-id', info.orderId);
    setText('pay-total', 'Rp ' + Number(info.total || 0).toLocaleString('id-ID'));
    setText('pay-method', info.payment);
    setText('pay-account', account);
    setText('pay-account-owner', 'a.n. ' + name);

    // WhatsApp confirm link (order id + total prefilled)
    const waBtn = document.getElementById('pay-wa-btn');
    if(waBtn){
      const msg = encodeURIComponent(
        'Halo, saya sudah melakukan pembayaran.\n\n' +
        'Order ID: ' + info.orderId + '\n' +
        'Metode: ' + info.payment + '\n' +
        'Total: Rp ' + Number(info.total || 0).toLocaleString('id-ID') + '\n\n' +
        'Berikut bukti transfer saya:'
      );
      const wa = cfg.waNumber || '6282137499434';
      waBtn.href = 'https://wa.me/' + wa + '?text=' + msg;
    }

    const copyBtn = document.getElementById('pay-copy-btn');
    if(copyBtn){
      copyBtn.onclick = function(){
        try {
          navigator.clipboard.writeText(account);
          window.showToast && window.showToast('✅ Tersalin', 'Nomor disalin: ' + account);
        } catch(e){
          prompt('Salin nomor berikut:', account);
        }
      };
    }

    const closeBtn = document.getElementById('pay-close-btn');
    if(closeBtn){
      closeBtn.onclick = function(){
        window.closeModal();
        window.navigateTo && window.navigateTo('transactions-page');
      };
    }

    if(form) form.style.display = 'none';
    view.style.display = 'block';
  }

  window.showPaymentView = showPaymentView;
})();
