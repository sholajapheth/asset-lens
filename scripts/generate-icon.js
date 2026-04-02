const sharp = require('sharp');
const path = require('path');

const source = path.join(__dirname, '../asset-lens-logo.jpeg');
const out = path.join(__dirname, '../media/icon.png');

sharp(source)
  .resize(128, 128, { fit: 'cover', position: 'centre' })
  .png()
  .toFile(out)
  .then(() => console.log('✓ icon.png generated from asset-lens-logo.jpeg'))
  .catch((err) => console.error('Failed:', err));
