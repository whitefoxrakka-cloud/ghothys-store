(function () {
  function moneyIdr(n) {
    const x = Number(n || 0);
    return 'Rp ' + x.toLocaleString('id-ID');
  }

  function max(arr) {
    return (arr || []).reduce((m, v) => Math.max(m, Number(v || 0)), 0);
  }

  let currentChart = null;
  let allOrders = [];
  let currentChartType = 'daily';

  async function fetchDashboard() {
    return window.AdminAPI.adminFetch('/admin/dashboard', { method: 'GET' });
  }

  async function fetchAllOrders() {
    return window.AdminAPI.adminFetch('/admin/orders?limit=500', { method: 'GET' });
  }

  async function sendTestEmail() {
    const btn = document.getElementById('btn-test-email');
    if (!btn) return;
    try {
      btn.disabled = true;
      btn.textContent = 'Mengirim...';
      const cfg = (window.GHOTHYS_NOTIFY_CONFIG) ? window.GHOTHYS_NOTIFY_CONFIG : {};
      if (!cfg.relayUrl || !cfg.adminEmail) {
        throw new Error('Relay URL atau adminEmail tidak dikonfigurasi');
      }
      const result = await window.AdminAPI.adminFetch('/admin/send-email', {
        method: 'POST',
        body: JSON.stringify({
          to: cfg.adminEmail,
          subject: '🧪 Test Email - Ghothys Store Dashboard',
          html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#1f2937;max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.1);">
    <div style="background:linear-gradient(135deg,#a855f7,#7c3aed);color:white;padding:24px;text-align:center;">
      <h1 style="margin:0;font-size:24px;font-weight:800;">🧪 Test Email Ghothys Store</h1>
    </div>
    <div style="padding:24px;">
      <p>Halo,</p>
      <p>Ini adalah email test dari <strong>Ghothys Store Dashboard</strong>.</p>
      <p>Jika Anda menerima email ini, berarti integrasi <strong>SendGrid via Cloudflare Worker</strong> sudah berfungsi dengan benar.</p>
      <div style="background:#f8fafc;padding:16px;border-radius:8px;margin:16px 0;font-size:13px;color:#6b7280;">
        Waktu: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB<br>
        Environment: ${window.location.hostname}
      </div>
      <p>Salam,<br><strong>Ghothys Store System</strong></p>
    </div>
    <div style="background:#f8fafc;padding:16px;text-align:center;font-size:12px;color:#94a3b8;">
      Ghothys Store • Dashboard Admin
    </div>
  </div>
</body>
</html>`,
          text: 'Test Email Ghothys Store\n\nIni adalah email test dari Ghothys Store Dashboard.\nJika Anda menerima email ini, integrasi SendGrid via Cloudflare Worker sudah berfungsi.\n\nWaktu: ' + new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) + ' WIB'
        })
      });
      if (result.success) {
        window.showToast('✅ Test Email', 'Email test terkirim ke ' + cfg.adminEmail);
      } else {
        throw new Error(result.message || 'Gagal kirim email');
      }
    } catch (err) {
      window.showErrorToast('Gagal Kirim Test Email', err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Kirim Test Email';
    }
  }

  function formatDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function dayKeyOf(iso, offsetMin) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    d.setMinutes(d.getMinutes() + offsetMin);
    return d.toISOString().slice(0, 10);
  }

  function getWIBOffsetMin() {
    return 7 * 60;
  }

  function renderChart(chartData) {
    const ctx = document.getElementById('chart-orders');
    if (!ctx || !chartData) return;

    const labels = chartData.days || [];
    const orders = chartData.orders || [];
    const m = max(orders) || 1;

    if (currentChart) {
      currentChart.destroy();
    }

    const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(168, 85, 247, 0.4)');
    gradient.addColorStop(1, 'rgba(168, 85, 247, 0.02)');

    currentChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Jumlah Order',
          data: orders,
          backgroundColor: gradient,
          borderColor: '#a855f7',
          borderWidth: 1,
          borderRadius: 6,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1e293b',
            titleColor: '#f1f5f9',
            bodyColor: '#f1f5f9',
            padding: 12,
            cornerRadius: 8,
            callbacks: {
              label: function (context) {
                return 'Order: ' + context.parsed.y;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(148, 163, 184, 0.15)',
              drawBorder: false
            },
            ticks: {
              color: '#94a3b8',
              font: { size: 11 },
              stepSize: 1
            }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#94a3b8', font: { size: 11 } }
          }
        },
        animation: {
          duration: 600,
          easing: 'easeOutQuart'
        }
      }
    });
  }

  function renderMonthlyChart(orders) {
    const ctx = document.getElementById('chart-orders');
    if (!ctx) return;

    const now = new Date();
    const labels = [];
    const monthKeys = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toISOString().slice(0, 7);
      monthKeys.push(key);
      labels.push(d.toLocaleString('id-ID', { month: 'short', year: '2-digit' }));
    }

    const perMonth = monthKeys.map(() => 0);
    for (const o of orders) {
      if (!o.created_at) continue;
      const key = o.created_at.slice(0, 7);
      const idx = monthKeys.indexOf(key);
      if (idx > -1) perMonth[idx]++;
    }

    const m = max(perMonth) || 1;

    if (currentChart) {
      currentChart.destroy();
    }

    const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(168, 85, 247, 0.4)');
    gradient.addColorStop(1, 'rgba(168, 85, 247, 0.02)');

    currentChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Jumlah Order',
          data: perMonth,
          fill: true,
          backgroundColor: gradient,
          borderColor: '#a855f7',
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 4,
          pointBackgroundColor: '#a855f7',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointHoverRadius: 6,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1e293b',
            titleColor: '#f1f5f9',
            bodyColor: '#f1f5f9',
            padding: 12,
            cornerRadius: 8,
            callbacks: {
              label: function (context) {
                return 'Order: ' + context.parsed.y;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(148, 163, 184, 0.15)',
              drawBorder: false
            },
            ticks: {
              color: '#94a3b8',
              font: { size: 11 },
              stepSize: 1
            }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#94a3b8', font: { size: 11 } }
          }
        },
        interaction: {
          intersect: false,
          mode: 'index'
        },
        animation: {
          duration: 600,
          easing: 'easeOutQuart'
        }
      }
    });
  }

  function renderGamePerformanceTable(orders) {
    const tbody = document.querySelector('#game-performance-table tbody');
    if (!tbody) return;

    const gameStats = {};
    for (const o of orders) {
      const game = o.game || 'Tidak Diketahui';
      if (!gameStats[game]) {
        gameStats[game] = { orders: 0, revenue: 0, completed: 0 };
      }
      gameStats[game].orders++;
      gameStats[game].revenue += Number(o.price || 0);
      const st = (o.status || '').toLowerCase();
      if (st === 'success' || st === 'selesai') gameStats[game].completed++;
    }

    const rows = Object.entries(gameStats)
      .map(([game, s]) => ({
        game,
        orders: s.orders,
        revenue: s.revenue,
        avg: s.orders > 0 ? Math.round(s.revenue / s.orders) : 0,
        completion: s.orders > 0 ? Math.round((s.completed / s.orders) * 100) : 0
      }))
      .sort((a, b) => b.revenue - a.revenue);

    tbody.innerHTML = rows.map(r => {
      let badgeClass = 'low';
      if (r.completion >= 70) badgeClass = 'high';
      else if (r.completion >= 40) badgeClass = 'medium';
      return `
        <tr>
          <td>${r.game}</td>
          <td>${r.orders}</td>
          <td>${moneyIdr(r.revenue)}</td>
          <td>${moneyIdr(r.avg)}</td>
          <td><span class="completion-badge ${badgeClass}">${r.completion}%</span></td>
        </tr>
      `;
    }).join('');
  }

  function renderStats(data, orders) {
    if (!data || !data.data) return;
    const d = data.data;

    const totalOrdersToday = document.getElementById('stat-total-orders');
    const totalRevenueToday = document.getElementById('stat-total-revenue');
    const totalAllOrders = document.getElementById('stat-total-all-orders');
    const totalAllRevenue = document.getElementById('stat-total-all-revenue');
    const avgOrder = document.getElementById('stat-avg-order');
    const completionRate = document.getElementById('stat-completion-rate');
    const statusSummary = document.getElementById('status-summary');
    const pills = document.getElementById('status-pills');

    if (totalOrdersToday) totalOrdersToday.textContent = String(d.totals?.totalOrdersToday ?? '0');
    if (totalRevenueToday) totalRevenueToday.textContent = moneyIdr(d.totals?.totalRevenueToday ?? 0);

    const allOrdersCount = orders.length;
    const allRevenue = orders.reduce((sum, o) => sum + Number(o.price || 0), 0);
    const completedCount = orders.filter(o => {
      const st = (o.status || '').toLowerCase();
      return st === 'success' || st === 'selesai';
    }).length;
    const completionPct = allOrdersCount > 0 ? Math.round((completedCount / allOrdersCount) * 100) : 0;

    if (totalAllOrders) totalAllOrders.textContent = String(allOrdersCount);
    if (totalAllRevenue) totalAllRevenue.textContent = moneyIdr(allRevenue);
    if (avgOrder) avgOrder.textContent = moneyIdr(allOrdersCount > 0 ? Math.round(allRevenue / allOrdersCount) : 0);
    if (completionRate) completionRate.textContent = completionPct + '%';

    const sc = d.statusCounts || {};
    const sumText = `Pending ${sc.Pending || 0}  •  Diproses ${sc.Diproses || 0}  •  Success ${sc.Success || 0}  •  Cancel ${sc.Cancel || 0}`;
    if (statusSummary) statusSummary.textContent = sumText;

    if (pills) {
      pills.innerHTML = '';
      const items = [
        ['Pending', sc.Pending || 0],
        ['Diproses', sc.Diproses || 0],
        ['Success', sc.Success || 0],
        ['Cancel', sc.Cancel || 0],
      ];
      for (const [name, cnt] of items) {
        const p = document.createElement('div');
        p.className = 'pill';
        p.innerHTML = `<span>${name}</span>${cnt}`;
        pills.appendChild(p);
      }
    }
  }

  function populateGameFilter(orders) {
    const select = document.getElementById('filter-game');
    if (!select) return;
    const games = [...new Set(orders.map(o => o.game).filter(Boolean))].sort();
    games.forEach(g => {
      const opt = document.createElement('option');
      opt.value = g;
      opt.textContent = g;
      select.appendChild(opt);
    });
  }

  function applyFilters() {
    const game = document.getElementById('filter-game').value;
    const status = document.getElementById('filter-status').value;
    const dateFrom = document.getElementById('filter-date-from').value;
    const dateTo = document.getElementById('filter-date-to').value;

    let filtered = allOrders;

    if (game) {
      filtered = filtered.filter(o => o.game === game);
    }
    if (status) {
      filtered = filtered.filter(o => o.status === status);
    }
    if (dateFrom) {
      filtered = filtered.filter(o => o.created_at && o.created_at.slice(0, 10) >= dateFrom);
    }
    if (dateTo) {
      filtered = filtered.filter(o => o.created_at && o.created_at.slice(0, 10) <= dateTo);
    }

    renderGamePerformanceTable(filtered);
    renderStats({ data: { totals: {}, statusCounts: {} } }, filtered);

    if (currentChartType === 'daily') {
      renderChart(buildDailyChartData(filtered));
    } else {
      renderMonthlyChart(filtered);
    }
  }

  function buildDailyChartData(orders) {
    const labels = [];
    const dayKeys = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const key = formatDate(d);
      dayKeys.push(key);
      labels.push(d.toLocaleString('id-ID', { weekday: 'short', day: '2-digit', month: 'short' }));
    }

    const perDay = dayKeys.map(() => 0);
    const offset = getWIBOffsetMin();
    for (const o of orders) {
      if (!o.created_at) continue;
      const key = dayKeyOf(o.created_at, offset);
      const idx = dayKeys.indexOf(key);
      if (idx > -1) perDay[idx]++;
    }

    return { days: labels, orders: perDay };
  }

  function exportCSV() {
    const game = document.getElementById('filter-game').value;
    const status = document.getElementById('filter-status').value;
    const dateFrom = document.getElementById('filter-date-from').value;
    const dateTo = document.getElementById('filter-date-to').value;

    let filtered = allOrders;
    if (game) filtered = filtered.filter(o => o.game === game);
    if (status) filtered = filtered.filter(o => o.status === status);
    if (dateFrom) filtered = filtered.filter(o => o.created_at && o.created_at.slice(0, 10) >= dateFrom);
    if (dateTo) filtered = filtered.filter(o => o.created_at && o.created_at.slice(0, 10) <= dateTo);

    if (filtered.length === 0) {
      window.showErrorToast('Ekspor Gagal', 'Tidak ada data untuk diekspor');
      return;
    }

    const headers = ['Order ID', 'Tanggal', 'Game', 'Item', 'Harga', 'Metode Bayar', 'Status', 'User ID', 'Server', 'Nama Pembeli'];
    const rows = filtered.map(o => [
      o.order_id || '',
      o.created_at ? formatDate(new Date(o.created_at)) : '',
      o.game || '',
      o.product || '',
      Number(o.price || 0),
      o.payment || '',
      o.status || '',
      o.uid || '',
      o.server || '',
      o.customer_name || ''
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ghothys-orders-${formatDate(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    window.showToast('✅ Ekspor Berhasil', `${filtered.length} order diekspor ke CSV`);
  }

  function resetFilters() {
    document.getElementById('filter-game').value = '';
    document.getElementById('filter-status').value = '';
    document.getElementById('filter-date-from').value = '';
    document.getElementById('filter-date-to').value = '';
    applyFilters();
  }

  function ensureToasts() {
    if (typeof window.showErrorToast !== 'function') {
      window.showErrorToast = (t, m) => alert(`${t}\n\n${m || ''}`);
    }
    if (typeof window.showToast !== 'function') {
      window.showToast = (t, m) => alert(`${t}\n\n${m || ''}`);
    }
  }

  function initChartTabs() {
    document.querySelectorAll('.adm-chart-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.adm-chart-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentChartType = btn.dataset.chart;
        if (currentChartType === 'daily') {
          renderChart(buildDailyChartData(allOrders));
        } else {
          renderMonthlyChart(allOrders);
        }
      });
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    ensureToasts();

    const refreshBtn = document.getElementById('refresh-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const applyFilterBtn = document.getElementById('btn-apply-filter');
    const resetFilterBtn = document.getElementById('btn-reset-filter');
    const exportCsvBtn = document.getElementById('btn-export-csv');

    async function loadData() {
      try {
        const [dashRes, ordersRes] = await Promise.all([
          fetchDashboard(),
          fetchAllOrders()
        ]);
        allOrders = (ordersRes && ordersRes.data && ordersRes.data.data) || [];
        renderStats(dashRes, allOrders);
        renderGamePerformanceTable(allOrders);
        populateGameFilter(allOrders);
        renderChart(buildDailyChartData(allOrders));
        initChartTabs();
      } catch (err) {
        const status = err && err.status ? err.status : null;
        if (status === 401 || status === 403) {
          window.AdminAPI.clearToken();
          window.location.href = './login.html';
          return;
        }
        window.showErrorToast('Gagal memuat dashboard', err.message || 'Terjadi kesalahan');
      }
    }

    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        try {
          refreshBtn.disabled = true;
          await loadData();
          window.showToast('✅ Dashboard', 'Data diperbarui');
        } catch (err) {
          window.showErrorToast('Gagal refresh', err.message || 'Terjadi kesalahan');
        } finally {
          refreshBtn.disabled = false;
        }
      });
    }

    if (applyFilterBtn) applyFilterBtn.addEventListener('click', applyFilters);
    if (resetFilterBtn) resetFilterBtn.addEventListener('click', resetFilters);
    if (exportCsvBtn) exportCsvBtn.addEventListener('click', exportCSV);

    const testEmailBtn = document.getElementById('btn-test-email');
    if (testEmailBtn) testEmailBtn.addEventListener('click', sendTestEmail);

    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        try {
          await window.AdminAPI.adminFetch('/admin/logout', { method: 'POST' });
        } catch (e) { }
        finally {
          window.AdminAPI.clearToken();
          window.location.href = './login.html';
        }
      });
    }

    await loadData();
  });
})();
