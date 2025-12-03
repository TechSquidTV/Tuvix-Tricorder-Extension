const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SIZES = [16, 48, 128];
const ICON_NAMES = ['tuvix-disabled', 'tuvix-enabled', 'tuvix-discovered'];
const ICONS_DIR = path.join(__dirname, '..', 'icons');
const DIST_ICONS_DIR = path.join(__dirname, '..', 'dist', 'icons');

async function generateIcons() {
  // Ensure dist/icons directory exists
  if (!fs.existsSync(DIST_ICONS_DIR)) {
    fs.mkdirSync(DIST_ICONS_DIR, { recursive: true });
    console.log('Created dist/icons directory');
  }

  let successCount = 0;
  let errorCount = 0;

  console.log('Generating PNG icons from SVG sources...\n');

  for (const iconName of ICON_NAMES) {
    const svgPath = path.join(ICONS_DIR, `${iconName}.svg`);

    if (!fs.existsSync(svgPath)) {
      console.warn(`⚠️  SVG not found: ${iconName}.svg`);
      errorCount++;
      continue;
    }

    console.log(`Processing ${iconName}.svg...`);

    for (const size of SIZES) {
      const pngPath = path.join(DIST_ICONS_DIR, `${iconName}-${size}.png`);

      try {
        await sharp(svgPath, {
          density: 300 // High DPI for crisp rendering
        })
          .resize(size, size, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          })
          .png()
          .toFile(pngPath);

        console.log(`  ✓ Generated ${iconName}-${size}.png`);
        successCount++;
      } catch (error) {
        console.error(`  ✗ Failed to generate ${iconName}-${size}.png`);
        console.error(`    Error: ${error.message}`);
        errorCount++;
      }
    }

    console.log('');
  }

  console.log('='.repeat(50));
  console.log(`✅ Successfully generated: ${successCount} icons`);
  if (errorCount > 0) {
    console.log(`❌ Failed: ${errorCount} icons`);
    process.exit(1);
  }
  console.log('='.repeat(50));
}

generateIcons().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
