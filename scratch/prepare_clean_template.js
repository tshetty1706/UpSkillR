const sharp = require('../Backend/node_modules/sharp');

async function createCleanTemplate() {
  // Clear the placeholder boxes from raw template so the clean template is pristine
  const patchSvg = Buffer.from(`
    <svg width="1024" height="682" xmlns="http://www.w3.org/2000/svg">
      <!-- 1. Clear Student Name Placeholder -->
      <rect x="245" y="222" width="534" height="56" rx="28" fill="#ffffff" stroke="#e5e7eb" stroke-width="1"/>

      <!-- 2. Clear Course Name Placeholder -->
      <rect x="185" y="312" width="654" height="56" rx="28" fill="#f0fdf4" stroke="#86efac" stroke-width="1.2"/>

      <!-- 3. Clear Date Placeholder -->
      <rect x="275" y="444" width="190" height="28" rx="6" fill="#ffffff" stroke="#e5e7eb" stroke-width="1"/>

      <!-- 4. Clear ID Placeholder -->
      <rect x="590" y="444" width="200" height="28" rx="6" fill="#ffffff" stroke="#e5e7eb" stroke-width="1"/>

      <!-- 5. Clear Sample QR Code Placeholder -->
      <rect x="75" y="512" width="110" height="100" fill="#ffffff"/>

      <!-- 6. Clear Instructor Signature & Name Placeholder -->
      <rect x="195" y="512" width="210" height="52" fill="#ffffff"/>
      <rect x="195" y="572" width="210" height="44" fill="#ffffff"/>
    </svg>
  `);

  await sharp('Backend/assets/certificate_template_raw.png')
    .composite([{ input: patchSvg, top: 0, left: 0 }])
    .png({ quality: 100 })
    .toFile('Backend/assets/certificate_template_clean.png');

  console.log('Created Backend/assets/certificate_template_clean.png');
}

createCleanTemplate().catch(console.error);
