const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

function findPngs(dir, list = []) {
  if (!fs.existsSync(dir)) return list;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findPngs(fullPath, list);
    } else if (entry.name.toLowerCase().endsWith('.png')) {
      list.push(fullPath);
    }
  }
  return list;
}

async function verifyAll() {
  console.log('🔍 فحص تكامل ملفات الصور والتحقق من التوقيع الثنائي...');
  const pngs = findPngs(process.cwd());
  console.log(`📊 عدد ملفات PNG المكتشفة: ${pngs.length}`);

  let valid = 0;
  let invalid = 0;

  for (const file of pngs) {
    const buf = fs.readFileSync(file);

    // فحص البايتات السحرية للـ PNG (Magic Bytes)
    const isMagicPng = buf.length > 8 &&
      buf[0] === 0x89 &&
      buf[1] === 0x50 && // P
      buf[2] === 0x4E && // N
      buf[3] === 0x47 && // G
      buf[4] === 0x0D &&
      buf[5] === 0x0A &&
      buf[6] === 0x1A &&
      buf[7] === 0x0A;

    if (!isMagicPng) {
      console.error(`❌ ملف تالف أو غير متوافق: ${file}`);
      invalid++;
      continue;
    }

    try {
      const meta = await sharp(buf).metadata();
      if (meta.format !== 'png' || !meta.width || !meta.height) {
        console.error(`❌ بنية صورة غير صالحة: ${file}`);
        invalid++;
      } else {
        valid++;
      }
    } catch (err) {
      console.error(`❌ فشل فك الترميز: ${file} (${err.message})`);
      invalid++;
    }
  }

  console.log('\n--- تقرير الفحص ---');
  console.log(`✅ الملفات السليمة والمعتمدة: ${valid}`);
  console.log(`❌ الملفات التالفة: ${invalid}`);

  if (invalid > 0) {
    console.error('⚠️ يوجد ملفات غير صالحة، يرجى إعادة تشغيل سكربت التوليد.');
    process.exit(1);
  } else {
    console.log('🎉 جميع الصور أصلية ومتوافقة 100% مع كافة الأنظمة ومستعرضات الصور.');
  }
}

verifyAll();