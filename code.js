/**
 * Frontend Logic (code.js) - GitHub Deployment Version
 * Pemantauan Tambat Kapal - KSOP Kelas II Pekanbaru
 * * Integrasi Fitur Manajemen Billing Susulan & Dashboard Tagihan Piutang Kapal [V5-Premium]
 */

// !!! GANTI URL INI DENGAN WEB APP URL HASIL DEPLOY APPS SCRIPT ANDA !!!
const API_ENDPOINT = "https://script.google.com/macros/s/AKfycbxsALtRcejJv95zu5OB_qUtTkDoquIwfiYb6D4WnOBVN80x5oGWFfqWuwIvP7U7CATw/exec";

let globalAllRecords = [];
let globalFilteredRecords = [];
let globalTagihanRecords = []; // Wadah penampung data piutang khusus belum bayar
let currentPage = 1;
const itemsPerPage = 15;
let pendingConfirmPromise = null;

// Inisialisasi Aplikasi saat DOM Siap
document.addEventListener("DOMContentLoaded", function () {
  generateForms(1);
  loadDataGrid();
});

// Sistem Navigasi Tab Menu (Input vs Monitoring vs Tagihan)
function switchMenu(panelId, element) {
  document
    .querySelectorAll(".tab-panel")
    .forEach((p) => p.classList.remove("active-panel"));
  document
    .querySelectorAll(".nav-item")
    .forEach((i) => i.classList.remove("active"));
  document.getElementById(panelId).classList.add("active-panel");
  element.classList.add("active");
}

// Generate Dinamis Multi Form Berdasarkan Dropdown Jumlah Form (UI/UX Kontras Tinggi)
function generateForms(count) {
  const wrapper = document.getElementById("dynamic-form-wrapper");
  wrapper.innerHTML = "";

  for (let i = 1; i <= count; i++) {
    const card = document.createElement("div");

    // UI/UX Trick: Memberikan corak warna latar belakang (Zebra Striping Premium) antara form ganjil & genap
    const isEven = i % 2 === 0;
    card.className = "form-card";

    if (isEven) {
      card.style.backgroundColor = "#f8fafc"; // Abu-abu terang premium
      card.style.borderLeft = "5px solid #D4AF37"; // Aksen Gold untuk form genap
    } else {
      card.style.backgroundColor = "#ffffff"; // Putih bersih
      card.style.borderLeft = "5px solid #0B1F3A"; // Aksen Navy untuk form ganjil
    }

    card.innerHTML = `
      <div class="form-card-title" style="display:flex; justify-content:space-between; align-items:center; background:${isEven ? "#f1f5f9" : "#0B1F3A"}; color:${isEven ? "#0B1F3A" : "#ffffff"}; padding:12px 20px; margin:-25px -25px 25px -25px; border-radius:12px 12px 0 0; border-bottom:2px solid var(--gold);">
        <span style="font-weight: 800; letter-spacing: 0.5px;"><i class="fa-solid fa-ship"></i> DATA LOG KAPAL KE - ${i}</span>
        <span class="badge" style="background:${isEven ? "var(--gold)" : "var(--white)"}; color:${isEven ? "var(--white)" : "var(--navy)"}; padding:4px 10px; border-radius:20px; font-size:12px; font-weight:bold;">Form ${i} dari ${count}</span>
      </div>

      <div class="sub-section-group" style="margin-bottom: 25px; background: rgba(0,0,0,0.02); padding: 15px; border-radius: 8px;">
        <h4 style="color: var(--navy); margin-bottom: 15px; font-size: 14px; border-bottom: 2px solid #ddd; padding-bottom: 5px;"><i class="fa-solid fa-circle-info"></i> I. KARAKTERISTIK DAN RUTE KAPAL</h4>
        <div class="form-grid-4">
          <div class="form-block">
            <label>Nama Kapal *</label>
            <input type="text" class="inp-nama" required placeholder="CONTOH: TB MAJU DAYA 93">
          </div>
          <div class="form-block">
            <label>GT (Gross Tonnage) *</label>
            <input type="number" class="inp-gt" required placeholder="Contoh: 180">
          </div>
          <div class="form-block">
            <label>Bendera *</label>
            <input type="text" class="inp-bendera" required placeholder="Contoh: INDONESIA">
          </div>
          <div class="form-block">
            <label>Keagenan *</label>
            <input type="text" class="inp-keagenan" required placeholder="Contoh: PT. PELAYARAN NASIONAL">
          </div>
        </div>
        
        <div class="form-grid-3" style="margin-top: 15px;">
          <div class="form-block">
            <label>Daerah Pelayaran *</label>
            <div class="checkbox-row" style="background:#fff; padding: 8px 12px; border: 1px solid #ccc; border-radius: 6px;">
              <div class="checkbox-item">
                <input type="radio" name="pelayaran-${i}" value="Dalam Negeri" checked id="dn-${i}">
                <label for="dn-${i}" style="cursor:pointer; font-weight:normal;">Dalam Negeri</label>
              </div>
              <div class="checkbox-item">
                <input type="radio" name="pelayaran-${i}" value="Luar Negeri" id="ln-${i}">
                <label for="ln-${i}" style="cursor:pointer; font-weight:normal;">Luar Negeri</label>
              </div>
            </div>
          </div>
          <div class="form-block">
            <label>Posisi Dermaga / Lokasi Tambat *</label>
            <input type="text" class="inp-posisi" required placeholder="Contoh: Dermaga 01">
          </div>
          <div class="form-block">
          </div>
        </div>
      </div>

      <div class="sub-section-group" style="margin-bottom: 25px; padding: 15px; border: 1px solid #e2e8f0; border-radius: 8px; background:#fff;">
        <h4 style="color: var(--navy); margin-bottom: 15px; font-size: 14px; border-bottom: 2px solid #0B1F3A; padding-bottom: 5px;"><i class="fa-solid fa-clock"></i> II. LOG PERHITUNGAN WAKTU TAMBAT (REAL-TIME)</h4>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
          
          <div style="background: rgba(46, 213, 115, 0.05); padding: 15px; border-radius: 8px; border-top: 4px solid #2ed573;">
            <h5 style="color: #2ed573; margin-bottom: 10px; font-weight: 700;"><i class="fa-solid fa-play"></i> Mulai Tambat</h5>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
              <div class="form-block">
                <label>Tanggal Mulai *</label>
                <input type="date" class="inp-tgl-mulai" required id="tgl-m-${i}" onchange="liveCalculateDuration(${i})">
              </div>
              <div class="form-block">
                <label>Jam Mulai *</label>
                <input type="time" class="inp-jam-mulai" required id="jam-m-${i}" onchange="liveCalculateDuration(${i})">
              </div>
            </div>
            <div class="checkbox-item" style="background:#fff; padding: 8px; border:1px solid #ddd; border-radius:4px;">
              <input type="checkbox" class="inp-paraf-mulai" id="pm-${i}">
              <label for="pm-${i}" style="font-size:12px; cursor:pointer;">Konfirmasi Paraf Mulai Sesuai</label>
            </div>
          </div>

          <div style="background: rgba(255, 71, 87, 0.05); padding: 15px; border-radius: 8px; border-top: 4px solid #ff4757;">
            <h5 style="color: #ff4757; margin-bottom: 10px; font-weight: 700;"><i class="fa-solid fa-stop"></i> Selesai Tambat</h5>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
              <div class="form-block">
                <label>Tanggal Selesai *</label>
                <input type="date" class="inp-tgl-selesai" required id="tgl-s-${i}" onchange="liveCalculateDuration(${i})">
              </div>
              <div class="form-block">
                <label>Jam Selesai *</label>
                <input type="time" class="inp-jam-selesai" required id="jam-s-${i}" onchange="liveCalculateDuration(${i})">
              </div>
            </div>
            <div class="checkbox-item" style="background:#fff; padding: 8px; border:1px solid #ddd; border-radius:4px;">
              <input type="checkbox" class="inp-paraf-selesai" id="ps-${i}">
              <label for="ps-${i}" style="font-size:12px; cursor:pointer;">Konfirmasi Paraf Selesai Sesuai</label>
            </div>
          </div>

        </div>

        <div style="margin-top: 15px; background: #fff3cd; border: 1px dashed var(--gold); border-radius: 6px; padding: 12px; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 10px;">
          <span style="font-size: 13px; font-weight: 700; color: #856404; min-width: 200px;"><i class="fa-solid fa-calculator"></i> Total Durasi Terhitung otomatis:</span>
          <input type="text" id="live-durasi-${i}" readonly value="0 Jam 0 Menit" style="width: auto; max-width: 100%; text-align: right; background: transparent; border: none; font-size: 16px; font-weight: 800; color: var(--navy); pointer-events: none;">
        </div>
      </div>

      <div class="sub-section-group" style="background: rgba(11, 31, 58, 0.03); padding: 15px; border-radius: 8px; border-left: 4px solid var(--navy);">
        <h4 style="color: var(--navy); margin-bottom: 15px; font-size: 14px; border-bottom: 2px solid #ddd; padding-bottom: 5px;"><i class="fa-solid fa-money-check-dollar"></i> III. ADMINISTRASI KEUANGAN & BUKTI BILLING (OPSIONAL)</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <div class="form-block">
            <label>Kode Billing Pelabuhan (Kosongkan jika belum bayar)</label>
            <input type="text" class="inp-billing" placeholder="CONTOH: BILL001">
            
            <label style="margin-top: 10px;">Upload Dokumen Bukti Billing (PDF / JPG / PNG)</label>
            <input type="file" class="inp-file" accept=".pdf,.jpg,.jpeg,.png" style="background:#fff; padding:6px;">
          </div>
          <div class="form-block">
            <label>Keterangan Tambat Tambahan</label>
            <textarea class="inp-keterangan" rows="4" placeholder="Tulis catatan penting di sini jika ada kendala cuaca, antrean dermaga, atau kondisi darurat operasional kapal..."></textarea>
          </div>
        </div>
      </div>
    `;
    wrapper.appendChild(card);
  }
}

// Live Calculation Durasi di Sisi Klien (Instant Feedback)
function liveCalculateDuration(index) {
  const d1 = document.getElementById(`tgl-m-${index}`).value;
  const t1 = document.getElementById(`jam-m-${index}`).value;
  const d2 = document.getElementById(`tgl-s-${index}`).value;
  const t2 = document.getElementById(`jam-s-${index}`).value;
  const display = document.getElementById(`live-durasi-${index}`);

  if (d1 && t1 && d2 && t2) {
    const start = new Date(`${d1}T${t1}`);
    const end = new Date(`${d2}T${t2}`);
    const diffMs = end - start;
    if (!isNaN(diffMs) && diffMs >= 0) {
      const diffMins = Math.floor(diffMs / 60000);
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      display.value = `${hours} Jam ${mins} Menit`;
      return;
    }
  }
  display.value = "0 Jam 0 Menit";
}

// Dialog Konfirmasi Custom Corporate Style
function openConfirmModal(msg) {
  document.getElementById("confirm-modal-msg").innerText = msg;
  document.getElementById("confirm-modal").classList.remove("hide");
  return new Promise((resolve) => {
    pendingConfirmPromise = resolve;
  });
}

function closeConfirmModal(accept) {
  document.getElementById("confirm-modal").classList.add("hide");
  if (pendingConfirmPromise) pendingConfirmPromise(accept);
}

// Toast Notification Engine
function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fa-solid ${type === "success" ? "fa-circle-check" : "fa-circle-xmark"}"></i> ${message}`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 4000);
}

// Submit Data Menggunakan Fetch API (Cross-Origin Resource Sharing)
async function submitFormData(e) {
  e.preventDefault();

  const konfirmasi = await openConfirmModal(
    "Apakah Anda yakin ingin melakukan enkripsi berkas dan menyimpan seluruh data tambat ke server?",
  );
  if (!konfirmasi) return;

  const loader = document.getElementById("global-loader");
  loader.classList.remove("hide");

  const wrapper = document.getElementById("dynamic-form-wrapper");
  const cards = wrapper.getElementsByClassName("form-card");
  const payloadArray = [];

  // Looping membaca seluruh form terbuat
  for (let i = 0; i < cards.length; i++) {
    const idx = i + 1;
    const card = cards[i];

    const fileInput = card.querySelector(".inp-file").files[0];
    let fileObj = { fileData: null, fileName: null, fileType: null };

    if (fileInput) {
      fileObj = await convertFileToBase64(fileInput);
    }

    payloadArray.push({
      namaKapal: card.querySelector(".inp-nama").value.toUpperCase(),
      gt: card.querySelector(".inp-gt").value,
      bendera: card.querySelector(".inp-bendera").value.toUpperCase(),
      keagenan: card.querySelector(".inp-keagenan").value.toUpperCase(),
      daerahPelayaran: card.querySelector(`input[name="pelayaran-${idx}"]:checked`).value,
      posisi: card.querySelector(".inp-posisi").value.toUpperCase(),
      kodeBilling: card.querySelector(".inp-billing").value.toUpperCase(),
      tanggalMulai: card.querySelector(".inp-tgl-mulai").value,
      jamMulai: card.querySelector(".inp-jam-mulai").value,
      parafMulai: card.querySelector(".inp-paraf-mulai").checked,
      tanggalSelesai: card.querySelector(".inp-tgl-selesai").value,
      jamSelesai: card.querySelector(".inp-jam-selesai").value,
      parafSelesai: card.querySelector(".inp-paraf-selesai").checked,
      keterangan: card.querySelector(".inp-keterangan").value,
      fileData: fileObj.fileData,
      fileName: fileObj.fileName,
      fileType: fileObj.fileType,
    });
  }

  fetch(API_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payloadArray),
  })
    .then(res => res.json())
    .then((res) => {
      loader.classList.add("hide");
      if (res.success) {
        showToast("Data Tambat Kapal Berhasil Disimpan ke Server & Google Sheets!", "success");
        document.getElementById("master-tambat-form").reset();
        generateForms(1); // Reset kembali ke 1 form input
        loadDataGrid();   // Otomatis refresh data grid monitoring
      } else {
        showToast("Gagal mengarsip data: " + res.message, "error");
      }
    })
    .catch((err) => {
      loader.classList.add("hide");
      showToast("Gagal menyambung ke server: " + err, "error");
    });
}

// Konversi File Terunggah Menjadi Base64 String
function convertFileToBase64(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = function (e) {
      resolve({
        fileData: e.target.result,
        fileName: file.name,
        fileType: file.type,
      });
    };
    reader.readAsDataURL(file);
  });
}

// Sinkronisasi dan Penarikan Data dari Server REST API (GET)
function loadDataGrid() {
  const tbody = document.getElementById("table-body");
  tbody.innerHTML = "";

  // Suntik Skeleton Loading
  for (let i = 0; i < 5; i++) {
    tbody.innerHTML += `<tr class="skeleton-row">${"<td></td>".repeat(14)}</tr>`;
  }

  fetch(API_ENDPOINT)
    .then((res) => res.json())
    .then((res) => {
      if (res.error) {
        showToast("Gagal mengambil sinkronisasi data monitoring", "error");
        return;
      }

      globalAllRecords = res.records || [];
      globalFilteredRecords = [...globalAllRecords];

      // Sinkronisasi Data Piutang Otomatis untuk Panel Menu Tagihan
      globalTagihanRecords = globalAllRecords.filter(r => {
        const stat = r["STATUS BAYAR"] ? String(r["STATUS BAYAR"]).toUpperCase().trim() : "BELUM BAYAR";
        return stat === "BELUM BAYAR";
      });

      // Update Statistik Dasbor Pertama Kali (Default)
      document.getElementById("stat-total").innerText = res.stats.total;
      document.getElementById("stat-dn").innerText = res.stats.dn;
      document.getElementById("stat-ln").innerText = res.stats.ln;
      document.getElementById("stat-jam").innerText = res.stats.totalJamBulanIni + " Jam";

      currentPage = 1;
      renderTableData();
    })
    .catch((e) => {
      showToast("Gagal tersambung ke Server API Backend: " + e, "error");
    });
}

// REVISI POIN 4: Pencarian Realtime Terintegrasi Filter Status Bayar Lunas/Belum
function triggerSearchFilter() {
  const searchQuery = document.getElementById("search-input").value.toLowerCase().trim();
  const filterBulan = document.getElementById("filter-bulan").value;
  const filterTahun = document.getElementById("filter-tahun").value;
  const filterStatus = document.getElementById("filter-status-bayar").value;

  globalFilteredRecords = globalAllRecords.filter((r) => {
    // Jalankan filter status pembayaran
    if (filterStatus && String(r["STATUS BAYAR"]).toUpperCase().trim() !== filterStatus.toUpperCase()) return false;
    if (filterBulan && String(r["BULAN"]).toUpperCase() !== filterBulan.toUpperCase()) return false;
    if (filterTahun && String(r["TAHUN"]).trim() !== filterTahun.trim()) return false;

    if (searchQuery) {
      return (
        String(r["NAMA KAPAL"]).toLowerCase().includes(searchQuery) ||
        String(r["GT"]).toLowerCase().includes(searchQuery) ||
        String(r["BENDERA"]).toLowerCase().includes(searchQuery) ||
        String(r["KEAGENAN"]).toLowerCase().includes(searchQuery) ||
        String(r["POSISI"]).toLowerCase().includes(searchQuery) ||
        String(r["KETERANGAN TAMBAT"]).toLowerCase().includes(searchQuery)
      );
    }
    return true;
  });

  // REKALKULASI STATISTIK SECARA REAKTIF MENGIKUTI FILTER
  let totalDinamis = globalFilteredRecords.length;
  let dnDinamis = globalFilteredRecords.filter(r => r["DAERAH PELAYARAN"] === "Dalam Negeri").length;
  let lnDinamis = globalFilteredRecords.filter(r => r["DAERAH PELAYARAN"] === "Luar Negeri").length;
  
  let totalJamDinamis = 0;
  globalFilteredRecords.forEach(r => {
    let match = String(r["TOTAL JAM"]).match(/(\d+)\s*Jam/);
    if (match) {
      totalJamDinamis += parseInt(match[1], 10);
    }
  });

  document.getElementById("stat-total").innerText = totalDinamis;
  document.getElementById("stat-dn").innerText = dnDinamis;
  document.getElementById("stat-ln").innerText = lnDinamis;
  document.getElementById("stat-jam").innerText = totalJamDinamis + " Jam";

  currentPage = 1;
  renderTableData();
}

// Render Array Data Menjadi Baris Tabel DOM dengan Pagination Terintegrasi
function renderTableData() {
  const tbody = document.getElementById("table-body");
  tbody.innerHTML = "";

  if (globalFilteredRecords.length === 0) {
    tbody.innerHTML = `<tr><td colspan="14" style="text-align:center; padding:30px; font-weight:600; color:#999;">Tidak ada log data tambat kapal yang sesuai kriteria.</td></tr>`;
    document.getElementById("pagination-box").innerHTML = "";
    return;
  }

  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = startIdx + itemsPerPage;
  const pageItems = globalFilteredRecords.slice(startIdx, endIdx);

  pageItems.forEach((r) => {
    const tr = document.createElement("tr");

    // REVISI POIN 3: Visualisasi Badge Kontras Tinggi Lunas vs Belum Bayar
    let billCell = "";
    const statusMurni = r["STATUS BAYAR"] ? String(r["STATUS BAYAR"]).toUpperCase().trim() : "BELUM BAYAR";

    if (statusMurni === "LUNAS" && r["LINK FILE BILLING"] && !String(r["LINK FILE BILLING"]).includes("Terarsip")) {
      billCell = `<a href="${r["LINK FILE BILLING"]}" target="_blank" class="badge-status badge-lunas"><i class="fa-solid fa-file-pdf"></i> ${r["KODE BILLING"]}</a>`;
    } else if (statusMurni === "LUNAS") {
      billCell = `<span class="badge-status badge-lunas"><i class="fa-solid fa-check"></i> ${r["KODE BILLING"] || "LUNAS"}</span>`;
    } else {
      billCell = `<span class="badge-status badge-belum-bayar"><i class="fa-solid fa-circle-exclamation"></i> Belum Bayar</span>`;
    }

    const tglMulaiBersih = String(r["TANGGAL MULAI TAMBAT"]).includes('T') ? String(r["TANGGAL MULAI TAMBAT"]).split('T')[0] : r["TANGGAL MULAI TAMBAT"];
    const tglSelesaiBersih = String(r["TANGGAL SELESAI TAMBAT"]).includes('T') ? String(r["TANGGAL SELESAI TAMBAT"]).split('T')[0] : r["TANGGAL SELESAI TAMBAT"];

    // REVISI POIN 2: Menambahkan tombol aksi pena edit khusus billing
    tr.innerHTML = `
      <td style="font-weight:700; color:var(--navy);">${r["ID"].split("-")[1] || r["ID"]}</td>
      <td style="font-weight:600; color:var(--navy);">${r["NAMA KAPAL"]}</td>
      <td>${r["GT"]}</td>
      <td>${r["BENDERA"]}</td>
      <td>${r["KEAGENAN"]}</td>
      <td><span style="padding:4px 8px; border-radius:4px; color:white; font-size:11px; background:${r["DAERAH PELAYARAN"] === "Luar Negeri" ? "#ff4757" : "#2ed573"}">${r["DAERAH PELAYARAN"]}</span></td>
      <td>${tglMulaiBersih}<br><small style="color:#777">${String(r["JAM MULAI TAMBAT"]).replace("'", "")}</small></td>
      <td style="font-weight:700; color:${r["PARAF MULAI"] === "YA" ? "#2ed573" : "#ff4757"}">${r["PARAF MULAI"]}</td>
      <td>${tglSelesaiBersih}<br><small style="color:#777">${String(r["JAM SELESAI TAMBAT"]).replace("'", "")}</small></td>
      <td style="font-weight:700; color:${r["PARAF SELESAI"] === "YA" ? "#2ed573" : "#ff4757"}">${r["PARAF SELESAI"]}</td>
      <td><strong>${r["POSISI"]}</strong></td>
      <td style="color:var(--navy); font-weight:700;">${r["TOTAL JAM"]}</td>
      <td>${billCell}</td>
      <td style="text-align:center;">
        <button class="btn-edit-pen" onclick="openEditBillingModal('${r["ID"]}')" title="Update Billing Susulan">
          <i class="fa-solid fa-pen-to-square"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  renderPaginationControls();
}

// Render Komponen Tombol Navigasi Pagination Dinamis
function renderPaginationControls() {
  const pBox = document.getElementById("pagination-box");
  pBox.innerHTML = "";

  const totalPages = Math.ceil(globalFilteredRecords.length / itemsPerPage);
  if (totalPages <= 1) return;

  const prevBtn = document.createElement("button");
  prevBtn.className = `page-btn ${currentPage === 1 ? "hide" : ""}`;
  prevBtn.innerText = "Prev";
  prevBtn.onclick = () => {
    if (currentPage > 1) {
      currentPage--;
      renderTableData();
    }
  };
  pBox.appendChild(prevBtn);

  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= currentPage - 2 && i <= currentPage + 2)
    ) {
      const pBtn = document.createElement('button');
      pBtn.className = `page-btn ${currentPage === i ? "active" : ""}`;
      pBtn.innerText = i;
      pBtn.onclick = () => {
        currentPage = i;
        renderTableData();
      };
      pBox.appendChild(pBtn);
    } else if (i === 2 || i === totalPages - 1) {
      const dots = document.createElement("span");
      dots.innerText = "...";
      dots.style.padding = "0 5px";
      pBox.appendChild(dots);
    }
  }

  const nextBtn = document.createElement("button");
  nextBtn.className = `page-btn ${currentPage === totalPages ? "hide" : ""}`;
  nextBtn.innerText = "Next";
  nextBtn.onclick = () => {
    if (currentPage < totalPages) {
      currentPage++;
      renderTableData();
    }
  };
  pBox.appendChild(nextBtn);
}

// REVISI POIN 5: Mesin Pencari dan Penyaring Khusus Menu Tagihan Piutang Kapal
function triggerTagihanSearchFilter() {
  const searchQuery = document.getElementById("tagihan-search-input").value.toLowerCase().trim();
  const filterBulan = document.getElementById("tagihan-filter-bulan").value;
  const filterTahun = document.getElementById("tagihan-filter-tahun").value;

  const baseTagihan = globalAllRecords.filter(r => {
    const stat = r["STATUS BAYAR"] ? String(r["STATUS BAYAR"]).toUpperCase().trim() : "BELUM BAYAR";
    return stat === "BELUM BAYAR";
  });

  const filteredTagihan = baseTagihan.filter((r) => {
    if (filterBulan && String(r["BULAN"]).toUpperCase() !== filterBulan.toUpperCase()) return false;
    if (filterTahun && String(r["TAHUN"]).trim() !== filterTahun.trim()) return false;

    if (searchQuery) {
      return (
        String(r["NAMA KAPAL"]).toLowerCase().includes(searchQuery) ||
        String(r["KEAGENAN"]).toLowerCase().includes(searchQuery) ||
        String(r["KODE BILLING"]).toLowerCase().includes(searchQuery)
      );
    }
    return true;
  });

  const tbody = document.getElementById("tagihan-table-body");
  tbody.innerHTML = "";

  if (filteredTagihan.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:25px; font-weight:600; color:#db4437;"><i class="fa-solid fa-circle-check"></i> Luar Biasa! Tidak ada tunggakan billings pada periode ini.</td></tr>`;
    return;
  }

  filteredTagihan.forEach((r) => {
    const tr = document.createElement("tr");
    const tglMulaiBersih = String(r["TANGGAL MULAI TAMBAT"]).includes('T') ? String(r["TANGGAL MULAI TAMBAT"]).split('T')[0] : r["TANGGAL MULAI TAMBAT"];
    const tglSelesaiBersih = String(r["TANGGAL SELESAI TAMBAT"]).includes('T') ? String(r["TANGGAL SELESAI TAMBAT"]).split('T')[0] : r["TANGGAL SELESAI TAMBAT"];

    tr.innerHTML = `
      <td style="font-weight:700; color:var(--navy);">${r["ID"].split("-")[1] || r["ID"]}</td>
      <td style="font-weight:600; color:var(--navy);">${r["NAMA KAPAL"]}</td>
      <td>${r["GT"]}</td>
      <td>${r["KEAGENAN"]}</td>
      <td>${tglMulaiBersih} <small>${String(r["JAM MULAI TAMBAT"]).replace("'", "")}</small></td>
      <td>${tglSelesaiBersih} <small>${String(r["JAM SELESAI TAMBAT"]).replace("'", "")}</small></td>
      <td style="font-weight:700; color:var(--navy);">${r["TOTAL JAM"]}</td>
      <td><strong>${r["POSISI"]}</strong></td>
      <td><span class="badge-status badge-belum-bayar">TERHUTANG</span></td>
      <td style="text-align:center;">
        <button class="btn-edit-pen" onclick="openEditBillingModal('${r["ID"]}')" title="Bayar Billing">
          <i class="fa-solid fa-money-bill-wave"></i> Bayar
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// REVISI POIN 2: Logika Buka Tutup & Kunci Form Popup Modal Edit Billing
function openEditBillingModal(id) {
  const targetRecord = globalAllRecords.find(r => String(r["ID"]).trim() === String(id).trim());
  if (!targetRecord) {
    showToast("Gagal memetakan rekam data kapal.", "error");
    return;
  }

  // Isi data identitas profil rekam terikat
  document.getElementById("edit-id-target").value = targetRecord["ID"];
  document.getElementById("lbl-edit-nama").innerText = targetRecord["NAMA KAPAL"];
  document.getElementById("lbl-edit-gt").innerText = targetRecord["GT"] + " GT";
  document.getElementById("lbl-edit-keagenan").innerText = targetRecord["KEAGENAN"];
  document.getElementById("lbl-edit-durasi").innerText = targetRecord["TOTAL JAM"];

  // Reset kondisi input menjadi terkunci bawaan
  document.getElementById("chk-konfirmasi-edit").checked = false;
  toggleBillingEditFields(false);

  // Suntik isian data jika sebelumnya pernah ada
  document.getElementById("edit-inp-billing").value = targetRecord["KODE BILLING"] || "";
  document.getElementById("edit-inp-file").value = "";

  document.getElementById("edit-billing-modal").classList.remove("hide");
}

function closeEditBillingModal() {
  document.getElementById("edit-billing-modal").classList.add("hide");
}

function toggleBillingEditFields(unlocked) {
  document.getElementById("edit-inp-billing").disabled = !unlocked;
  document.getElementById("edit-inp-file").disabled = !unlocked;
  document.getElementById("btn-submit-edit").disabled = !unlocked;
}

// REVISI POIN 2: Pengiriman Berkas Enkripsi Susulan via POST REST API (update_billing)
async function submitEditBillingData(e) {
  e.preventDefault();

  const idTarget = document.getElementById("edit-id-target").value;
  const billingInp = document.getElementById("edit-inp-billing").value.toUpperCase().trim();
  const fileInput = document.getElementById("edit-inp-file").files[0];

  if (billingInp === "") {
    showToast("Kode Billing pelabuhan wajib diisi!", "error");
    return;
  }

  const konfirmasi = await openConfirmModal("Apakah Anda yakin ingin menyimpan pembaruan berkas administrasi keuangan ini ke database pusat?");
  if (!konfirmasi) return;

  closeEditBillingModal();
  const loader = document.getElementById("global-loader");
  loader.classList.remove("hide");

  let fileObj = { fileData: null, fileName: null, fileType: null };
  if (fileInput) {
    fileObj = await convertFileToBase64(fileInput);
  }

  const payload = {
    action: "update_billing",
    id: idTarget,
    kodeBilling: billingInp,
    fileData: fileObj.fileData,
    fileName: fileObj.fileName,
    fileType: fileObj.fileType
  };

  fetch(API_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload)
  })
    .then(res => res.json())
    .then((res) => {
      loader.classList.add("hide");
      if (res.success) {
        showToast("Administrasi Billing Kapal Berhasil Diperbarui!", "success");
        loadDataGrid(); // Refresh database grid monitoring dan tagihan otomatis
        
        // Cek jika panel tagihan sedang aktif, paksa render ulang baris piutang
        if (document.getElementById("tagihan-panel").classList.contains("active-panel")) {
          setTimeout(() => { triggerTagihanSearchFilter(); }, 800);
        }
      } else {
        showToast("Gagal menyimpan pembaruan: " + res.message, "error");
      }
    })
    .catch((err) => {
      loader.classList.add("hide");
      showToast("Gagal tersambung ke server: " + err, "error");
    });
}

/**
 * CORE EXPORT ENGINE: Memproses data terfilter dan mendownload file Excel
 */
async function exportFilteredData() {
  if (globalFilteredRecords.length === 0) {
    showToast("Tidak ada data terfilter untuk diexport!", "error");
    return;
  }

  const konfirmasi = await openConfirmModal(`Apakah Anda yakin ingin mengexport ${globalFilteredRecords.length} baris data yang aktif ke file Excel?`);
  if (!konfirmasi) return;

  const loader = document.getElementById("global-loader");
  const loaderText = document.getElementById("loader-text");
  loaderText.innerText = "Membaca Template & Menyusun Dokumen Laporan...";
  loader.classList.remove("hide");

  const filterBulan = document.getElementById("filter-bulan").value;
  const filterTahun = document.getElementById("filter-tahun").value;
  const searchQuery = document.getElementById("search-input").value.trim();
  
  let fileName = "DATA TAMBAT";
  let reportMonth = filterBulan || "SEMUA BULAN";
  let reportYear = filterTahun || new Date().getFullYear().toString();

  if (filterBulan || filterTahun) {
    fileName += ` ${reportMonth} ${reportYear}`;
  } else if (searchQuery) {
    fileName += ` ${searchQuery.toUpperCase()}`;
  } else {
    fileName += " ALL PERIODE";
  }

  const payload = {
    action: "export_excel",
    fileName: fileName,
    meta: {
      bulan: reportMonth,
      tahun: reportYear
    },
    records: globalFilteredRecords
  };

  fetch(API_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify(payload)
  })
  .then(res => res.json())
  .then(res => {
    loader.classList.add("hide");
    loaderText.innerText = "Memproses Sinkronisasi Data Ke Server..."; 
    
    if (res.success && res.downloadUrl) {
      showToast("Laporan Excel Berhasil Dibuat!", "success");
      
      const uniqueAnchor = document.createElement("a");
      uniqueAnchor.href = res.downloadUrl;
      uniqueAnchor.setAttribute("download", fileName + ".xlsx");
      document.body.appendChild(uniqueAnchor);
      uniqueAnchor.click(); 
      document.body.removeChild(uniqueAnchor);
    } else {
      showToast("Gagal melakukan export: " + res.message, "error");
    }
  })
  .catch(err => {
    loader.classList.add("hide");
    loaderText.innerText = "Memproses Sinkronisasi Data Ke Server...";
    showToast("Error saat menghubungi server export: " + err, "error");
  });
}
