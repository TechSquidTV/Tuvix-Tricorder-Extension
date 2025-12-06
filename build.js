const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');
const postcss = require('postcss');
const tailwindcss = require('@tailwindcss/postcss');
const sharp = require('sharp');

const isWatch = process.argv.includes('--watch');

const sharedConfig = {
  bundle: true,
  platform: 'browser',
  target: 'es2020',
  sourcemap: isWatch ? 'inline' : false,
  minify: !isWatch,
};

const buildConfigs = [
  {
    ...sharedConfig,
    entryPoints: ['src/popup.ts'],
    outfile: 'dist/popup.js',
    format: 'iife',
  },
  {
    ...sharedConfig,
    entryPoints: ['src/background.ts'],
    outfile: 'dist/background.js',
    format: 'esm',
  },
  {
    ...sharedConfig,
    entryPoints: ['src/options.ts'],
    outfile: 'dist/options.js',
    format: 'iife',
  },
];

async function buildCSS() {
  const cssInput = fs.readFileSync(path.join(__dirname, 'src/styles.css'), 'utf8');

  const result = await postcss([
    tailwindcss({
      base: __dirname,
      optimize: {
        minify: !isWatch
      }
    })
  ]).process(cssInput, {
    from: path.join(__dirname, 'src/styles.css'),
    to: path.join(__dirname, 'dist/styles.css')
  });

  fs.writeFileSync(path.join(__dirname, 'dist/styles.css'), result.css);
  console.log('Tailwind CSS compiled');
}

async function copyStaticFiles() {
  const filesToCopy = [
    { from: 'manifest.json', to: 'dist/manifest.json' },
    { from: 'popup.html', to: 'dist/popup.html' },
    { from: 'options.html', to: 'dist/options.html' },
  ];

  const distDir = path.join(__dirname, 'dist');
  const iconsDistDir = path.join(distDir, 'icons');

  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  if (!fs.existsSync(iconsDistDir)) {
    fs.mkdirSync(iconsDistDir, { recursive: true });
  }

  filesToCopy.forEach(({ from, to }) => {
    fs.copyFileSync(path.join(__dirname, from), path.join(__dirname, to));
  });

  // Copy SVG icons
  const iconFiles = ['tuvix-disabled.svg', 'tuvix-enabled.svg', 'tuvix-discovered.svg'];
  iconFiles.forEach(icon => {
    const iconPath = path.join(__dirname, 'icons', icon);
    const iconDistPath = path.join(iconsDistDir, icon);
    if (fs.existsSync(iconPath)) {
      fs.copyFileSync(iconPath, iconDistPath);
    }
  });

  // Convert SVGs to PNGs for Chrome compatibility using Sharp
  const sizes = [16, 48, 128];
  const iconNames = ['tuvix-disabled', 'tuvix-enabled', 'tuvix-discovered'];

  for (const iconName of iconNames) {
    const svgPath = path.join(__dirname, 'icons', `${iconName}.svg`);
    if (fs.existsSync(svgPath)) {
      for (const size of sizes) {
        const pngPath = path.join(iconsDistDir, `${iconName}-${size}.png`);
        try {
          await sharp(svgPath, {
            density: 300
          })
            .resize(size, size, {
              fit: 'contain',
              background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .png()
            .toFile(pngPath);
        } catch (error) {
          console.warn(`Warning: Could not convert ${iconName} to ${size}px PNG:`, error.message);
        }
      }
    }
  }

  // Generate 512x512 store listing icon from discovered state
  const discoveredSvgPath = path.join(__dirname, 'icons', 'tuvix-discovered.svg');
  const storePngPath = path.join(iconsDistDir, 'tuvix-discovered-512.png');
  if (fs.existsSync(discoveredSvgPath)) {
    try {
      await sharp(discoveredSvgPath, {
        density: 300
      })
        .resize(512, 512, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(storePngPath);
    } catch (error) {
      console.warn('Warning: Could not generate 512px store listing icon:', error.message);
    }
  }

  console.log('Static files copied and icons converted');
}

async function build() {
  try {
    await copyStaticFiles();
    await buildCSS();

    if (isWatch) {
      const contexts = await Promise.all(
        buildConfigs.map(config => esbuild.context(config))
      );
      await Promise.all(contexts.map(ctx => ctx.watch()));

      // Watch CSS file for changes
      fs.watch(path.join(__dirname, 'src/styles.css'), async () => {
        try {
          await buildCSS();
        } catch (error) {
          console.error('CSS build failed:', error);
        }
      });

      console.log('Watching for changes...');
    } else {
      await Promise.all(buildConfigs.map(config => esbuild.build(config)));
      console.log('Build complete');
    }
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

build();
