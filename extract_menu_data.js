const fs = require('fs');
const html = fs.readFileSync('hap_menu2.html', 'utf8');

// Find all product-item
const productItemRegex = /<div[^>]*class=["'][^"']*product-item[^"']*["'][^>]*data-product-id=["']([^"']+)["'][^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;
let m;
const productItems = [];
while ((m = productItemRegex.exec(html)) !== null) {
  const id = m[1];
  const nameMatch = m[2].match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
  const imgMatch = m[2].match(/<img[^>]+src=["']([^"']+)["']/i);
  const name = nameMatch ? nameMatch[1].replace(/<[^>]+>/g, '').trim() : '';
  const img = imgMatch ? imgMatch[1] : '';
  productItems.push({ id, name, img });
}
console.log('Categories/Subcategories (product-item):', productItems.length);
console.log(productItems);

// Now let's extract all variant-item
const variantRegex = /<div[^>]*class=["'][^"']*variant-item[^"']*["'][^>]*data-product-id=["']([^"']+)["'][^>]*>([\s\S]*?)<\/h4>\s*<\/div>/gi;
const variants = [];
while ((m = variantRegex.exec(html)) !== null) {
  const productId = m[1];
  const inner = m[2];
  const imgMatch = inner.match(/<img[^>]+src=["']([^"']+)["']/i);
  const nameMatch = inner.match(/<h4[^>]*>([\s\S]*?)$/i);
  const name = nameMatch ? nameMatch[1].replace(/<[^>]+>/g, '').trim() : '';
  const img = imgMatch ? imgMatch[1] : '';
  variants.push({ productId, name, img });
}
console.log('\nTotal variants extracted:', variants.length);
console.log('Sample variants:', variants.slice(0, 10));

// Also let's check brands or main categories above product-items
const leftSidePos = html.indexOf('product-item');
if (leftSidePos !== -1) {
  console.log('\nContext above product-item:');
  console.log(html.substring(Math.max(0, leftSidePos - 1500), leftSidePos));
}
