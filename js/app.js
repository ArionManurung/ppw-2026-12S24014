/**
 * App - Presentation Layer & Dynamic Client-Side Rendering (CSR)
 * Mengelola state antarmuka (Loading, Success, Empty, Error), perakitan DOM,
 * Universal Dynamic Modal, filter kategori, serta decoupled form submission.
 */
class App {
  constructor() {
    this.state = {
      projects: [],
      services: [],
      profile: null,
      activeCategory: 'All',
      ordersCount: 0
    };

    this.init();
  }

  async init() {
    this.loadOrdersFromLocalStorage();
    this.renderToastContainer();
    this.setupFormHandler();

    // Jalankan pemuatan data secara paralel
    await Promise.all([
      this.loadProfile(),
      this.loadProjects(),
      this.loadServices()
    ]);
  }

  /**
   * Sanitasi string untuk mencegah kerentanan DOM-based Cross-Site Scripting (XSS)
   * @param {string} str 
   * @returns {string}
   */
  escapeHTML(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * 1. Profile Loader
   */
  async loadProfile() {
    try {
      const profile = await ApiService.getProfile();
      this.state.profile = profile;
      if (profile) {
        const nameEl = document.getElementById('heroName');
        if (nameEl) nameEl.textContent = profile.name;
        const bioEl = document.getElementById('heroBio');
        if (bioEl) bioEl.textContent = profile.bio;
      }
    } catch (err) {
      console.warn('[Profile Load Warning]: Menggunakan data default HTML shell.', err);
    }
  }

  /**
   * 2. Projects Loader & UI States Handler
   */
  async loadProjects() {
    const container = document.getElementById('projectsContainer');
    if (!container) return;

    // UI State 1: LOADING (Skeleton UI)
    this.renderProjectsSkeleton(container, 4);

    try {
      // Simulasi delay sedikit untuk mendemonstrasikan Loading State
      await new Promise((resolve) => setTimeout(resolve, 600));

      const projects = await ApiService.getProjects();
      this.state.projects = projects;

      // UI State 3: EMPTY STATE (Jika data dari server kosong)
      if (!projects || projects.length === 0) {
        this.renderEmptyState(container, 'Belum ada proyek yang dapat ditampilkan.');
        return;
      }

      // UI State 2: SUCCESS STATE
      this.renderCategoryFilters();
      this.renderProjectsGrid();

    } catch (err) {
      // UI State 4: ERROR FALLBACK ALERT
      this.renderErrorState(container, 'Gagal memuat data portofolio dari server. Silakan periksa koneksi atau coba muat ulang halaman.', () => this.loadProjects());
    }
  }

  /**
   * Render Skeleton Loading State untuk Portofolio
   */
  renderProjectsSkeleton(container, count = 3) {
    let html = '';
    for (let i = 0; i < count; i++) {
      html += `
        <div class="col">
          <div class="card h-100 shadow-sm project-card">
            <div class="skeleton skeleton-img"></div>
            <div class="card-body">
              <div class="skeleton skeleton-title"></div>
              <div class="skeleton skeleton-text"></div>
              <div class="skeleton skeleton-text" style="width: 80%;"></div>
            </div>
            <div class="card-footer bg-transparent border-0 pb-3">
              <div class="skeleton skeleton-text" style="height: 38px; border-radius: 6px;"></div>
            </div>
          </div>
        </div>
      `;
    }
    container.innerHTML = html;
  }

  /**
   * Render Filter Kategori Proyek secara Dinamis
   */
  renderCategoryFilters() {
    const filterContainer = document.getElementById('projectFilterContainer');
    if (!filterContainer) return;

    const categories = ['All', ...new Set(this.state.projects.map(p => p.category))];
    
    filterContainer.innerHTML = categories.map(cat => `
      <button type="button" class="btn ${this.state.activeCategory === cat ? 'btn-primary' : 'btn-outline-primary'} btn-sm px-3 rounded-pill filter-btn" data-category="${this.escapeHTML(cat)}">
        ${this.escapeHTML(cat)}
      </button>
    `).join(' ');

    // Event listener delegation untuk filter
    filterContainer.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const cat = e.target.getAttribute('data-category');
        this.state.activeCategory = cat;
        this.renderCategoryFilters();
        this.renderProjectsGrid();
      });
    });
  }

  /**
   * Render Cards Portofolio ke DOM (Dynamic CSR)
   */
  renderProjectsGrid() {
    const container = document.getElementById('projectsContainer');
    if (!container) return;

    const filtered = this.state.activeCategory === 'All'
      ? this.state.projects
      : this.state.projects.filter(p => p.category === this.state.activeCategory);

    if (filtered.length === 0) {
      this.renderEmptyState(container, `Tidak ada proyek ditemukan dalam kategori "${this.escapeHTML(this.state.activeCategory)}".`);
      return;
    }

    container.innerHTML = filtered.map(proj => `
      <div class="col">
        <div class="card h-100 shadow-sm project-card">
          <div class="card-img-wrapper" style="height: 180px; background-color: #e9ecef; display:flex; align-items:center; justify-content:center;">
            <i class="bi ${this.escapeHTML(proj.icon || 'bi-folder')} display-1 ${this.escapeHTML(proj.iconColor || 'text-secondary')}"></i>
          </div>
          <div class="card-body">
            <span class="badge bg-primary mb-2">${this.escapeHTML(proj.category)}</span>
            <h5 class="card-title fw-bold">${this.escapeHTML(proj.title)}</h5>
            <p class="card-text text-secondary">${this.escapeHTML(proj.description)}</p>
          </div>
          <div class="card-footer bg-transparent border-0 pb-3">
            <button type="button" class="btn btn-outline-primary w-100 btn-detail" onclick="app.openProjectModal('${this.escapeHTML(proj.id)}')">
              <i class="bi bi-info-circle me-1"></i> Detail Proyek
            </button>
          </div>
        </div>
      </div>
    `).join('');
  }

  /**
   * 3. Universal Dynamic Modal Component Renderer
   * Membuka 1 modal tunggal Bootstrap dan menginjeksi konten sesuai data-ID proyek
   */
  openProjectModal(projectId) {
    const proj = this.state.projects.find(p => p.id === projectId);
    if (!proj) return;

    const titleEl = document.getElementById('projectModalTitle');
    const bodyEl = document.getElementById('projectModalBody');

    if (titleEl) {
      titleEl.innerHTML = `<i class="bi ${this.escapeHTML(proj.icon)} me-2"></i>${this.escapeHTML(proj.title)}`;
    }

    if (bodyEl) {
      const tagsHTML = (proj.tags || []).map(t => `<span class="badge bg-secondary me-1 mb-1">${this.escapeHTML(t)}</span>`).join('');
      const metricsHTML = proj.metrics ? `
        <div class="row g-2 my-3 p-3 bg-light rounded border">
          <div class="col-6"><strong>Kompleksitas:</strong> ${this.escapeHTML(proj.metrics.complexity)}</div>
          <div class="col-6"><strong>Waktu Pengerjaan:</strong> ${this.escapeHTML(proj.metrics.completionTime)}</div>
        </div>
      ` : '';

      bodyEl.innerHTML = `
        <img src="${this.escapeHTML(proj.thumbnail)}" class="img-fluid rounded mb-3 w-100 shadow-sm" alt="${this.escapeHTML(proj.title)}" style="max-height: 250px; object-fit: cover;" onerror="this.src='https://via.placeholder.com/600x300?text=Project+Preview'">
        <div class="mb-2">
          <span class="badge bg-primary px-3 py-2 mb-2">${this.escapeHTML(proj.category)}</span>
        </div>
        <p class="text-secondary leading-relaxed">${this.escapeHTML(proj.description)}</p>
        ${metricsHTML}
        <div class="mt-3">
          <h6 class="fw-bold mb-2">Teknologi & Tags:</h6>
          <div>${tagsHTML}</div>
        </div>
      `;
    }

    const modalEl = document.getElementById('universalProjectModal');
    if (modalEl && window.bootstrap) {
      bootstrap.Modal.getOrCreateInstance(modalEl).show();
    }
  }

  /**
   * 4. Services Loader & Dynamic Rendering
   */
  async loadServices() {
    const container = document.getElementById('servicesContainer');
    if (!container) return;

    try {
      const services = await ApiService.getServices();
      this.state.services = services;

      if (!services || services.length === 0) return;

      container.innerHTML = services.map(srv => `
        <div class="col">
          <div class="card h-100 shadow-sm border-0 rounded-3">
            <div class="card-body p-4">
              <div class="d-flex justify-content-between align-items-center mb-3">
                <span class="badge bg-success px-3 py-2">${this.escapeHTML(srv.badge || 'Layanan')}</span>
                <span class="fs-5 fw-bold text-primary">${this.escapeHTML(srv.price)}</span>
              </div>
              <h5 class="card-title fw-bold">${this.escapeHTML(srv.title)}</h5>
              <p class="card-text text-secondary">${this.escapeHTML(srv.description)}</p>
              <hr>
              <ul class="list-unstyled mb-0">
                ${(srv.features || []).map(f => `<li class="mb-2"><i class="bi bi-check-circle-fill text-success me-2"></i>${this.escapeHTML(f)}</li>`).join('')}
              </ul>
            </div>
          </div>
        </div>
      `).join('');
    } catch (err) {
      console.warn('[Services Load Warning]:', err);
    }
  }

  /**
   * 5. Decoupled Form Handler & LocalStorage State Persistence
   */
  setupFormHandler() {
    const form = document.getElementById('contactForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!form.checkValidity()) {
        e.stopPropagation();
        form.classList.add('was-validated');
        return;
      }

      const formData = new FormData(form);
      const payload = Object.fromEntries(formData.entries());

      const submitBtn = form.querySelector('button[type="submit"]');
      const originalBtnHTML = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Mengirim...';

      try {
        const result = await ApiService.submitServiceOrder(payload);
        
        // Persist order to localStorage & update badge
        this.saveOrderToLocalStorage(payload);

        // Show visual feedback toast
        this.showToastNotification('Sukses!', result.message || 'Permintaan layanan berhasil diproses oleh API.');

        form.reset();
        form.classList.remove('was-validated');
      } catch (err) {
        this.showToastNotification('Gagal!', err.message || 'Terjadi kesalahan saat mengisolasi formulir.', 'danger');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHTML;
      }
    });
  }

  /**
   * Simpan Pesanan / Pesan ke LocalStorage
   */
  saveOrderToLocalStorage(orderData) {
    try {
      const existing = JSON.parse(localStorage.getItem('service_orders') || '[]');
      const newOrder = {
        ...orderData,
        id: 'ORD-' + Date.now(),
        createdAt: new Date().toISOString()
      };
      existing.push(newOrder);
      localStorage.setItem('service_orders', JSON.stringify(existing));
      this.updateOrdersBadge(existing.length);
    } catch (e) {
      console.error('LocalStorage Save Error:', e);
    }
  }

  loadOrdersFromLocalStorage() {
    try {
      const existing = JSON.parse(localStorage.getItem('service_orders') || '[]');
      this.updateOrdersBadge(existing.length);
    } catch (e) {
      this.updateOrdersBadge(0);
    }
  }

  updateOrdersBadge(count) {
    this.state.ordersCount = count;
    const badgeEl = document.getElementById('ordersBadge');
    if (badgeEl) {
      badgeEl.textContent = `${count} Pesanan Tersimpan`;
      badgeEl.classList.toggle('d-none', count === 0);
    }
  }

  /**
   * Visual UI Helpers: Empty State & Error State
   */
  renderEmptyState(container, message) {
    container.innerHTML = `
      <div class="col-12 text-center py-5">
        <i class="bi bi-inbox display-1 text-muted"></i>
        <h5 class="mt-3 text-secondary">${this.escapeHTML(message)}</h5>
      </div>
    `;
  }

  renderErrorState(container, message, retryCallback) {
    const errorId = 'retryBtn_' + Date.now();
    container.innerHTML = `
      <div class="col-12">
        <div class="alert alert-danger d-flex align-items-center justify-content-between shadow-sm rounded-3" role="alert">
          <div>
            <i class="bi bi-exclamation-triangle-fill fs-4 me-3"></i>
            <span>${this.escapeHTML(message)}</span>
          </div>
          ${retryCallback ? `<button id="${errorId}" class="btn btn-outline-danger btn-sm text-nowrap ms-3">Coba Lagi</button>` : ''}
        </div>
      </div>
    `;

    if (retryCallback) {
      document.getElementById(errorId)?.addEventListener('click', () => retryCallback());
    }
  }

  /**
   * Bootstrap Toast UI Feedback Notification
   */
  renderToastContainer() {
    if (document.getElementById('toastContainer')) return;
    const toastBox = document.createElement('div');
    toastBox.id = 'toastContainer';
    toastBox.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    toastBox.style.zIndex = '1100';
    document.body.appendChild(toastBox);
  }

  showToastNotification(title, message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toastId = 'toast_' + Date.now();
    const bgClass = type === 'success' ? 'bg-success text-white' : 'bg-danger text-white';
    
    const toastHTML = `
      <div id="${toastId}" class="toast align-items-center ${bgClass} border-0 shadow" role="alert" aria-live="assertive" aria-atomic="true">
        <div class="d-flex">
          <div class="toast-body">
            <strong>${this.escapeHTML(title)}</strong> ${this.escapeHTML(message)}
          </div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
      </div>
    `;

    container.insertAdjacentHTML('beforeend', toastHTML);
    const toastEl = document.getElementById(toastId);
    if (toastEl && window.bootstrap) {
      const bsToast = new bootstrap.Toast(toastEl, { delay: 4000 });
      bsToast.show();
      toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
    }
  }
}

// Inisialisasi aplikasi saat DOM siap
let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new App();
});
