const sharp = require('sharp');
const path = require('path');

sharp(path.join(__dirname, '../media/icon.svg'))
  .resize(128, 128)
  .png()
  .toFile(path.join(__dirname, '../media/icon.png'))
  .then(() => console.log('✓ icon.png generated'))
  .catch((err) => console.error('Failed:', err));
