/* ============================================================
   EXPORT RIWAYAT (CSV / PDF)
   ------------------------------------------------------------
   Mengambil data dari ghothys_transactions (localStorage per user)
   dan mengekspor ke CSV atau PDF.
   ============================================================ */

(function () {
  'use strict';

  const STORAGE_KEY = 'ghothys_transactions';

  function getTransactions() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    } catch (e) {
      return [];
    }
  }

  function formatDate(iso) {
    if (!iso) return '-';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatRupiah(n) {
    return 'Rp ' + Number(n || 0).toLocaleString('id-ID');
  }

  function escapeCsv(v) {
    const s = String(v == null ? '' : v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  function buildCsv(transactions) {
    const headers = [
      'Tanggal',
      'Order ID',
      'Game',
      'Paket',
      'Harga',
      'Jumlah',
      'Metode Bayar',
      'Status',
      'Poin Diperoleh',
      'Kode Promo',
      'Potongan Promo'
    ];

    const rows = transactions.map(t => [
      formatDate(t.created_at),
      t.id,
      t.game_name || '',
      t.package_name || '',
      formatRupiah(t.amount),
      t.amount || 0,
      t.payment_method || '',
      t.status || 'Pending',
      t.points_earned || 0,
      t.promo_code || '',
      t.promo_potong || 0
    ].map(escapeCsv).join(','));

    return [headers.join(','), ...rows].join('\n');
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportCsv() {
    const tx = getTransactions();
    if (!tx.length) {
      window.showErrorToast?.('Ekspor Gagal', 'Tidak ada data transaksi untuk diekspor');
      return;
    }
    const csv = buildCsv(tx);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const filename = 'riwayat-transaksi-' + new Date().toISOString().slice(0, 10) + '.csv';
    downloadBlob(blob, filename);
    window.showToast?.('✅ Ekspor CSV', tx.length + ' transaksi diekspor');
  }

  // PDF export menggunakan jsPDF (via CDN) - load dinamis
  function ensureJsPDF(callback) {
    if (window.jspdf && window.jspdf.jsPDF) {
      callback();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.onload = callback;
    script.onerror = () => {
      window.showErrorToast?.('Ekspor PDF Gagal', 'Gagal memuat library jsPDF');
    };
    document.head.appendChild(script);
  }

  function exportPdf() {
    const tx = getTransactions();
    if (!tx.length) {
      window.showErrorToast?.('Ekspor Gagal', 'Tidak ada data transaksi untuk diekspor');
      return;
    }
    ensureJsPDF(() => {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 40;
      let y = 40;

      // Header
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Riwayat Transaksi Ghothys Store', pageWidth / 2, y, { align: 'center' });
      y += 20;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Dicetak pada: ' + new Date().toLocaleString('id-ID'), pageWidth / 2, y, { align: 'center' });
      y += 24;

      // Table
      const headers = ['Tanggal', 'Order ID', 'Game', 'Paket', 'Harga', 'Status'];
      const colWidths = [80, 90, 70, 80, 70, 60];
      let x = margin;

      // Header row
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setFillColor(168, 85, 247);
      doc.setTextColor(255, 255, 255);
      headers.forEach((h, i) => {
        doc.rect(x, y, colWidths[i], 20, 'F');
        doc.text(h, x + 4, y + 13);
        x += colWidths[i];
      });
      y += 20;
      doc.setTextColor(0, 0, 0);

      // Data rows
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      tx.forEach((t, idx) => {
        if (y > 750) {
          doc.addPage();
          y = 40;
        }
        const row = [
          formatDate(t.created_at),
          t.id,
          (t.game_name || '').slice(0, 20),
          (t.package_name || '').slice(0, 25),
          formatRupiah(t.amount),
          t.status || 'Pending'
        ];
        x = margin;
        const fill = idx % 2 === 0 ? '#f8fafc' : '#ffffff';
        doc.setFillColor(fill);
        doc.rect(x, y, colWidths.reduce((a, b) => a + b, 0), 18, 'F');
        row.forEach((cell, i) => {
          doc.text(String(cell), x + 4, y + 12);
          x += colWidths[i];
        });
        y += 18;
      });

      const filename = 'riwayat-transaksi-' + new Date().toISOString().slice(0, 10) + '.pdf';
      doc.save(filename);
      window.showToast?.('✅ Ekspor PDF', tx.length + ' transaksi diekspor');
    });
  }

  // Wire up buttons
  function wireButtons() {
    const csvBtn = document.getElementById('btn-export-csv');
    const pdfBtn = document.getElementById('btn-export-pdf');
    const csvBtn2 = document.getElementById('btn-profile-export-csv');
    const pdfBtn2 = document.getElementById('btn-profile-export-pdf');

    if (csvBtn) csvBtn.addEventListener('click', exportCsv);
    if (pdfBtn) pdfBtn.addEventListener('click', exportPdf);
    if (csvBtn2) csvBtn2.addEventListener('click', exportCsv);
    if (pdfBtn2) pdfBtn2.addEventListener('click', exportPdf);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireButtons);
  } else {
    wireButtons();
  }

  // Expose for manual call
  window.ExportRiwayat = { exportCsv, exportPdf };
})();