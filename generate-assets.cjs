const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function generatePngFromSvg(svgPath, outputPath, size, background) {
  const transformer = sharp(svgPath).resize(size, size, {
    fit: 'cover',
    position: 'centre',
    background: background ?? { r: 10, g: 13, b: 16, alpha: 1 }
  });

  await transformer.png({ compressionLevel: 6 }).toFile(outputPath);
}

async function generateAllAssets() {
  console.log('🚀 بدء توليد الأصول والصور لكافة المنصات...');

  const splashSvgPath = path.join(__dirname, 'assets', 'splash.svg');
  const iosIconSvgPath = path.join(__dirname, 'assets', 'icon-ios.svg');
  const androidIconSvgPath = path.join(__dirname, 'assets', 'icon-android.svg');
  const webIconSvgPath = path.join(__dirname, 'assets', 'icon-web.svg');

  for (const [label, target] of Object.entries({
    iOS: iosIconSvgPath,
    Android: androidIconSvgPath,
    Web: webIconSvgPath,
    splash: splashSvgPath
  })) {
    if (!fs.existsSync(target)) {
      throw new Error(`❌ لم يتم العثور على ملف ${label}: ${target}`);
    }
  }

  const splashSvg = fs.readFileSync(splashSvgPath);

  console.log('📱 جارٍ إنشاء أيقونات iOS...');
  const iosAppIconDir = path.join(__dirname, 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset');
  fs.mkdirSync(iosAppIconDir, { recursive: true });

  const iosSizes = [
    { name: 'AppIcon-20x20@1x.png', size: 20 },
    { name: 'AppIcon-20x20@2x.png', size: 40 },
    { name: 'AppIcon-20x20@3x.png', size: 60 },
    { name: 'AppIcon-29x29@1x.png', size: 29 },
    { name: 'AppIcon-29x29@2x.png', size: 58 },
    { name: 'AppIcon-29x29@3x.png', size: 87 },
    { name: 'AppIcon-40x40@1x.png', size: 40 },
    { name: 'AppIcon-40x40@2x.png', size: 80 },
    { name: 'AppIcon-40x40@3x.png', size: 120 },
    { name: 'AppIcon-60x60@2x.png', size: 120 },
    { name: 'AppIcon-60x60@3x.png', size: 180 },
    { name: 'AppIcon-76x76@1x.png', size: 76 },
    { name: 'AppIcon-76x76@2x.png', size: 152 },
    { name: 'AppIcon-83.5x83.5@2x.png', size: 167 },
    { name: 'AppIcon-512@2x.png', size: 1024 },
    { name: 'AppIcon-1024x1024.png', size: 1024 }
  ];

  for (const item of iosSizes) {
    await generatePngFromSvg(iosIconSvgPath, path.join(iosAppIconDir, item.name), item.size, { r: 10, g: 13, b: 16, alpha: 1 });
  }

  const iosContents = {
    images: [
      { size: '20x20', idiom: 'iphone', filename: 'AppIcon-20x20@2x.png', scale: '2x' },
      { size: '20x20', idiom: 'iphone', filename: 'AppIcon-20x20@3x.png', scale: '3x' },
      { size: '29x29', idiom: 'iphone', filename: 'AppIcon-29x29@2x.png', scale: '2x' },
      { size: '29x29', idiom: 'iphone', filename: 'AppIcon-29x29@3x.png', scale: '3x' },
      { size: '40x40', idiom: 'iphone', filename: 'AppIcon-40x40@2x.png', scale: '2x' },
      { size: '40x40', idiom: 'iphone', filename: 'AppIcon-40x40@3x.png', scale: '3x' },
      { size: '60x60', idiom: 'iphone', filename: 'AppIcon-60x60@2x.png', scale: '2x' },
      { size: '60x60', idiom: 'iphone', filename: 'AppIcon-60x60@3x.png', scale: '3x' },
      { size: '20x20', idiom: 'ipad', filename: 'AppIcon-20x20@1x.png', scale: '1x' },
      { size: '20x20', idiom: 'ipad', filename: 'AppIcon-20x20@2x.png', scale: '2x' },
      { size: '29x29', idiom: 'ipad', filename: 'AppIcon-29x29@1x.png', scale: '1x' },
      { size: '29x29', idiom: 'ipad', filename: 'AppIcon-29x29@2x.png', scale: '2x' },
      { size: '40x40', idiom: 'ipad', filename: 'AppIcon-40x40@1x.png', scale: '1x' },
      { size: '40x40', idiom: 'ipad', filename: 'AppIcon-40x40@2x.png', scale: '2x' },
      { size: '76x76', idiom: 'ipad', filename: 'AppIcon-76x76@1x.png', scale: '1x' },
      { size: '76x76', idiom: 'ipad', filename: 'AppIcon-76x76@2x.png', scale: '2x' },
      { size: '83.5x83.5', idiom: 'ipad', filename: 'AppIcon-83.5x83.5@2x.png', scale: '2x' },
      { size: '1024x1024', idiom: 'ios-marketing', filename: 'AppIcon-1024x1024.png', scale: '1x' },
      { size: '1024x1024', idiom: 'universal', platform: 'ios', filename: 'AppIcon-512@2x.png' }
    ],
    info: { version: 1, author: 'xcode' }
  };

  fs.writeFileSync(path.join(iosAppIconDir, 'Contents.json'), JSON.stringify(iosContents, null, 2));

  const iosSplashDir = path.join(__dirname, 'ios', 'App', 'App', 'Assets.xcassets', 'Splash.imageset');
  fs.mkdirSync(iosSplashDir, { recursive: true });
  await sharp(splashSvg).resize(2732, 2732).png().toFile(path.join(iosSplashDir, 'splash-2732x2732.png'));
  await sharp(splashSvg).resize(1821, 1821).png().toFile(path.join(iosSplashDir, 'splash-2732x2732-1.png'));
  await sharp(splashSvg).resize(910, 910).png().toFile(path.join(iosSplashDir, 'splash-2732x2732-2.png'));

  console.log('🤖 جارٍ إنشاء أيقونات وشاشات Android...');
  const androidMipmaps = [
    { dir: 'mipmap-mdpi', size: 48, background: 108 },
    { dir: 'mipmap-hdpi', size: 72, background: 162 },
    { dir: 'mipmap-xhdpi', size: 96, background: 216 },
    { dir: 'mipmap-xxhdpi', size: 144, background: 324 },
    { dir: 'mipmap-xxxhdpi', size: 192, background: 432 }
  ];

  for (const m of androidMipmaps) {
    const dir = path.join(__dirname, 'android', 'app', 'src', 'main', 'res', m.dir);
    fs.mkdirSync(dir, { recursive: true });
    await generatePngFromSvg(androidIconSvgPath, path.join(dir, 'ic_launcher.png'), m.size);
    await generatePngFromSvg(androidIconSvgPath, path.join(dir, 'ic_launcher_round.png'), m.size);
    await generatePngFromSvg(androidIconSvgPath, path.join(dir, 'ic_launcher_foreground.png'), m.background);
    await sharp({
      create: { width: m.background, height: m.background, channels: 4, background: { r: 10, g: 13, b: 16, alpha: 1 } }
    }).png().toFile(path.join(dir, 'ic_launcher_background.png'));
  }

  console.log('🌐 جارٍ إنشاء أيقونات الويب و PWA...');
  const publicDir = path.join(__dirname, 'public');
  const publicIconsDir = path.join(publicDir, 'icons');

  if (fs.existsSync(publicIconsDir)) {
    fs.rmSync(publicIconsDir, { recursive: true, force: true });
  }

  for (const file of fs.readdirSync(publicDir)) {
    const lower = file.toLowerCase();
    if (lower.startsWith('icon-') || lower.startsWith('apple-touch-icon') || lower.startsWith('favicon') || lower === 'thari_icon.jpg' || lower === 'icon.png') {
      fs.rmSync(path.join(publicDir, file), { force: true });
    }
  }

  const iconSizes = [48, 192, 512];
  for (const size of iconSizes) {
    await generatePngFromSvg(webIconSvgPath, path.join(publicDir, `icon-${size}.png`), size);
  }

  const appleTouchSizes = [180];
  for (const size of appleTouchSizes) {
    await generatePngFromSvg(webIconSvgPath, path.join(publicDir, `apple-touch-icon-${size}x${size}.png`), size);
  }

  await generatePngFromSvg(webIconSvgPath, path.join(publicDir, 'apple-touch-icon.png'), 180);
  await generatePngFromSvg(webIconSvgPath, path.join(publicDir, 'favicon.png'), 64);
  await generatePngFromSvg(webIconSvgPath, path.join(publicDir, 'favicon-32x32.png'), 32);
  await generatePngFromSvg(webIconSvgPath, path.join(publicDir, 'favicon-16x16.png'), 16);
  await generatePngFromSvg(webIconSvgPath, path.join(publicDir, 'icon.png'), 512);

  const manifest = {
    name: 'ثري — THARI',
    short_name: 'ثري',
    description: 'نظامك المالي الهادئ للثروة والمحافظ — الفخامة الهادئة لإدارة الأصول والمصروفات.',
    start_url: '/',
    scope: '/',
    id: 'thari-wealth-app',
    display: 'standalone',
    display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
    background_color: '#0A0D10',
    theme_color: '#0A0D10',
    icons: [
      { src: '/icon-48.png', type: 'image/png', sizes: '48x48', purpose: 'any' },
      { src: '/icon-192.png', type: 'image/png', sizes: '192x192', purpose: 'any maskable' },
      { src: '/icon-512.png', type: 'image/png', sizes: '512x512', purpose: 'any maskable' }
    ],
    orientation: 'portrait',
    categories: ['finance', 'productivity', 'business'],
    prefer_related_applications: false
  };

  fs.writeFileSync(path.join(publicDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  const androidPublicDir = path.join(__dirname, 'android', 'app', 'src', 'main', 'assets', 'public');
  fs.mkdirSync(androidPublicDir, { recursive: true });
  fs.writeFileSync(path.join(androidPublicDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  for (const size of iconSizes) {
    const src = path.join(publicDir, `icon-${size}.png`);
    const destination = path.join(androidPublicDir, `icon-${size}.png`);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, destination);
    }
  }

  const androidCopyPaths = ['apple-touch-icon.png', 'favicon.png', 'favicon-32x32.png', 'favicon-16x16.png'];
  for (const name of androidCopyPaths) {
    const src = path.join(publicDir, name);
    const dest = path.join(androidPublicDir, name);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
    }
  }

  const iosPublicDir = path.join(__dirname, 'ios', 'App', 'App', 'public');
  if (fs.existsSync(iosPublicDir)) {
    const iosIconsDir = path.join(iosPublicDir, 'icons');
    if (fs.existsSync(iosIconsDir)) {
      fs.rmSync(iosIconsDir, { recursive: true, force: true });
    }
    for (const file of fs.readdirSync(iosPublicDir)) {
      const lower = file.toLowerCase();
      if (lower.startsWith('icon-') || lower.startsWith('apple-touch-icon') || lower.startsWith('favicon') || lower === 'thari_icon.jpg' || lower === 'icon.png') {
        fs.rmSync(path.join(iosPublicDir, file), { force: true });
      }
    }
    for (const size of iconSizes) {
      const src = path.join(publicDir, `icon-${size}.png`);
      const dest = path.join(iosPublicDir, `icon-${size}.png`);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
      }
    }
    for (const name of [...androidCopyPaths, 'apple-touch-icon-180x180.png', 'icon.png']) {
      const src = path.join(publicDir, name);
      const dest = path.join(iosPublicDir, name);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
      }
    }
    fs.writeFileSync(path.join(iosPublicDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  }

  console.log('✅ تم توليد كافة الصور بصيغة PNG بنجاح، مع تحديث Manifest لأيقونات منصة iOS/Android/Web بشكل صحيح.');
}

generateAllAssets().catch(err => {
  console.error('❌ حدث خطأ أثناء التوليد:', err);
  process.exit(1);
});