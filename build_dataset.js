const { execSync } = require('child_process');
const fs = require('fs');

const brands = [
  { id: 'all', name: 'All Products' },
  { id: 'arokya', name: 'Arokya' },
  { id: 'hatsun', name: 'Hatsun' },
  { id: 'arun', name: 'Arun Icecreams' },
  { id: 'hap-cake', name: 'HAP Cake' },
  { id: 'hanobar', name: 'Hanobar' },
  { id: 'dako', name: 'Dako' },
  { id: 'aniva', name: 'Aniva' }
];

// Realistic standard price lookup by keyword or type for HAP products
function estimatePrice(name, category, brand) {
  const lower = (name + ' ' + category).toLowerCase();
  
  // Milk pricing
  if (lower.includes('milk')) {
    if (lower.includes('100 ml') || lower.includes('120 ml')) return 10;
    if (lower.includes('140 ml') || lower.includes('150 ml')) return 12;
    if (lower.includes('200 ml') || lower.includes('250 ml')) return 18;
    if (lower.includes('350 ml')) return 24;
    if (lower.includes('500 ml')) {
      if (lower.includes('full cream')) return 35;
      if (lower.includes('standardized')) return 31;
      if (lower.includes('toned')) return 28;
      if (lower.includes('cow milk')) return 30;
      return 29;
    }
    if (lower.includes('1 l') || lower.includes('1000 ml')) {
      if (lower.includes('full cream')) return 70;
      if (lower.includes('standardized')) return 62;
      return 56;
    }
    if (lower.includes('1.5 l')) return 84;
    if (lower.includes('2 l')) return 112;
    if (lower.includes('5.5 l') || lower.includes('5 l')) return 300;
  }
  
  // Whey drink
  if (lower.includes('whey')) {
    if (lower.includes('140 ml')) return 15;
    if (lower.includes('200 ml')) return 20;
    return 20;
  }
  
  // Curd / Yoghurt / Lassi / Buttermilk
  if (lower.includes('curd') || lower.includes('yoghurt')) {
    if (lower.includes('100 g') || lower.includes('150 g')) return 15;
    if (lower.includes('200 g') || lower.includes('200 ml')) return 20;
    if (lower.includes('400 g') || lower.includes('500 g') || lower.includes('500 ml')) return 40;
    if (lower.includes('1 kg') || lower.includes('1000 g') || lower.includes('1 kg pouch')) return 75;
    if (lower.includes('tub') || lower.includes('bucket')) return 160;
    return 35;
  }
  if (lower.includes('buttermilk')) return 15;
  if (lower.includes('lassi')) return 25;

  // Paneer / Butter / Ghee / Cheese
  if (lower.includes('paneer')) {
    if (lower.includes('100 g')) return 50;
    if (lower.includes('200 g')) return 95;
    if (lower.includes('500 g')) return 220;
    if (lower.includes('1 kg')) return 420;
    return 95;
  }
  if (lower.includes('butter') && !lower.includes('butterscotch')) {
    if (lower.includes('100 g')) return 60;
    if (lower.includes('500 g')) return 280;
    return 60;
  }
  if (lower.includes('ghee')) {
    if (lower.includes('50 ml') || lower.includes('100 ml')) return 75;
    if (lower.includes('200 ml')) return 150;
    if (lower.includes('500 ml')) return 360;
    if (lower.includes('1 l') || lower.includes('1000 ml')) return 690;
    return 360;
  }
  if (lower.includes('cheese')) return 85;

  // Cakes
  if (lower.includes('cake')) {
    if (lower.includes('slice')) return 70;
    if (lower.includes('700 g') || lower.includes('750 g') || lower.includes('800 g') || lower.includes('1 kg')) return 490;
    return 450;
  }

  // Ice cream tubs / slice it
  if (lower.includes('slice it') || lower.includes('cassata')) return 240;
  if (lower.includes('tub') || lower.includes('700 ml') || lower.includes('750 ml') || lower.includes('1 l') || lower.includes('1000 ml')) return 220;
  if (lower.includes('cone') || lower.includes('icone')) {
    if (lower.includes('mini')) return 25;
    return 45;
  }
  if (lower.includes('kids') || lower.includes('bar') || lower.includes('stick') || lower.includes('bites')) {
    if (lower.includes('bites')) return 20;
    if (lower.includes('kids')) return 15;
    if (lower.includes('ibar')) return 35;
    return 30;
  }
  if (lower.includes('kulfi')) return 30;
  if (lower.includes('shake')) return 50;
  if (lower.includes('cup')) return 25;

  // Dako / Nuts / Spreads
  if (lower.includes('nuts') || lower.includes('almond') || lower.includes('walnut')) return 95;
  if (lower.includes('spread') || lower.includes('sauce') || lower.includes('fudge')) return 110;
  if (lower.includes('rolls')) return 30;

  // Default fallback
  return 40;
}

const allBrandsData = {};
const allProductsMap = {};
let autoBarcode = 890123400001;

brands.forEach(b => {
  if (b.id === 'all') return;
  console.log(`Processing brand: ${b.name} (${b.id})...`);
  const html = execSync(`curl.exe -sL "https://hapdaily.com/menu?brand=${b.id}"`).toString();

  // Extract categories (product-item)
  const productItemRegex = /<div[^>]*class=["'][^"']*product-item[^"']*["'][^>]*data-product-id=["']([^"']+)["'][^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;
  const categories = {};
  let m;
  while ((m = productItemRegex.exec(html)) !== null) {
    const id = m[1];
    const nameMatch = m[2].match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
    const catName = nameMatch ? nameMatch[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim() : 'General';
    categories[id] = catName;
  }

  // Extract variants
  const variantRegex = /<div[^>]*class=["'][^"']*variant-item[^"']*["'][^>]*data-product-id=["']([^"']+)["'][^>]*>([\s\S]*?)<\/h4>\s*<\/div>/gi;
  const variants = [];
  while ((m = variantRegex.exec(html)) !== null) {
    const prodCatId = m[1];
    const inner = m[2];
    const imgMatch = inner.match(/<img[^>]+src=["']([^"']+)["']/i);
    const nameMatch = inner.match(/<h4[^>]*>([\s\S]*?)$/i);
    const rawName = nameMatch ? nameMatch[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim() : '';
    const img = imgMatch ? imgMatch[1] : '';
    const categoryName = categories[prodCatId] || 'Dairy & Sweets';

    if (rawName) {
      const price = estimatePrice(rawName, categoryName, b.name);
      
      // Extract size / unit if present
      let unit = '';
      const sizeMatch = rawName.match(/(\d+(?:\.\d+)?\s*(?:ml|l|g|kg|pcs?|gm))/i);
      if (sizeMatch) {
        unit = sizeMatch[1];
      }

      const itemKey = `${b.id}_${rawName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      
      const productObj = {
        id: itemKey,
        barcode: String(autoBarcode++),
        name: rawName,
        category: categoryName,
        categoryId: prodCatId,
        brand: b.name,
        brandId: b.id,
        price: price,
        mrp: price,
        cost: Math.round(price * 0.82), // Wholesale cost
        unit: unit || 'Unit',
        taxRate: (rawName.toLowerCase().includes('ice cream') || rawName.toLowerCase().includes('chocolate')) ? 18 : (rawName.toLowerCase().includes('ghee') || rawName.toLowerCase().includes('butter') || rawName.toLowerCase().includes('paneer')) ? 12 : 5,
        stock: Math.floor(Math.random() * 45) + 15,
        image: img || 'https://hapdaily.com/wp-content/uploads/2025/12/HAP-Logo.png'
      };

      variants.push(productObj);
      allProductsMap[itemKey] = productObj;
    }
  }

  allBrandsData[b.id] = {
    brand: b,
    categories: Object.entries(categories).map(([id, name]) => ({ id, name })),
    variants: variants
  };
});

const allProductsList = Object.values(allProductsMap);
console.log(`Total unique products processed across all brands: ${allProductsList.length}`);

// Save to JSON
fs.writeFileSync('hap_products.json', JSON.stringify({
  brands: brands,
  totalProducts: allProductsList.length,
  products: allProductsList,
  byBrand: allBrandsData
}, null, 2));

console.log('Successfully written hap_products.json!');
