const puppeteer = require('puppeteer');

// Fungsi pembantu untuk membuat delay buatan agar pergerakan terlihat natural
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

(async () => {
  console.log('Menjalankan simulasi pitch video...');
  
  // 1. Jalankan browser
  const browser = await puppeteer.launch({
    headless: false, // Ubah ke true jika tidak ingin melihat browser
    defaultViewport: { width: 1920, height: 1080 }, // Resolusi HD 1080p
    args: ['--start-maximized']
  });

  const page = await browser.newPage();
  
  // Konfigurasi kecepatan mengetik (0,5 detik jeda untuk natural feel, meskipun ini typing delay)
  // Puppeteer `type` memiliki parameter delay per karakter.
  // Untuk jeda 0,5 detik antar "aksi", kita gunakan await delay(500).
  const ACTION_DELAY = 500;

  try {
    // 2. Buka Halaman Landing
    console.log('Membuka Landing Page...');
    await page.goto('https://runit.web.app', { waitUntil: 'networkidle2' });
    await delay(1000);

    // 3. Scroll perlahan ke bawah untuk memperlihatkan fitur, lalu kembali ke atas
    console.log('Scroll halaman...');
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        let distance = 100;
        const timer = setInterval(() => {
          let scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= 1000) { // Scroll sampai sekitar 1000px
            clearInterval(timer);
            resolve();
          }
        }, 50); // Kecepatan scroll
      });
    });
    
    await delay(1000);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    await delay(1500);

    // 4. Klik tombol "Start Now" atau "Dashboard" yang mengarah ke /workspace/new
    console.log('Klik menuju Workspace...');
    await page.waitForSelector('a[href="/workspace/new"]');
    await page.click('a[href="/workspace/new"]');
    await delay(ACTION_DELAY);
    
    // Tunggu sampai halaman workspace/new termuat
    await page.waitForSelector('h1', { timeout: 10000 });
    await delay(2000);

    // 5. Kita gunakan opsi "Quick-Start Template" (misal: Kompteisi / Hackathon)
    console.log('Memilih Template Kompetisi...');
    // Mencari tombol template berdasarkan teks di dalamnya
    const templates = await page.$$('button');
    let targetTemplate = null;
    for (let t of templates) {
      const text = await page.evaluate(el => el.textContent, t);
      if (text && text.includes('Kompetisi')) {
        targetTemplate = t;
        break;
      }
    }
    
    if (targetTemplate) {
      await targetTemplate.click();
      await delay(ACTION_DELAY * 2);

      // 6. Mengisi nama event di input field yang muncul
      console.log('Mengisi Nama Event...');
      // Cari input dengan placeholder yang sesuai (cth: Kompetisi Tim Alpha)
      const inputs = await page.$$('input');
      // Input nama event biasanya adalah input pertama setelah template dipilih
      if (inputs.length > 0) {
        // Fokus ke input
        await inputs[0].click();
        await delay(ACTION_DELAY);
        // Mengetik dengan natural (misal 100ms per huruf)
        await inputs[0].type('Hackathon Nasional 2026', { delay: 100 });
        await delay(ACTION_DELAY);
      }

      // 7. Mengisi form tambahan (Tanggal & Venue)
      if (inputs.length > 1) {
        await inputs[1].type('15-16 Agustus 2026', { delay: 50 });
        await delay(ACTION_DELAY);
      }
      if (inputs.length > 2) {
        await inputs[2].type('Gelora Bung Karno', { delay: 50 });
        await delay(ACTION_DELAY);
      }

      // 8. Klik tombol "Launch Master Plan Sekarang"
      console.log('Menjalankan Master Plan...');
      const launchBtns = await page.$$('button');
      for (let b of launchBtns) {
        const text = await page.evaluate(el => el.textContent, b);
        if (text && text.includes('Launch Master Plan Sekarang')) {
          await b.click();
          break;
        }
      }

      // Tunggu proses redirect ke halaman master plan
      await page.waitForNavigation({ waitUntil: 'networkidle2' });
      await delay(2000);

      console.log('Selesai! Sekarang berada di halaman Master Plan.');
      // Biarkan browser terbuka sekitar 10 detik agar bisa direkam akhirannya
      await delay(10000);
    } else {
      console.log('Template "Kompetisi" tidak ditemukan.');
    }
  } catch (error) {
    console.error('Terjadi kesalahan selama simulasi:', error);
  } finally {
    console.log('Menutup browser...');
    await browser.close();
  }
})();
