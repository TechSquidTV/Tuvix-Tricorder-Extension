const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SIZES = [16, 48, 128];
const STORE_SIZE = 512; // For store listing
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

  // Generate 512x512 store listing icon from discovered state
  console.log('\nGenerating 512x512 store listing icon...');
  const discoveredSvgPath = path.join(ICONS_DIR, 'tuvix-discovered.svg');
  const storePngPath = path.join(DIST_ICONS_DIR, 'tuvix-discovered-512.png');

  if (fs.existsSync(discoveredSvgPath)) {
    try {
      await sharp(discoveredSvgPath, {
        density: 300
      })
        .resize(STORE_SIZE, STORE_SIZE, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(storePngPath);

      console.log(`  ✓ Generated tuvix-discovered-512.png for store listing`);
      successCount++;
    } catch (error) {
      console.error(`  ✗ Failed to generate store listing icon`);
      console.error(`    Error: ${error.message}`);
      errorCount++;
    }
  } else {
    console.warn('⚠️  Discovered icon not found, skipping 512x512 generation');
  }

  console.log('\n' + '='.repeat(50));
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
