const sharp = require('../Backend/node_modules/sharp');
const QRCode = require('../Backend/node_modules/qrcode');
const fs = require('fs');

async function testComposite() {
  const qrBuffer = await QRCode.toBuffer('https://upskillr.com/verify-certificate/UPSK-2026-000842', {
    width: 90,
    margin: 1,
    color: {
      dark: '#0f3d2e',
      light: '#ffffff'
    }
  });

  const svg = Buffer.from(`
    <svg width="1024" height="682" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&amp;family=Playfair+Display:wght@700&amp;family=Inter:wght@500;600;700&amp;display=swap');
          .student-name {
            font-family: 'Playfair Display', Georgia, 'Times New Roman', serif;
            font-size: 28px;
            font-weight: 700;
            fill: #064e3b;
            text-anchor: middle;
            letter-spacing: 0.5px;
          }
          .course-name {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            font-size: 19px;
            font-weight: 700;
            fill: #065f46;
            text-anchor: middle;
            letter-spacing: 0.2px;
          }
          .meta-text {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            font-size: 13px;
            font-weight: 700;
            fill: #1f2937;
            text-anchor: middle;
          }
          .instructor-sig {
            font-family: 'Great Vibes', 'Brush Script MT', 'Dancing Script', cursive;
            font-size: 38px;
            fill: #064e3b;
            text-anchor: middle;
          }
          .instructor-name {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            font-size: 14px;
            font-weight: 700;
            fill: #0f172a;
            text-anchor: middle;
          }
          .instructor-role {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            font-size: 11px;
            font-weight: 500;
            fill: #475569;
            text-anchor: middle;
          }
        </style>
      </defs>

      <!-- 1. Student Name Cover & Text -->
      <rect x="250" y="226" width="524" height="48" rx="24" fill="#ffffff" stroke="#e2e8f0" stroke-width="1"/>
      <text x="512" y="260" class="student-name">Aarti Arvind Singh</text>

      <!-- 2. Course Name Cover & Text -->
      <rect x="190" y="316" width="644" height="48" rx="24" fill="#f0fdf4" stroke="#86efac" stroke-width="1.2"/>
      <text x="512" y="347" class="course-name">Database Management System (DBMS)</text>

      <!-- 3. Date Cover & Text -->
      <rect x="280" y="446" width="180" height="25" rx="6" fill="#ffffff" stroke="#e2e8f0" stroke-width="1"/>
      <text x="370" y="463" class="meta-text">November 6, 2026</text>

      <!-- 4. Certificate ID Cover & Text -->
      <rect x="595" y="446" width="190" height="25" rx="6" fill="#ffffff" stroke="#e2e8f0" stroke-width="1"/>
      <text x="690" y="463" class="meta-text">UPSK-2026-000842</text>

      <!-- 5. Instructor Signature Cover & Text -->
      <rect x="202" y="515" width="196" height="48" fill="#ffffff"/>
      <text x="300" y="550" class="instructor-sig">Samruddhi Patil</text>

      <!-- 6. Instructor Name & Designation Cover & Text -->
      <rect x="195" y="573" width="210" height="42" fill="#ffffff"/>
      <text x="300" y="589" class="instructor-name">Samruddhi Patil</text>
      <text x="300" y="605" class="instructor-role">Senior Database Architect</text>
    </svg>
  `);

  await sharp('Backend/assets/certificate_template_raw.png')
    .composite([
      // Replace QR code placeholder with real QR code
      { input: qrBuffer, top: 518, left: 85 },
      { input: svg, top: 0, left: 0 }
    ])
    .png({ quality: 100 })
    .toFile('Backend/assets/test_certificate_output.png');

  console.log('Generated test_certificate_output.png successfully');
}

testComposite().catch(console.error);
