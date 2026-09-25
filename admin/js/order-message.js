/* Generator template pesan WhatsApp untuk proses order manual (khusus owner) */
(function(){
  var STATUSES = [
    ['Pending', 'menunggu pembayaran dikonfirmasi'],
    ['Diproses', 'sedang diproses oleh tim kami'],
    ['Success', 'selesai dan sudah dikirim ke akun kamu'],
    ['Cancel', 'dibatalkan, silakan hubungi CS kalau ada pertanyaan']
  ];

  function getConfig(){
    return (window.GHOTHYS_NOTIFY_CONFIG) || {};
  }

  function moneyIdr(n){
    return 'Rp ' + Number(n || 0).toLocaleString('id-ID');
  }

  function toRupiahDigits(raw){
    return String(raw || '').replace(/[^\d]/g, '');
  }

  function normalizeWa(raw){
    var d = toRupiahDigits(raw);
    if(!d) return '';
    if(d.charAt(0) === '0') return '62' + d.replace(/^0+/, '');
    if(d.charAt(0) === '8') return '62' + d;
    return d;
  }

  function pad4(v){
    v = String(v || '');
    while(v.length < 4) v = '0' + v;
    return v.slice(-4);
  }

  function pad2(v){
    v = String(v || '');
    while(v.length < 2) v = '0' + v;
    return v.slice(-2);
  }

  function formatTodayPrefix(){
    var now = new Date();
    return 'INV-' + String(now.getFullYear()).slice(-2) + pad2(now.getMonth() + 1) + pad2(now.getDate()) + '-';
  }

  function resolveOrderId(raw){
    var s = String(raw || '').trim().toUpperCase();
    if(!s) return '';
    if(s.indexOf('INV-') === 0) return s;
    var digits = s.replace(/[^0-9]/g, '');
    if(!digits) return '';
    return formatTodayPrefix() + pad4(digits);
  }

  function formatPrice(raw){
    var s = String(raw || '').trim();
    if(!s) return '-';
    var digits = s.replace(/[^\d]/g, '');
    if(!digits) return s;
    if(/^rp/i.test(s)) return s;
    return moneyIdr(digits);
  }

  function buildMessage(data){
    var cfg = getConfig();
    var store = cfg.storeName || 'Ghothys Store';
    var wa = cfg.waNumber || '6282137499434';
    var status = data.status || 'Pending';
    var statusNote = STATUSES.filter(function(s){ return s[0] === status; })[0];
    var note = statusNote ? statusNote[1] : 'sedang berjalan';

    var lines = [
      'Halo ' + (data.customerName || 'Pembeli') + ',',
      '',
      'Ada kabar terbaru untuk pesanan kamu di *' + store + '*:',
      '',
      'Order ID : ' + (data.orderId || '-'),
      'Game     : ' + (data.game || '-'),
      'Item     : ' + (data.product || '-'),
      'User ID  : ' + (data.uid || '-') + (data.server ? ' (Server ' + data.server + ')' : ''),
      'Total    : ' + (data.price || '-'),
      'Bayar    : ' + (data.payment || '-'),
      'Status   : *' + status + '* (' + note + ')',
      '',
      'Cek status pesanan kapan saja di:',
      'https://whitefoxrakka-cloud.github.io/ghothys-store/#order-status-section',
      '',
      'Balas pesan ini kalau ada yang kurang jelas. Terima kasih sudah belanja di ' + store + '!',
      '',
      '---',
      'Detail internal (jangan diteruskan ke pembeli):',
      'WA pembeli: ' + (data.customerWa ? '+' + data.customerWa : 'belum diisi')
    ];
    return lines.join('\n');
  }

  function currentFormData(){
    var val = function(id){ var el = document.getElementById(id); return el ? el.value : ''; };
    return {
      orderId: resolveOrderId(val('gm-order-id')),
      customerName: val('gm-customer-name').trim(),
      customerWa: normalizeWa(val('gm-customer-wa')),
      game: val('gm-game').trim(),
      product: val('gm-product').trim(),
      uid: val('gm-uid').trim(),
      server: val('gm-server').trim(),
      price: formatPrice(val('gm-price')),
      payment: val('gm-payment').trim(),
      status: val('gm-status') || 'Pending'
    };
  }

  function refreshPreview(){
    var box = document.getElementById('gm-message');
    if(!box) return;
    var data = currentFormData();
    box.value = data.orderId || data.game || data.customerName
      ? buildMessage(data)
      : 'Isi data pesanan di atas, lalu tekan "Buat Template".';
  }

  function copyText(text){
    var ok = function(){
      alert('Tersalin. Tempel di chat WhatsApp pembeli.');
    };
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).then(ok).catch(function(){ fallback(text); });
    } else {
      fallback(text);
    }
  }

  function fallback(text){
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly','');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    var okCopy = false;
    try { okCopy = document.execCommand('copy'); } catch(e) { okCopy = false; }
    document.body.removeChild(ta);
    if(okCopy){
      alert('Tersalin. Tempel di chat WhatsApp pembeli.');
    } else {
      window.prompt('Salin manual teks berikut:', text);
    }
  }

  function openWhatsApp(data, text){
    var cfg = getConfig();
    var wa = cfg.waNumber || '6282137499434';
    var target = data.customerWa || wa;
    window.open('https://wa.me/' + target + '?text=' + encodeURIComponent(text), '_blank', 'noopener');
  }

  document.addEventListener('DOMContentLoaded', function(){
    var box = document.getElementById('gm-message');
    if(!box) return;

    var statusSelect = document.getElementById('gm-status');
    if(statusSelect){
      statusSelect.innerHTML = STATUSES.map(function(s){
        return '<option value="' + s[0] + '">' + s[0] + '</option>';
      }).join('');
    }

    var buildBtn = document.getElementById('gm-build');
    if(buildBtn){
      buildBtn.addEventListener('click', function(){
        var data = currentFormData();
        if(!data.orderId && !data.game){
          alert('Isi minimal Order ID atau Game dulu.');
          return;
        }
        box.value = buildMessage(data);
        refreshPreview();
      });
    }

    var copyBtn = document.getElementById('gm-copy');
    if(copyBtn){
      copyBtn.addEventListener('click', function(){
        if(!box.value.trim()){
          alert('Buat template dulu lewat tombol "Buat Template".');
          return;
        }
        copyText(box.value);
      });
    }

    var waBtn = document.getElementById('gm-wa');
    if(waBtn){
      waBtn.addEventListener('click', function(){
        if(!box.value.trim()){
          alert('Buat template dulu lewat tombol "Buat Template".');
          return;
        }
        openWhatsApp(currentFormData(), box.value);
      });
    }

    refreshPreview();
  });
})();
