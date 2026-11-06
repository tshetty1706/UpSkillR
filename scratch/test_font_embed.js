const sharp = require('../Backend/node_modules/sharp');
const fs = require('fs');

const fontBase64 = fs.readFileSync('Backend/assets/fonts/GreatVibes.ttf').toString('base64');
const svg = Buffer.from(`
<svg width='400' height='100' xmlns='http://www.w3.org/2000/svg'>
  <defs>
    <style>
      @font-face {
        font-family: 'GreatVibesEmbedded';
        src: url('data:font/truetype;charset=utf-8;base64,${fontBase64}') format('truetype');
      }
      .sig {
        font-family: 'GreatVibesEmbedded', cursive;
        font-size: 40px;
        fill: #064e3b;
        text-anchor: middle;
      }
    </style>
  </defs>
  <rect width='100%' height='100%' fill='#ffffff'/>
  <text x='200' y='65' class='sig'>Samruddhi Patil</text>
</svg>
`);

sharp(svg)
  .png()
  .toBuffer()
  .then(buf => {
    console.log('Embedded font test successful! Generated PNG bytes:', buf.length);
  })
  .catch(console.error);
