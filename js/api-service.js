/**
 * ApiService - Data Access Layer (DAL)
 * Bertanggung jawab menangani pemanggilan HTTP Fetch API secara asinkron dengan error handling defensif.
 */
const ApiService = {
  /**
   * Mengambil data dari endpoint JSON
   * @param {string} endpoint - Path berkas JSON
   * @returns {Promise<any>}
   */
  async fetchData(endpoint) {
    try {
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (err) {
      console.error(`[API Network Error - ${endpoint}]:`, err);
      throw err;
    }
  },

  /**
   * Mengambil data biodata profile pengembang
   */
  async getProfile() {
    return await this.fetchData('./data/profile.json');
  },

  /**
   * Mengambil koleksi portofolio proyek
   */
  async getProjects() {
    return await this.fetchData('./data/projects.json');
  },

  /**
   * Mengambil katalog layanan
   */
  async getServices() {
    return await this.fetchData('./data/services.json');
  },

  /**
   * Simulasi Pengiriman Form Asinkron (RESTful POST Endpoint Mock)
   * @param {Object} payload 
   * @returns {Promise<Object>}
   */
  async submitServiceOrder(payload) {
    // Simulasi latensi jaringan (800ms)
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Validasi sederhana masukan
    if (!payload.nama || !payload.email || !payload.pesan) {
      throw new Error('Semua bidang formulir yang wajib harus diisi!');
    }

    // Simulasi respons HTTP 201 Created
    return {
      status: 'success',
      statusCode: 201,
      message: 'Pesanan layanan / pesan berhasil dikirim dan diproses oleh server.',
      timestamp: new Date().toISOString(),
      data: payload
    };
  }
};
