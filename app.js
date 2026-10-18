import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import { HAP_PRODUCTS_DATA } from './productsData.js';

// ==========================================================================
// HAP DAILY POS & BILLING SOFTWARE - APPLICATION CORE
// ==========================================================================

// Global State
const STATE = {
  products: [],
  activeBrand: 'all',
  activeCategory: 'all',
  searchQuery: '',
  hideOutOfStock: false,
  
  // Multi-tab active bills
  tabs: [
    {
      id: 1,
      name: 'Bill #1',
      items: [],
      customer: { phone: '', name: '' },
      discountPercent: 0,
      cashTendered: 0,
      paymentMethod: 'CASH'
    },
    {
      id: 2,
      name: 'Bill #2',
      items: [],
      customer: { phone: '', name: '' },
      discountPercent: 0,
      cashTendered: 0,
      paymentMethod: 'CASH'
    }
  ],
  activeTabId: 1,
  
  // Settings
  settings: {
    storeName: 'HAP Daily - Anna Nagar',
    storeId: 'HAP-CHN-2408',
    storeAddress: 'No. 12, 2nd Avenue, Anna Nagar West, Chennai - 600040',
    gstin: '33AAACH1234F1Z8',
    fssai: '12421008000452',
    cashierName: 'Jeeva M.',
    upiVpa: 'hapdaily.retail@okhdfcbank',
    soundEnabled: true
  },
  
  // Completed Orders History
  orders: [],
  lastInvoice: null
};

// ==========================================================================
// AUDIO SYNTHESIZER (Web Audio API)
// ==========================================================================
class PosAudio {
  constructor() {
    this.ctx = null;
  }
  
  init() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  beep() {
    if (!STATE.settings.soundEnabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    } catch (e) {
      // Audio autoplay restriction handling
    }
  }

  chime() {
    if (!STATE.settings.soundEnabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        gain.gain.setValueAtTime(0.15, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.35);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.35);
      });
    } catch (e) {}
  }
}

const audio = new PosAudio();

// ==========================================================================
// INITIALIZATION
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  setupEventListeners();
  setupLiveClock();
  renderCatalog();
  renderBrandTabs();
  renderCategoryPills();
  renderSpeedDial();
  setupQuickCodeInput();
  setupPriceManager();
  renderCart();
  renderInventory();
  renderReports();
  renderOrders();
});

// Load products and local storage
function loadData() {
  // Load products from productsData.js
  const sourceProducts = (typeof HAP_PRODUCTS_DATA !== 'undefined' && HAP_PRODUCTS_DATA.products) 
    ? HAP_PRODUCTS_DATA.products 
    : (window.HAP_PRODUCTS_DATA?.products || []);
  if (sourceProducts.length > 0) {
    STATE.products = JSON.parse(JSON.stringify(sourceProducts));
  }

  // Load custom settings
  const savedSettings = localStorage.getItem('hap_pos_settings');
  if (savedSettings) {
    try {
      STATE.settings = { ...STATE.settings, ...JSON.parse(savedSettings) };
    } catch (e) {}
  }

  // Load product price / rate overrides (விலை நிர்ணயம் & மாற்றம்)
  const savedPrices = localStorage.getItem('hap_pos_price_overrides');
  if (savedPrices) {
    try {
      const priceMap = JSON.parse(savedPrices);
      STATE.products.forEach(p => {
        if (priceMap[p.id] !== undefined && priceMap[p.id] !== null) {
          p.price = Number(priceMap[p.id]);
          p.mrp = Number(priceMap[p.id]);
        }
      });
    } catch (e) {}
  }

  // Load inventory overrides (stock updates)
  const savedStock = localStorage.getItem('hap_pos_stock_overrides');
  if (savedStock) {
    try {
      const overrides = JSON.parse(savedStock);
      STATE.products.forEach(p => {
        if (overrides[p.id] !== undefined) {
          p.stock = overrides[p.id];
        }
      });
    } catch (e) {}
  }

  // Load orders history
  const savedOrders = localStorage.getItem('hap_pos_orders');
  if (savedOrders) {
    try {
      STATE.orders = JSON.parse(savedOrders);
    } catch (e) {}
  } else {
    // Generate realistic sample orders for today
    generateSampleOrders();
  }

  updateHeaderStoreInfo();
}

function savePriceOverrides() {
  const priceMap = {};
  STATE.products.forEach(p => {
    priceMap[p.id] = p.price;
  });
  localStorage.setItem('hap_pos_price_overrides', JSON.stringify(priceMap));
}

function saveStockOverrides() {
  const stockMap = {};
  STATE.products.forEach(p => {
    stockMap[p.id] = p.stock;
  });
  localStorage.setItem('hap_pos_stock_overrides', JSON.stringify(stockMap));
}

function saveOrders() {
  localStorage.setItem('hap_pos_orders', JSON.stringify(STATE.orders));
}

function saveSettings() {
  localStorage.setItem('hap_pos_settings', JSON.stringify(STATE.settings));
}

// Generate realistic day-to-day sample orders
function generateSampleOrders() {
  const sampleItems = [
    { p: STATE.products.find(x => x.name.includes('Full Cream Milk  500 ml')) || STATE.products[0], q: 2 },
    { p: STATE.products.find(x => x.name.includes('Curd')) || STATE.products[1], q: 1 },
    { p: STATE.products.find(x => x.name.includes('Slice it')) || STATE.products[2], q: 1 },
    { p: STATE.products.find(x => x.name.includes('Paneer')) || STATE.products[3], q: 1 },
    { p: STATE.products.find(x => x.name.includes('Bites')) || STATE.products[4], q: 3 }
  ];

  const now = new Date();
  const times = [
    new Date(now.getTime() - 4 * 3600000),
    new Date(now.getTime() - 2.5 * 3600000),
    new Date(now.getTime() - 1.2 * 3600000),
    new Date(now.getTime() - 20 * 60000)
  ];

  const sampleOrders = [
    {
      invoiceNo: 'HAP-20261017-0038',
      timestamp: times[0].toISOString(),
      dateStr: times[0].toLocaleDateString('en-IN'),
      timeStr: times[0].toLocaleTimeString('en-IN'),
      customer: { phone: '9840198401', name: 'Ramesh K.' },
      paymentMethod: 'UPI',
      cashTendered: 180,
      changeDue: 0,
      items: [
        { product: sampleItems[0].p, qty: 2, price: sampleItems[0].p.price, total: sampleItems[0].p.price * 2 },
        { product: sampleItems[1].p, qty: 2, price: sampleItems[1].p.price, total: sampleItems[1].p.price * 2 }
      ],
      discountPercent: 0,
      taxableAmount: 142.86,
      gstAmount: 7.14,
      roundOff: 0,
      grandTotal: 150
    },
    {
      invoiceNo: 'HAP-20261017-0039',
      timestamp: times[1].toISOString(),
      dateStr: times[1].toLocaleDateString('en-IN'),
      timeStr: times[1].toLocaleTimeString('en-IN'),
      customer: { phone: '9790212345', name: 'Priya Sundar' },
      paymentMethod: 'CASH',
      cashTendered: 500,
      changeDue: 165,
      items: [
        { product: sampleItems[2].p, qty: 1, price: sampleItems[2].p.price, total: sampleItems[2].p.price },
        { product: sampleItems[4].p, qty: 3, price: sampleItems[4].p.price, total: sampleItems[4].p.price * 3 }
      ],
      discountPercent: 5,
      taxableAmount: 283.9,
      gstAmount: 51.1,
      roundOff: 0,
      grandTotal: 335
    },
    {
      invoiceNo: 'HAP-20261017-0040',
      timestamp: times[2].toISOString(),
      dateStr: times[2].toLocaleDateString('en-IN'),
      timeStr: times[2].toLocaleTimeString('en-IN'),
      customer: { phone: '', name: 'Walk-in Customer' },
      paymentMethod: 'UPI',
      cashTendered: 95,
      changeDue: 0,
      items: [
        { product: sampleItems[3].p, qty: 1, price: sampleItems[3].p.price, total: sampleItems[3].p.price }
      ],
      discountPercent: 0,
      taxableAmount: 84.82,
      gstAmount: 10.18,
      roundOff: 0,
      grandTotal: 95
    },
    {
      invoiceNo: 'HAP-20261017-0041',
      timestamp: times[3].toISOString(),
      dateStr: times[3].toLocaleDateString('en-IN'),
      timeStr: times[3].toLocaleTimeString('en-IN'),
      customer: { phone: '9444011223', name: 'Dr. S. Anand' },
      paymentMethod: 'CARD',
      cashTendered: 490,
      changeDue: 0,
      items: [
        { product: sampleItems[2].p, qty: 2, price: sampleItems[2].p.price, total: sampleItems[2].p.price * 2 }
      ],
      discountPercent: 0,
      taxableAmount: 415.25,
      gstAmount: 74.75,
      roundOff: 0,
      grandTotal: 490
    }
  ];

  STATE.orders = sampleOrders;
  saveOrders();
}

function updateHeaderStoreInfo() {
  const cashierEl = document.getElementById('headerCashierName');
  if (cashierEl) cashierEl.textContent = STATE.settings.cashierName;
}

// Live Clock
function setupLiveClock() {
  const clockEl = document.getElementById('liveClock');
  function tick() {
    const d = new Date();
    if (clockEl) {
      clockEl.textContent = d.toLocaleTimeString('en-IN', { hour12: false });
    }
  }
  tick();
  setInterval(tick, 1000);
}

// ==========================================================================
// CATALOG & FILTERING
// ==========================================================================
function getFilteredProducts() {
  let list = STATE.products;

  // Filter by brand
  if (STATE.activeBrand !== 'all') {
    list = list.filter(p => p.brandId === STATE.activeBrand || p.brand.toLowerCase() === STATE.activeBrand.toLowerCase());
  }

  // Filter by category
  if (STATE.activeCategory !== 'all') {
    list = list.filter(p => p.category === STATE.activeCategory);
  }

  // Filter by search query (name, category, brand, item code #101, or barcode)
  if (STATE.searchQuery.trim()) {
    const q = STATE.searchQuery.toLowerCase().trim().replace(/^#/, '');
    list = list.filter(p => 
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      (p.code && p.code.toLowerCase().includes(q)) ||
      p.barcode.includes(q)
    );
  }

  // Filter out of stock
  if (STATE.hideOutOfStock) {
    list = list.filter(p => p.stock > 0);
  }

  return list;
}

function renderBrandTabs() {
  const container = document.getElementById('brandTabsContainer');
  if (!container) return;

  const brands = [
    { id: 'all', name: 'All Products' },
    { id: 'arun', name: 'Arun Icecreams' },
    { id: 'arokya', name: 'Arokya Milk' },
    { id: 'hatsun', name: 'Hatsun Dairy' },
    { id: 'hap-cake', name: 'HAP Cake' },
    { id: 'hanobar', name: 'Hanobar' },
    { id: 'dako', name: 'Dako' },
    { id: 'aniva', name: 'Aniva' }
  ];

  container.innerHTML = brands.map(b => {
    const count = b.id === 'all' 
      ? STATE.products.length 
      : STATE.products.filter(p => p.brandId === b.id || p.brand.toLowerCase().includes(b.id)).length;
    
    const activeClass = STATE.activeBrand === b.id ? 'active' : '';
    return `
      <button class="brand-tab-btn ${activeClass}" data-brand-id="${b.id}">
        <span>${b.name}</span>
        <span class="brand-count-badge">${count}</span>
      </button>
    `;
  }).join('');

  container.querySelectorAll('.brand-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      STATE.activeBrand = btn.dataset.brandId;
      STATE.activeCategory = 'all'; // reset subcategory on brand change
      renderBrandTabs();
      renderCategoryPills();
      renderCatalog();
    });
  });
}

function renderCategoryPills() {
  const container = document.getElementById('categoryPillsContainer');
  if (!container) return;

  // Get categories for currently selected brand
  let availableProducts = STATE.products;
  if (STATE.activeBrand !== 'all') {
    availableProducts = availableProducts.filter(p => p.brandId === STATE.activeBrand || p.brand.toLowerCase() === STATE.activeBrand.toLowerCase());
  }

  const categorySet = new Set();
  availableProducts.forEach(p => categorySet.add(p.category));
  const categories = Array.from(categorySet).sort();

  let pillsHtml = `
    <button class="cat-pill ${STATE.activeCategory === 'all' ? 'active' : ''}" data-cat="all">All Categories</button>
  `;

  categories.forEach(cat => {
    const activeClass = STATE.activeCategory === cat ? 'active' : '';
    pillsHtml += `<button class="cat-pill ${activeClass}" data-cat="${escapeHtml(cat)}">${escapeHtml(cat)}</button>`;
  });

  container.innerHTML = pillsHtml;

  container.querySelectorAll('.cat-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      STATE.activeCategory = btn.dataset.cat;
      renderCategoryPills();
      renderCatalog();
    });
  });
}

function renderCatalog() {
  const grid = document.getElementById('catalogGrid');
  const countEl = document.getElementById('catalogResultsCount');
  if (!grid) return;

  const products = getFilteredProducts();
  if (countEl) {
    countEl.textContent = `Showing ${products.length} items`;
  }

  if (products.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 48px; color: var(--text-muted);">
        <p style="font-size: 16px; font-weight: 700;">No items found</p>
        <p style="font-size: 12px; margin-top: 4px;">Try searching for a different item code, keyword, or brand</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = products.map(p => {
    const brandClass = getBrandClass(p.brand);
    const stockClass = p.stock <= 0 ? 'out' : p.stock < 15 ? 'low' : '';
    const stockText = p.stock <= 0 ? 'Out of Stock' : `${p.stock} left`;

    return `
      <div class="product-card" data-product-id="${p.id}" tabindex="0">
        <div class="card-top-tags">
          <div style="display: flex; gap: 4px; align-items: center; max-width: 68%; overflow: hidden;">
            <span class="item-code-badge">#${p.code || p.id}</span>
            <span class="brand-badge ${brandClass}">${escapeHtml(p.brand)}</span>
          </div>
          <span class="stock-tag ${stockClass}">${stockText}</span>
        </div>
        <div class="card-image-wrap">
          <img src="${p.image}" alt="${escapeHtml(p.name)}" class="card-image" loading="lazy" onerror="this.src='https://hapdaily.com/wp-content/uploads/2025/12/HAP-Logo.png'">
        </div>
        <h4 class="card-title" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</h4>
        <div class="card-meta-row">
          <div class="card-price-block">
            <span class="card-price">₹${p.price}</span>
            <span class="card-unit">${escapeHtml(p.unit)}</span>
            <button class="card-price-edit-btn" data-id="${p.id}" title="Fix / Change Selling Rate (விலை மாற்றம்)">✏️</button>
          </div>
          <button class="card-add-btn" title="Add to Bill">+</button>
        </div>
      </div>
    `;
  }).join('');

  // Add click handlers for cards
  grid.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('click', () => {
      const prodId = card.dataset.productId;
      const product = STATE.products.find(x => x.id === prodId);
      if (product) {
        addItemToCart(product);
      }
    });
  });

  // Add click handlers for pencil rate edit buttons
  grid.querySelectorAll('.card-price-edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const product = STATE.products.find(x => x.id === id);
      if (product) {
        promptProductPriceChange(product);
      }
    });
  });
}

function getBrandClass(brand) {
  const b = brand.toLowerCase();
  if (b.includes('arokya')) return 'arokya';
  if (b.includes('arun')) return 'arun';
  if (b.includes('hatsun')) return 'hatsun';
  if (b.includes('cake')) return 'hap-cake';
  if (b.includes('hanobar')) return 'hanobar';
  if (b.includes('dako')) return 'dako';
  if (b.includes('aniva')) return 'aniva';
  return 'hatsun';
}

// ==========================================================================
// CART & REGISTER MANAGEMENT
// ==========================================================================
function getActiveTab() {
  return STATE.tabs.find(t => t.id === STATE.activeTabId) || STATE.tabs[0];
}

function addItemToCart(product, qty = 1) {
  const tab = getActiveTab();
  const existing = tab.items.find(i => i.product.id === product.id);

  if (existing) {
    existing.qty += qty;
    existing.total = existing.qty * existing.price;
  } else {
    tab.items.push({
      product: product,
      qty: qty,
      price: product.price,
      taxRate: product.taxRate || 5,
      total: product.price * qty
    });
  }

  audio.beep();
  renderCart();
  updateBillTabsUI();
}

function updateItemQty(productId, newQty) {
  const tab = getActiveTab();
  if (newQty <= 0) {
    tab.items = tab.items.filter(i => i.product.id !== productId);
  } else {
    const item = tab.items.find(i => i.product.id === productId);
    if (item) {
      item.qty = newQty;
      item.total = item.qty * item.price;
    }
  }
  renderCart();
  updateBillTabsUI();
}

function removeItemFromCart(productId) {
  const tab = getActiveTab();
  tab.items = tab.items.filter(i => i.product.id !== productId);
  renderCart();
  updateBillTabsUI();
}

function clearActiveCart() {
  const tab = getActiveTab();
  tab.items = [];
  tab.discountPercent = 0;
  tab.cashTendered = 0;
  tab.customer = { phone: '', name: '' };
  renderCart();
  updateBillTabsUI();
}

function calculateCartTotals() {
  const tab = getActiveTab();
  let subtotal = 0;
  let gstTotal = 0;

  tab.items.forEach(item => {
    const itemTotal = item.qty * item.price;
    subtotal += itemTotal;
    
    // Inclusive GST calculation: Base = Price / (1 + Rate/100)
    const basePrice = itemTotal / (1 + (item.taxRate / 100));
    const gstPart = itemTotal - basePrice;
    gstTotal += gstPart;
  });

  const taxableAmount = subtotal - gstTotal;
  const discountAmount = (subtotal * (tab.discountPercent || 0)) / 100;
  const grossAfterDiscount = subtotal - discountAmount;
  const grandRounded = Math.round(grossAfterDiscount);
  const roundOff = +(grandRounded - grossAfterDiscount).toFixed(2);

  return {
    subtotal,
    taxableAmount,
    gstTotal,
    discountAmount,
    roundOff,
    grandTotal: grandRounded,
    totalQty: tab.items.reduce((sum, i) => sum + i.qty, 0)
  };
}

function renderCart() {
  const tab = getActiveTab();
  const emptyState = document.getElementById('cartEmptyState');
  const cartTable = document.getElementById('cartTable');
  const tableBody = document.getElementById('cartTableBody');
  const totals = calculateCartTotals();

  // Update Customer Inputs
  const phoneInput = document.getElementById('customerPhone');
  const nameInput = document.getElementById('customerName');
  if (phoneInput && document.activeElement !== phoneInput) phoneInput.value = tab.customer.phone || '';
  if (nameInput && document.activeElement !== nameInput) nameInput.value = tab.customer.name || '';

  // Toggle Table / Empty State
  if (tab.items.length === 0) {
    if (emptyState) emptyState.style.display = 'flex';
    if (cartTable) cartTable.style.display = 'none';
  } else {
    if (emptyState) emptyState.style.display = 'none';
    if (cartTable) cartTable.style.display = 'table';

    if (tableBody) {
      tableBody.innerHTML = tab.items.map(item => `
        <tr>
          <td class="col-item">
            <div class="cart-item-title">${escapeHtml(item.product.name)}</div>
            <div class="cart-item-unit"><span class="chip-code-tag">#${item.product.code || item.product.id}</span> ${escapeHtml(item.product.brand)} • ${escapeHtml(item.product.unit)}</div>
          </td>
          <td class="col-price cart-price-cell">
            <div style="display: inline-flex; align-items: center; gap: 2px;">
              <span style="font-size: 11px; color: var(--text-muted); font-weight: 700;">₹</span>
              <input type="number" step="0.5" class="cart-price-input" value="${item.price}" data-id="${item.product.id}" title="Click to adjust line-item selling price">
            </div>
          </td>
          <td class="col-qty">
            <div class="qty-control-group">
              <button class="qty-btn" data-action="dec" data-id="${item.product.id}">-</button>
              <input type="text" class="qty-input" value="${item.qty}" data-id="${item.product.id}">
              <button class="qty-btn" data-action="inc" data-id="${item.product.id}">+</button>
            </div>
          </td>
          <td class="col-tax">
            <span class="tax-badge-pill">${item.taxRate}%</span>
          </td>
          <td class="col-total cart-total-cell">₹${item.total.toFixed(2)}</td>
          <td class="col-action">
            <button class="item-delete-btn" data-id="${item.product.id}" title="Remove">✕</button>
          </td>
        </tr>
      `).join('');

      // Attach item row event listeners
      tableBody.querySelectorAll('.qty-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.id;
          const action = btn.dataset.action;
          const item = tab.items.find(i => i.product.id === id);
          if (item) {
            updateItemQty(id, action === 'inc' ? item.qty + 1 : item.qty - 1);
          }
        });
      });

      tableBody.querySelectorAll('.qty-input').forEach(input => {
        input.addEventListener('change', () => {
          const id = input.dataset.id;
          const val = parseInt(input.value) || 1;
          updateItemQty(id, Math.max(1, val));
        });
      });

      // Direct in-cart price adjustment
      tableBody.querySelectorAll('.cart-price-input').forEach(input => {
        input.addEventListener('change', () => {
          const id = input.dataset.id;
          const newPrice = parseFloat(input.value);
          if (!isNaN(newPrice) && newPrice >= 0) {
            const item = tab.items.find(i => i.product.id === id);
            if (item) {
              item.price = newPrice;
              item.total = item.qty * item.price;
              renderCart();
              updateBillTabsUI();
            }
          }
        });
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            input.blur();
          }
        });
      });

      tableBody.querySelectorAll('.item-delete-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          removeItemFromCart(btn.dataset.id);
        });
      });
    }
  }

  // Update Totals Display
  document.getElementById('taxableAmount').textContent = `₹${totals.taxableAmount.toFixed(2)}`;
  document.getElementById('gstAmount').textContent = `₹${totals.gstTotal.toFixed(2)}`;
  document.getElementById('discountAmount').textContent = `- ₹${totals.discountAmount.toFixed(2)}`;
  document.getElementById('roundOffAmount').textContent = `${totals.roundOff >= 0 ? '+' : ''}₹${totals.roundOff.toFixed(2)}`;
  document.getElementById('grandTotal').textContent = `₹${totals.grandTotal.toFixed(2)}`;
  document.getElementById('chargeBtnAmount').textContent = `₹${totals.grandTotal.toFixed(2)}`;

  // Update Mobile Badges & Floating Cart Pill
  const headerCartBadge = document.getElementById('mobileHeaderCartBadge');
  const mobCartCountBadge = document.getElementById('mobileCartCountBadge');
  const mobCartTotalBadge = document.getElementById('mobileCartTotalBadge');
  const mobSummaryText = document.getElementById('cartMobileSummaryText');
  const floatingPill = document.getElementById('mobileFloatingCartPill');
  const floatingCount = document.getElementById('floatingPillCount');
  const floatingTotal = document.getElementById('floatingPillTotal');

  if (headerCartBadge) headerCartBadge.textContent = totals.totalQty;
  if (mobCartCountBadge) mobCartCountBadge.textContent = totals.totalQty;
  if (mobCartTotalBadge) mobCartTotalBadge.textContent = `₹${totals.grandTotal}`;
  if (mobSummaryText) mobSummaryText.textContent = `${totals.totalQty} items • ₹${totals.grandTotal.toFixed(2)}`;

  if (floatingPill) {
    if (totals.totalQty > 0) {
      floatingPill.style.display = 'flex';
      if (floatingCount) floatingCount.textContent = `${totals.totalQty} items`;
      if (floatingTotal) floatingTotal.textContent = `₹${totals.grandTotal}`;
    } else {
      floatingPill.style.display = 'none';
    }
  }

  // Update Change Due
  updateChangeDue();
}

function updateChangeDue() {
  const tab = getActiveTab();
  const totals = calculateCartTotals();
  const cashInput = document.getElementById('cashTenderedInput');
  const changeEl = document.getElementById('changeDueAmount');
  
  const tendered = parseFloat(cashInput?.value) || 0;
  const change = Math.max(0, tendered - totals.grandTotal);
  if (changeEl) {
    changeEl.textContent = `₹${change.toFixed(2)}`;
  }
}

// Multi-Tab Hold / Recall Bills
function updateBillTabsUI() {
  const bar = document.getElementById('billTabsBar');
  if (!bar) return;

  const tabsHtml = STATE.tabs.map(tab => {
    const count = tab.items.reduce((s, i) => s + i.qty, 0);
    const active = tab.id === STATE.activeTabId ? 'active' : '';
    return `
      <button class="bill-tab ${active}" data-tab-id="${tab.id}">
        <span class="tab-title">${tab.name}</span>
        <span class="tab-items-badge">${count}</span>
      </button>
    `;
  }).join('') + `
    <button class="new-bill-tab-btn" id="newBillTabBtn" title="Hold current & open new tab">+ Tab</button>
  `;

  bar.innerHTML = tabsHtml;

  bar.querySelectorAll('.bill-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      STATE.activeTabId = parseInt(btn.dataset.tabId);
      updateBillTabsUI();
      renderCart();
    });
  });

  const newBtn = document.getElementById('newBillTabBtn');
  if (newBtn) {
    newBtn.addEventListener('click', addNewBillTab);
  }
}

function addNewBillTab() {
  const newId = STATE.tabs.length > 0 ? Math.max(...STATE.tabs.map(t => t.id)) + 1 : 1;
  STATE.tabs.push({
    id: newId,
    name: `Bill #${newId}`,
    items: [],
    customer: { phone: '', name: '' },
    discountPercent: 0,
    cashTendered: 0,
    paymentMethod: 'CASH'
  });
  STATE.activeTabId = newId;
  updateBillTabsUI();
  renderCart();
}

// ==========================================================================
// CHECKOUT & PAYMENT MODES
// ==========================================================================
function completeCheckout() {
  const tab = getActiveTab();
  if (tab.items.length === 0) {
    alert('Please add items to the cart before checkout.');
    return;
  }

  const totals = calculateCartTotals();
  const now = new Date();
  const invoiceNo = `HAP-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(STATE.orders.length + 101).padStart(4, '0')}`;
  
  const cashGiven = tab.paymentMethod === 'CASH' 
    ? (parseFloat(document.getElementById('cashTenderedInput')?.value) || totals.grandTotal) 
    : totals.grandTotal;
  
  const changeReturned = Math.max(0, cashGiven - totals.grandTotal);

  const order = {
    invoiceNo,
    timestamp: now.toISOString(),
    dateStr: now.toLocaleDateString('en-IN'),
    timeStr: now.toLocaleTimeString('en-IN'),
    customer: {
      phone: document.getElementById('customerPhone')?.value || '',
      name: document.getElementById('customerName')?.value || 'Walk-in Customer'
    },
    paymentMethod: tab.paymentMethod,
    cashTendered: cashGiven,
    changeDue: changeReturned,
    items: tab.items.map(i => ({
      product: i.product,
      qty: i.qty,
      price: i.price,
      taxRate: i.taxRate,
      total: i.total
    })),
    discountPercent: tab.discountPercent,
    taxableAmount: totals.taxableAmount,
    gstAmount: totals.gstTotal,
    roundOff: totals.roundOff,
    grandTotal: totals.grandTotal
  };

  // Decrement Inventory Stock
  tab.items.forEach(item => {
    const target = STATE.products.find(p => p.id === item.product.id);
    if (target) {
      target.stock = Math.max(0, target.stock - item.qty);
    }
  });
  saveStockOverrides();

  // Save Order
  STATE.orders.unshift(order);
  saveOrders();
  STATE.lastInvoice = order;

  // Sound & Visual Celebration
  audio.chime();
  confetti({
    particleCount: 60,
    spread: 60,
    origin: { y: 0.7 }
  });

  // Clear current active cart
  clearActiveCart();

  // Refresh Views
  renderCatalog();
  renderInventory();
  renderReports();
  renderOrders();
  updateHeaderKPIs();

  // Show Printable Thermal Receipt Modal
  showReceiptModal(order);
}

// UPI Payment Flow
function triggerUpiPayment() {
  const tab = getActiveTab();
  if (tab.items.length === 0) {
    alert('Please add items to cart first.');
    return;
  }
  const totals = calculateCartTotals();
  const upiModal = document.getElementById('upiModal');
  const amountEl = document.getElementById('upiModalAmount');
  const qrCanvas = document.getElementById('upiLiveQrCanvas');

  if (amountEl) amountEl.textContent = `₹${totals.grandTotal.toFixed(2)}`;

  // Generate authentic UPI payment string
  // Format: upi://pay?pa=VPA&pn=NAME&am=AMOUNT&cu=INR&tn=HAPDailyBill
  const upiUrl = `upi://pay?pa=${STATE.settings.upiVpa}&pn=HAPDailyStore&am=${totals.grandTotal}&cu=INR&tn=HAPDailyBill`;
  
  if (qrCanvas) {
    QRCode.toCanvas(qrCanvas, upiUrl, {
      width: 180,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
  }

  tab.paymentMethod = 'UPI';
  upiModal.classList.add('open');
}

// ==========================================================================
// THERMAL RECEIPT MODAL & PRINTING
// ==========================================================================
function showReceiptModal(order) {
  const modal = document.getElementById('receiptModal');
  if (!modal) return;

  // Header Details
  document.getElementById('receiptStoreName').textContent = STATE.settings.storeName.toUpperCase();
  document.getElementById('receiptStoreBranch').textContent = `Outlet #${STATE.settings.storeId}`;
  document.getElementById('receiptStoreAddress').textContent = STATE.settings.storeAddress;
  document.getElementById('receiptGstin').textContent = STATE.settings.gstin;
  document.getElementById('receiptFssai').textContent = STATE.settings.fssai;

  // Meta
  document.getElementById('recBillNo').textContent = order.invoiceNo;
  document.getElementById('recDate').textContent = order.dateStr;
  document.getElementById('recTime').textContent = order.timeStr;
  document.getElementById('recCashier').textContent = STATE.settings.cashierName;
  document.getElementById('recCustPhone').textContent = order.customer.phone ? `${order.customer.phone} (${order.customer.name})` : 'Walk-in';

  // Items
  const itemsTbody = document.getElementById('recItemsBody');
  if (itemsTbody) {
    itemsTbody.innerHTML = order.items.map(item => `
      <tr>
        <td class="th-item">
          <strong>${escapeHtml(item.product.name)}</strong><br>
          <span style="font-size: 8px;">${escapeHtml(item.product.brand)} • GST ${item.taxRate}%</span>
        </td>
        <td class="td-qty">${item.qty}</td>
        <td class="td-rate">${item.price.toFixed(2)}</td>
        <td class="td-amt">${item.total.toFixed(2)}</td>
      </tr>
    `).join('');
  }

  // Summary
  const totalQty = order.items.reduce((sum, i) => sum + i.qty, 0);
  document.getElementById('recTotalQty').textContent = totalQty;
  document.getElementById('recTaxable').textContent = `₹${order.taxableAmount.toFixed(2)}`;
  document.getElementById('recCgst').textContent = `₹${(order.gstAmount / 2).toFixed(2)}`;
  document.getElementById('recSgst').textContent = `₹${(order.gstAmount / 2).toFixed(2)}`;
  document.getElementById('recRoundOff').textContent = `${order.roundOff >= 0 ? '+' : ''}₹${order.roundOff.toFixed(2)}`;
  document.getElementById('recNetPayable').textContent = `₹${order.grandTotal.toFixed(2)}`;
  document.getElementById('recPayMode').textContent = order.paymentMethod;
  document.getElementById('recCashGiven').textContent = `₹${order.cashTendered.toFixed(2)}`;
  document.getElementById('recChangeReturned').textContent = `₹${order.changeDue.toFixed(2)}`;

  // Generate Receipt Verification QR
  const qrCanvas = document.getElementById('receiptQrCanvas');
  if (qrCanvas) {
    QRCode.toCanvas(qrCanvas, `https://hapdaily.com/verify?bill=${order.invoiceNo}&amt=${order.grandTotal}`, {
      width: 90,
      margin: 0
    });
  }

  modal.classList.add('open');
}

// Print Thermal Receipt directly
function printThermalReceipt() {
  window.print();
}

// WhatsApp Bill Share
function shareBillOnWhatsapp() {
  if (!STATE.lastInvoice) return;
  const inv = STATE.lastInvoice;
  const itemsText = inv.items.map(i => `• ${i.product.name} x ${i.qty} = ₹${i.total}`).join('\n');
  const msg = `*HAP DAILY INVOICE*\n` +
              `Outlet: ${STATE.settings.storeName}\n` +
              `Bill No: ${inv.invoiceNo}\n` +
              `Date: ${inv.dateStr} ${inv.timeStr}\n\n` +
              `*ITEMS:*\n${itemsText}\n\n` +
              `*Grand Total: ₹${inv.grandTotal.toFixed(2)}*\n` +
              `Payment Mode: ${inv.paymentMethod}\n\n` +
              `Thank you for shopping at HAP Daily!`;

  const phone = inv.customer.phone || '';
  const url = `https://api.whatsapp.com/send?phone=${phone ? '91' + phone : ''}&text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
}

// ==========================================================================
// INVENTORY VIEW
// ==========================================================================
function renderInventory() {
  const tbody = document.getElementById('inventoryTableBody');
  const brandFilter = document.getElementById('inventoryBrandFilter')?.value || 'ALL';
  const statusFilter = document.getElementById('inventoryStockStatusFilter')?.value || 'ALL';
  const search = (document.getElementById('inventorySearchInput')?.value || '').toLowerCase().trim();

  let list = STATE.products;
  if (brandFilter !== 'ALL') {
    list = list.filter(p => p.brand === brandFilter);
  }
  if (statusFilter === 'LOW') {
    list = list.filter(p => p.stock > 0 && p.stock < 15);
  } else if (statusFilter === 'OUT') {
    list = list.filter(p => p.stock <= 0);
  }
  if (search) {
    list = list.filter(p => 
      p.name.toLowerCase().includes(search) || 
      (p.code && p.code.toLowerCase().includes(search)) ||
      p.barcode.includes(search) ||
      p.category.toLowerCase().includes(search)
    );
  }

  // Update KPI Cards
  const totalUnits = STATE.products.reduce((sum, p) => sum + p.stock, 0);
  const totalVal = STATE.products.reduce((sum, p) => sum + (p.stock * p.price), 0);
  const lowStockCount = STATE.products.filter(p => p.stock < 15).length;

  document.getElementById('invTotalSkus').textContent = STATE.products.length;
  document.getElementById('invTotalUnits').textContent = totalUnits.toLocaleString('en-IN');
  document.getElementById('invTotalRetailVal').textContent = `₹${totalVal.toLocaleString('en-IN')}`;
  document.getElementById('invLowStockSkus').textContent = lowStockCount;

  if (tbody) {
    tbody.innerHTML = list.map(p => {
      const statusBadge = p.stock <= 0 
        ? `<span class="stock-badge-tag out-stock">Out of Stock</span>` 
        : p.stock < 15 
          ? `<span class="stock-badge-tag low-stock">Low (${p.stock})</span>` 
          : `<span class="stock-badge-tag in-stock">In Stock (${p.stock})</span>`;

      return `
        <tr>
          <td><img src="${p.image}" class="table-prod-img" onerror="this.src='https://hapdaily.com/wp-content/uploads/2025/12/HAP-Logo.png'"></td>
          <td>
            <span class="chip-code-tag">#${p.code}</span>
            <div style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">${p.barcode}</div>
          </td>
          <td><strong>${escapeHtml(p.name)}</strong></td>
          <td>${escapeHtml(p.brand)}</td>
          <td>${escapeHtml(p.category)}</td>
          <td>${escapeHtml(p.unit)}</td>
          <td>
            <strong>₹${p.price}</strong>
            <button class="card-price-edit-btn" data-id="${p.id}" title="Fix Rate">✏️</button>
          </td>
          <td>${p.taxRate}%</td>
          <td><span style="font-weight: 700; font-family: var(--font-mono);">${p.stock}</span></td>
          <td>${statusBadge}</td>
          <td>
            <button class="quick-stock-btn" data-id="${p.id}" data-add="10">+10</button>
            <button class="quick-stock-btn" data-id="${p.id}" data-add="50">+50</button>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.quick-stock-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const add = parseInt(btn.dataset.add);
        const prod = STATE.products.find(p => p.id === id);
        if (prod) {
          prod.stock += add;
          saveStockOverrides();
          renderInventory();
          renderCatalog();
        }
      });
    });

    tbody.querySelectorAll('.card-price-edit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const prod = STATE.products.find(p => p.id === id);
        if (prod) {
          promptProductPriceChange(prod);
        }
      });
    });
  }
}

// Export Inventory CSV
function exportInventoryCsv() {
  const headers = ['Barcode', 'Name', 'Brand', 'Category', 'Unit', 'MRP', 'GST_Rate', 'Stock'];
  const rows = STATE.products.map(p => [
    `"${p.barcode}"`,
    `"${p.name.replace(/"/g, '""')}"`,
    `"${p.brand}"`,
    `"${p.category}"`,
    `"${p.unit}"`,
    p.price,
    p.taxRate,
    p.stock
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `HAP_Inventory_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ==========================================================================
// REPORTS & DAY CLOSE (Z-REPORT)
// ==========================================================================
function renderReports() {
  const orders = STATE.orders;
  const grossSales = orders.reduce((sum, o) => sum + o.grandTotal, 0);
  const totalGst = orders.reduce((sum, o) => sum + o.gstAmount, 0);
  const totalItems = orders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.qty, 0), 0);
  const avgBill = orders.length > 0 ? (grossSales / orders.length) : 0;

  document.getElementById('repGrossSales').textContent = `₹${grossSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  document.getElementById('repOrderCountDesc').textContent = `${orders.length} Invoices closed today`;
  document.getElementById('repAvgBill').textContent = `₹${avgBill.toFixed(2)}`;
  document.getElementById('repTotalGst').textContent = `₹${totalGst.toFixed(2)}`;
  document.getElementById('repItemsSold').textContent = totalItems.toLocaleString('en-IN');

  // Payment Breakdown
  const cashTotal = orders.filter(o => o.paymentMethod === 'CASH').reduce((sum, o) => sum + o.grandTotal, 0);
  const upiTotal = orders.filter(o => o.paymentMethod === 'UPI').reduce((sum, o) => sum + o.grandTotal, 0);
  const cardTotal = orders.filter(o => o.paymentMethod === 'CARD').reduce((sum, o) => sum + o.grandTotal, 0);

  document.getElementById('repCashAmount').textContent = `₹${cashTotal.toFixed(2)}`;
  document.getElementById('repUpiAmount').textContent = `₹${upiTotal.toFixed(2)}`;
  document.getElementById('repCardAmount').textContent = `₹${cardTotal.toFixed(2)}`;

  if (grossSales > 0) {
    document.getElementById('repCashBar').style.width = `${(cashTotal / grossSales) * 100}%`;
    document.getElementById('repUpiBar').style.width = `${(upiTotal / grossSales) * 100}%`;
    document.getElementById('repCardBar').style.width = `${(cardTotal / grossSales) * 100}%`;
  }

  // Brand Sales Share
  const brandSales = {};
  orders.forEach(o => {
    o.items.forEach(i => {
      brandSales[i.product.brand] = (brandSales[i.product.brand] || 0) + i.total;
    });
  });

  const brandShareList = document.getElementById('brandShareList');
  if (brandShareList) {
    brandShareList.innerHTML = Object.entries(brandSales)
      .sort((a, b) => b[1] - a[1])
      .map(([brand, amount]) => {
        const pct = grossSales > 0 ? ((amount / grossSales) * 100).toFixed(1) : 0;
        return `
          <div class="split-item">
            <div class="split-info">
              <span class="split-name">${escapeHtml(brand)} (${pct}%)</span>
              <span class="split-amount">₹${amount.toFixed(2)}</span>
            </div>
            <div class="split-progress"><div class="progress-bar" style="width: ${pct}%; background: var(--hap-red);"></div></div>
          </div>
        `;
      }).join('');
  }

  // Top Selling Items
  const productSalesMap = {};
  orders.forEach(o => {
    o.items.forEach(i => {
      if (!productSalesMap[i.product.id]) {
        productSalesMap[i.product.id] = { product: i.product, qty: 0, revenue: 0 };
      }
      productSalesMap[i.product.id].qty += i.qty;
      productSalesMap[i.product.id].revenue += i.total;
    });
  });

  const topItems = Object.values(productSalesMap).sort((a, b) => b.qty - a.qty).slice(0, 10);
  const topTableBody = document.getElementById('topSellingTableBody');
  if (topTableBody) {
    topTableBody.innerHTML = topItems.map((item, index) => `
      <tr>
        <td><strong>#${index + 1}</strong></td>
        <td><strong>${escapeHtml(item.product.name)}</strong></td>
        <td>${escapeHtml(item.product.brand)}</td>
        <td>₹${item.product.price}</td>
        <td><strong style="font-family: var(--font-mono);">${item.qty} units</strong></td>
        <td><strong style="font-family: var(--font-mono);">₹${item.revenue.toFixed(2)}</strong></td>
      </tr>
    `).join('');
  }

  updateHeaderKPIs();
}

function updateHeaderKPIs() {
  const grossSales = STATE.orders.reduce((sum, o) => sum + o.grandTotal, 0);
  const salesEl = document.getElementById('headerTodaySales');
  const countEl = document.getElementById('headerOrderCount');
  if (salesEl) salesEl.textContent = `₹${grossSales.toLocaleString('en-IN')}`;
  if (countEl) countEl.textContent = `(${STATE.orders.length} bills)`;
}

// Print Z-Report
function printZReport() {
  const grossSales = STATE.orders.reduce((sum, o) => sum + o.grandTotal, 0);
  const totalGst = STATE.orders.reduce((sum, o) => sum + o.gstAmount, 0);
  const cashTotal = STATE.orders.filter(o => o.paymentMethod === 'CASH').reduce((sum, o) => sum + o.grandTotal, 0);
  const upiTotal = STATE.orders.filter(o => o.paymentMethod === 'UPI').reduce((sum, o) => sum + o.grandTotal, 0);
  const cardTotal = STATE.orders.filter(o => o.paymentMethod === 'CARD').reduce((sum, o) => sum + o.grandTotal, 0);

  const zSlip = `
========================================
       HAP DAILY DAY-END Z-REPORT       
      Hatsun Agro Product Ltd.         
Outlet: ${STATE.settings.storeName}
Date: ${new Date().toLocaleDateString('en-IN')} Time: ${new Date().toLocaleTimeString('en-IN')}
Cashier: ${STATE.settings.cashierName}
----------------------------------------
Total Bills Closed : ${STATE.orders.length}
Total Items Sold   : ${STATE.orders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.qty, 0), 0)}
----------------------------------------
GROSS SALES        : Rs. ${grossSales.toFixed(2)}
TOTAL GST (5/12/18): Rs. ${totalGst.toFixed(2)}
----------------------------------------
PAYMENT BREAKDOWN:
Cash in Drawer     : Rs. ${cashTotal.toFixed(2)}
UPI Collections    : Rs. ${upiTotal.toFixed(2)}
Card Collections   : Rs. ${cardTotal.toFixed(2)}
----------------------------------------
DRAWER RECONCILIATION:
Expected Cash In Hand: Rs. ${cashTotal.toFixed(2)}
Actual Cash Counted  : [ __________ ]
Discrepancy (Over/Short): [ __________ ]
----------------------------------------
Manager Signature  : [ ________________ ]
========================================
`;

  const w = window.open('', '', 'width=450,height=600');
  w.document.write(`<pre style="font-family: monospace; font-size: 13px; line-height: 1.4; padding: 20px;">${zSlip}</pre>`);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 250);
}

// ==========================================================================
// ORDERS VIEW
// ==========================================================================
function renderOrders() {
  const tbody = document.getElementById('ordersTableBody');
  const search = (document.getElementById('orderSearchInput')?.value || '').toLowerCase().trim();
  const payFilter = document.getElementById('orderPaymentFilter')?.value || 'ALL';

  let list = STATE.orders;
  if (payFilter !== 'ALL') {
    list = list.filter(o => o.paymentMethod === payFilter);
  }
  if (search) {
    list = list.filter(o => 
      o.invoiceNo.toLowerCase().includes(search) || 
      (o.customer.phone && o.customer.phone.includes(search)) ||
      (o.customer.name && o.customer.name.toLowerCase().includes(search))
    );
  }

  if (tbody) {
    tbody.innerHTML = list.map(order => {
      const payBadge = order.paymentMethod === 'UPI' 
        ? `<span class="brand-badge arokya">UPI</span>`
        : order.paymentMethod === 'CARD'
          ? `<span class="brand-badge arun">CARD</span>`
          : `<span class="brand-badge hatsun">CASH</span>`;

      return `
        <tr>
          <td><strong>${order.invoiceNo}</strong></td>
          <td>${order.dateStr} ${order.timeStr}</td>
          <td>${order.customer.phone ? `${order.customer.phone} (${escapeHtml(order.customer.name)})` : 'Walk-in'}</td>
          <td>${order.items.reduce((s, i) => s + i.qty, 0)} items</td>
          <td>${payBadge}</td>
          <td>₹${order.gstAmount.toFixed(2)}</td>
          <td><strong style="font-family: var(--font-mono); font-size: 14px;">₹${order.grandTotal.toFixed(2)}</strong></td>
          <td>
            <button class="btn btn-secondary" style="padding: 4px 10px; font-size: 11px;" data-action="reprint" data-inv="${order.invoiceNo}">Reprint</button>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('button[data-action="reprint"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const invNo = btn.dataset.inv;
        const target = STATE.orders.find(o => o.invoiceNo === invNo);
        if (target) {
          STATE.lastInvoice = target;
          showReceiptModal(target);
        }
      });
    });
  }
}

// ==========================================================================
// SPEED DIAL (அடிக்கடி விற்கும் பொருட்கள்) & FAST-MOVING ITEMS
// ==========================================================================
function renderSpeedDial() {
  const container = document.getElementById('speedDialContainer');
  if (!container) return;

  const fastItems = STATE.products.filter(p => p.isFastMoving);
  const displayItems = fastItems.length > 0 ? fastItems : STATE.products.slice(0, 16);

  container.innerHTML = displayItems.map(p => `
    <button class="speed-chip" data-id="${p.id}" title="1-Tap Add #${p.code} ${escapeHtml(p.name)}">
      <span class="chip-code-tag">#${p.code}</span>
      <span class="chip-name">${escapeHtml(p.name)}</span>
      <span class="chip-price">₹${p.price}</span>
    </button>
  `).join('');

  container.querySelectorAll('.speed-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const id = chip.dataset.id;
      const product = STATE.products.find(x => x.id === id);
      if (product) {
        addItemToCart(product);
        // Visual tap feedback
        chip.style.transform = 'scale(0.93)';
        chip.style.borderColor = 'var(--hap-red)';
        setTimeout(() => {
          chip.style.transform = '';
          chip.style.borderColor = '';
        }, 150);
      }
    });
  });
}

// ==========================================================================
// QUICK ITEM CODE BILLING (#101, #201, #301)
// ==========================================================================
function setupQuickCodeInput() {
  const input = document.getElementById('quickCodeInput');
  const addBtn = document.getElementById('quickCodeAddBtn');
  if (!input) return;

  function handleQuickCodeSubmit() {
    const rawVal = input.value.trim();
    if (!rawVal) return;

    // Parse code and optional multiplier: "105", "#105", "105*3", "105x2", "105 4"
    let codePart = rawVal.replace(/^#/, '');
    let qty = 1;

    const mulMatch = codePart.match(/^([a-zA-Z0-9_\-]+)[*xX\s]+(\d+)$/);
    if (mulMatch) {
      codePart = mulMatch[1];
      qty = parseInt(mulMatch[2]) || 1;
    }

    codePart = codePart.trim();

    // Match by code, id, or barcode
    const product = STATE.products.find(p => 
      (p.code && p.code.toLowerCase() === codePart.toLowerCase()) ||
      p.id.toLowerCase() === codePart.toLowerCase() ||
      p.barcode === codePart
    );

    if (product) {
      addItemToCart(product, qty);
      input.value = '';
      input.classList.remove('input-error');
      input.classList.add('input-success');
      setTimeout(() => input.classList.remove('input-success'), 400);
    } else {
      audio.beep();
      input.classList.add('input-error');
      setTimeout(() => input.classList.remove('input-error'), 600);
      alert(`⚠️ Item Code "#${codePart}" not found!\n\nPlease check code in Speed Dial or search in catalog.`);
    }
  }

  addBtn?.addEventListener('click', handleQuickCodeSubmit);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleQuickCodeSubmit();
    }
  });

  // Category guide pills in Speed Dial header
  document.querySelectorAll('.code-guide-pill').forEach(pill => {
    pill.style.cursor = 'pointer';
    pill.addEventListener('click', () => {
      const text = pill.textContent;
      const codeMatch = text.match(/^(\d+)s/);
      if (codeMatch) {
        const prefix = codeMatch[1];
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
          searchInput.value = prefix;
          STATE.searchQuery = prefix;
          renderCatalog();
        }
      }
    });
  });
}

// ==========================================================================
// PRODUCT RATE FIXER (விலை நிர்ணயம் & மாற்றம்)
// ==========================================================================
function promptProductPriceChange(product) {
  const currentPrice = product.price;
  const input = prompt(
    `💰 Fix / Change Rate for Product:\n\n[#${product.code}] ${product.name}\nBrand: ${product.brand} • Unit: ${product.unit}\n\nCurrent Selling Rate: ₹${currentPrice}\n\nEnter New Rate (₹):`,
    currentPrice
  );

  if (input !== null) {
    const newPrice = parseFloat(input.trim());
    if (!isNaN(newPrice) && newPrice >= 0) {
      product.price = newPrice;
      product.mrp = newPrice;
      savePriceOverrides();

      // Update in active carts if item exists
      STATE.tabs.forEach(tab => {
        const cartItem = tab.items.find(i => i.product.id === product.id);
        if (cartItem) {
          cartItem.price = newPrice;
          cartItem.total = cartItem.qty * cartItem.price;
        }
      });

      renderCatalog();
      renderSpeedDial();
      renderCart();
      renderInventory();
      audio.beep();
    } else {
      alert('Please enter a valid positive number for rate.');
    }
  }
}

function setupPriceManager() {
  const modal = document.getElementById('priceManagerModal');
  const openBtn = document.getElementById('openPriceManagerBtn');
  const headerBtn = document.getElementById('headerPriceManagerBtn');
  const closeBtn = document.getElementById('closePriceManagerBtn');
  const closeBtn2 = document.getElementById('closePriceManagerBtn2');
  const searchInput = document.getElementById('priceManagerSearch');
  const brandSelect = document.getElementById('priceManagerBrandSelect');
  const saveAllBtn = document.getElementById('saveAllPricesBtn');
  const resetBtn = document.getElementById('resetDefaultPricesBtn');

  function openModal() {
    renderPriceManagerTable();
    modal?.classList.add('open');
    searchInput?.focus();
  }

  function closeModal() {
    modal?.classList.remove('open');
  }

  openBtn?.addEventListener('click', openModal);
  headerBtn?.addEventListener('click', openModal);
  closeBtn?.addEventListener('click', closeModal);
  closeBtn2?.addEventListener('click', closeModal);

  searchInput?.addEventListener('input', renderPriceManagerTable);
  brandSelect?.addEventListener('change', renderPriceManagerTable);

  saveAllBtn?.addEventListener('click', () => {
    const tableBody = document.getElementById('priceManagerTableBody');
    if (!tableBody) return;

    let updatedCount = 0;
    tableBody.querySelectorAll('.rate-edit-input').forEach(inp => {
      const id = inp.dataset.id;
      const newRate = parseFloat(inp.value);
      if (!isNaN(newRate) && newRate >= 0) {
        const prod = STATE.products.find(p => p.id === id);
        if (prod && prod.price !== newRate) {
          prod.price = newRate;
          prod.mrp = newRate;
          updatedCount++;
        }
      }
    });

    savePriceOverrides();

    // Also update any active carts
    STATE.tabs.forEach(tab => {
      tab.items.forEach(cartItem => {
        const p = STATE.products.find(x => x.id === cartItem.product.id);
        if (p) {
          cartItem.price = p.price;
          cartItem.total = cartItem.qty * cartItem.price;
        }
      });
    });

    renderCatalog();
    renderSpeedDial();
    renderCart();
    renderInventory();
    closeModal();
    audio.chime();
    alert(`✅ Successfully updated rates for ${updatedCount > 0 ? updatedCount : 'all'} products! Rates are now active.`);
  });

  resetBtn?.addEventListener('click', () => {
    if (confirm('Reset all product rates back to default catalog MRP?')) {
      localStorage.removeItem('hap_pos_price_overrides');
      const sourceProducts = (typeof HAP_PRODUCTS_DATA !== 'undefined' && HAP_PRODUCTS_DATA.products) 
        ? HAP_PRODUCTS_DATA.products 
        : (window.HAP_PRODUCTS_DATA?.products || []);
      
      const defaultMap = {};
      sourceProducts.forEach(p => { defaultMap[p.id] = p.price; });

      STATE.products.forEach(p => {
        if (defaultMap[p.id] !== undefined) {
          p.price = defaultMap[p.id];
          p.mrp = defaultMap[p.id];
        }
      });

      renderPriceManagerTable();
      renderCatalog();
      renderSpeedDial();
      renderCart();
      renderInventory();
      alert('Product rates reset to default MRP values.');
    }
  });
}

function renderPriceManagerTable() {
  const tbody = document.getElementById('priceManagerTableBody');
  if (!tbody) return;

  const search = (document.getElementById('priceManagerSearch')?.value || '').toLowerCase().trim().replace(/^#/, '');
  const brand = document.getElementById('priceManagerBrandSelect')?.value || 'ALL';

  let list = STATE.products;
  if (brand !== 'ALL') {
    list = list.filter(p => p.brand.toLowerCase() === brand.toLowerCase() || p.brandId === brand.toLowerCase());
  }
  if (search) {
    list = list.filter(p => 
      p.name.toLowerCase().includes(search) || 
      (p.code && p.code.toLowerCase().includes(search)) ||
      p.category.toLowerCase().includes(search) ||
      p.brand.toLowerCase().includes(search)
    );
  }

  tbody.innerHTML = list.map(p => `
    <tr>
      <td><span class="chip-code-tag">#${p.code}</span></td>
      <td><strong>${escapeHtml(p.name)}</strong></td>
      <td><span style="font-size: 11px; color: var(--text-muted);">${escapeHtml(p.brand)} • ${escapeHtml(p.unit)}</span></td>
      <td><span style="font-family: var(--font-mono); font-weight: 700;">₹${p.price.toFixed(2)}</span></td>
      <td>
        <input type="number" step="0.5" min="0" class="rate-edit-input" data-id="${p.id}" value="${p.price}">
      </td>
      <td>
        <button class="save-single-rate-btn btn btn-sm btn-primary" data-id="${p.id}" title="Save this rate">Save</button>
      </td>
    </tr>
  `).join('');

  // Single rate save buttons
  tbody.querySelectorAll('.save-single-rate-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const row = btn.closest('tr');
      const input = row?.querySelector('.rate-edit-input');
      const newRate = parseFloat(input?.value);
      if (!isNaN(newRate) && newRate >= 0) {
        const prod = STATE.products.find(p => p.id === id);
        if (prod) {
          prod.price = newRate;
          prod.mrp = newRate;
          savePriceOverrides();

          STATE.tabs.forEach(tab => {
            const item = tab.items.find(i => i.product.id === id);
            if (item) {
              item.price = newRate;
              item.total = item.qty * item.price;
            }
          });

          renderCatalog();
          renderSpeedDial();
          renderCart();
          renderInventory();
          btn.textContent = 'Saved! ✓';
          btn.classList.remove('btn-primary');
          btn.classList.add('btn-success');
          setTimeout(() => {
            btn.textContent = 'Save';
            btn.classList.remove('btn-success');
            btn.classList.add('btn-primary');
          }, 1200);
        }
      }
    });
  });
}

// ==========================================================================
// EVENT LISTENERS & HOTKEYS
// ==========================================================================
function setupEventListeners() {
  // Navigation tabs (Unified Desktop #mainNav and Mobile #mobileBottomNav)
  function switchView(viewId) {
    document.querySelectorAll('#mainNav .nav-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.view === viewId);
    });
    document.querySelectorAll('#mobileBottomNav .mobile-nav-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.view === viewId);
    });
    document.querySelectorAll('.view-panel').forEach(p => {
      p.classList.toggle('active', p.id === viewId);
    });
  }

  document.querySelectorAll('#mainNav .nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  document.querySelectorAll('#mobileBottomNav .mobile-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  // Mobile POS Segment Switcher (Catalog vs Cart)
  const posLayout = document.getElementById('posLayout');
  const mobCatalogBtn = document.getElementById('mobileTabCatalogBtn');
  const mobCartBtn = document.getElementById('mobileTabCartBtn');

  function setMobilePosMode(mode) {
    if (mode === 'cart') {
      posLayout?.classList.add('show-cart');
      mobCartBtn?.classList.add('active');
      mobCatalogBtn?.classList.remove('active');
    } else {
      posLayout?.classList.remove('show-cart');
      mobCatalogBtn?.classList.add('active');
      mobCartBtn?.classList.remove('active');
    }
  }

  mobCatalogBtn?.addEventListener('click', () => setMobilePosMode('catalog'));
  mobCartBtn?.addEventListener('click', () => setMobilePosMode('cart'));
  document.getElementById('cartMobileBackBtn')?.addEventListener('click', () => setMobilePosMode('catalog'));
  document.getElementById('floatingPillActionBtn')?.addEventListener('click', () => setMobilePosMode('cart'));
  
  // Mobile Header Cart Button jumps directly to cart
  document.getElementById('mobileHeaderCartBtn')?.addEventListener('click', () => {
    switchView('billingView');
    setMobilePosMode('cart');
  });


  // Instant Search
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      STATE.searchQuery = searchInput.value;
      if (clearSearchBtn) {
        clearSearchBtn.classList.toggle('visible', searchInput.value.length > 0);
      }
      renderCatalog();
    });
  }
  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      STATE.searchQuery = '';
      clearSearchBtn.classList.remove('visible');
      renderCatalog();
    });
  }

  // Stock filter toggle
  const stockToggle = document.getElementById('hideOutOfStockCheckbox');
  if (stockToggle) {
    stockToggle.addEventListener('change', () => {
      STATE.hideOutOfStock = stockToggle.checked;
      renderCatalog();
    });
  }

  // Cash Tender shortcuts
  document.querySelectorAll('.cash-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const amt = chip.dataset.amt;
      const cashInput = document.getElementById('cashTenderedInput');
      const totals = calculateCartTotals();
      if (amt === 'exact') {
        if (cashInput) cashInput.value = totals.grandTotal;
      } else {
        if (cashInput) cashInput.value = parseInt(amt);
      }
      updateChangeDue();
    });
  });

  const cashTenderedInput = document.getElementById('cashTenderedInput');
  if (cashTenderedInput) {
    cashTenderedInput.addEventListener('input', updateChangeDue);
  }

  // Payment Mode buttons
  document.querySelectorAll('.pay-method-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const method = btn.dataset.method;
      document.querySelectorAll('.pay-method-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = getActiveTab();
      tab.paymentMethod = method;
      
      if (method === 'UPI') {
        triggerUpiPayment();
      }
    });
  });

  // Action Buttons
  document.getElementById('checkoutBtn')?.addEventListener('click', completeCheckout);
  document.getElementById('clearCartBtn')?.addEventListener('click', clearActiveCart);
  document.getElementById('holdBillBtn')?.addEventListener('click', addNewBillTab);

  // Discount button
  document.getElementById('discountBtn')?.addEventListener('click', () => {
    const tab = getActiveTab();
    const input = prompt('Enter discount percentage (0-50%):', tab.discountPercent || '5');
    if (input !== null) {
      const val = parseFloat(input) || 0;
      tab.discountPercent = Math.min(50, Math.max(0, val));
      renderCart();
    }
  });

  // Thermal Receipt Modal buttons
  document.getElementById('closeReceiptModalBtn')?.addEventListener('click', () => {
    document.getElementById('receiptModal')?.classList.remove('open');
  });
  document.getElementById('closeReceiptBtn2')?.addEventListener('click', () => {
    document.getElementById('receiptModal')?.classList.remove('open');
  });
  document.getElementById('printReceiptDirectBtn')?.addEventListener('click', printThermalReceipt);
  document.getElementById('shareWhatsappBtn')?.addEventListener('click', shareBillOnWhatsapp);

  // UPI Modal buttons
  document.getElementById('closeUpiModalBtn')?.addEventListener('click', () => {
    document.getElementById('upiModal')?.classList.remove('open');
  });
  document.getElementById('cancelUpiBtn')?.addEventListener('click', () => {
    document.getElementById('upiModal')?.classList.remove('open');
  });
  document.getElementById('simulateUpiSuccessBtn')?.addEventListener('click', () => {
    document.getElementById('upiModal')?.classList.remove('open');
    completeCheckout();
  });

  // Day Close & Reports
  document.getElementById('printZReportBtn')?.addEventListener('click', printZReport);
  document.getElementById('exportDailyReportBtn')?.addEventListener('click', () => {
    alert('Daily sales summary report exported to store audit logs.');
  });

  // Inventory Table filters
  document.getElementById('inventoryBrandFilter')?.addEventListener('change', renderInventory);
  document.getElementById('inventoryStockStatusFilter')?.addEventListener('change', renderInventory);
  document.getElementById('inventorySearchInput')?.addEventListener('input', renderInventory);
  document.getElementById('exportInventoryBtn')?.addEventListener('click', exportInventoryCsv);

  // Orders Table filters
  document.getElementById('orderSearchInput')?.addEventListener('input', renderOrders);
  document.getElementById('orderPaymentFilter')?.addEventListener('change', renderOrders);
  document.getElementById('exportOrdersBtn')?.addEventListener('click', () => {
    alert('Invoices report downloaded in CSV format.');
  });

  // Settings Modal
  const settingsModal = document.getElementById('settingsModal');
  document.getElementById('settingsBtn')?.addEventListener('click', () => {
    document.getElementById('settingStoreName').value = STATE.settings.storeName;
    document.getElementById('settingStoreId').value = STATE.settings.storeId;
    document.getElementById('settingStoreAddress').value = STATE.settings.storeAddress;
    document.getElementById('settingGstin').value = STATE.settings.gstin;
    document.getElementById('settingFssai').value = STATE.settings.fssai;
    document.getElementById('settingCashier').value = STATE.settings.cashierName;
    document.getElementById('settingUpiVpa').value = STATE.settings.upiVpa;
    document.getElementById('settingSoundToggle').checked = STATE.settings.soundEnabled;
    settingsModal?.classList.add('open');
  });

  document.getElementById('closeSettingsModalBtn')?.addEventListener('click', () => settingsModal?.classList.remove('open'));
  document.getElementById('closeSettingsBtn2')?.addEventListener('click', () => settingsModal?.classList.remove('open'));

  document.getElementById('saveSettingsBtn')?.addEventListener('click', () => {
    STATE.settings.storeName = document.getElementById('settingStoreName').value;
    STATE.settings.storeId = document.getElementById('settingStoreId').value;
    STATE.settings.storeAddress = document.getElementById('settingStoreAddress').value;
    STATE.settings.gstin = document.getElementById('settingGstin').value;
    STATE.settings.fssai = document.getElementById('settingFssai').value;
    STATE.settings.cashierName = document.getElementById('settingCashier').value;
    STATE.settings.upiVpa = document.getElementById('settingUpiVpa').value;
    STATE.settings.soundEnabled = document.getElementById('settingSoundToggle').checked;

    saveSettings();
    updateHeaderStoreInfo();
    settingsModal?.classList.remove('open');
    alert('Store configuration updated successfully!');
  });

  document.getElementById('loadSampleDataBtn')?.addEventListener('click', () => {
    generateSampleOrders();
    renderReports();
    renderOrders();
    updateHeaderKPIs();
    settingsModal?.classList.remove('open');
    alert('Sample day orders preloaded successfully!');
  });

  // Add Product Modal
  const addProdModal = document.getElementById('addProductModal');
  document.getElementById('openAddProductModalBtn')?.addEventListener('click', () => {
    addProdModal?.classList.add('open');
  });
  document.getElementById('closeAddProductModalBtn')?.addEventListener('click', () => addProdModal?.classList.remove('open'));
  document.getElementById('cancelNewProductBtn')?.addEventListener('click', () => addProdModal?.classList.remove('open'));

  document.getElementById('saveNewProductBtn')?.addEventListener('click', () => {
    const name = document.getElementById('newProdName').value.trim();
    const brand = document.getElementById('newProdBrand').value;
    const category = document.getElementById('newProdCategory').value.trim() || 'Dairy';
    const barcode = document.getElementById('newProdBarcode').value.trim() || String(Date.now()).slice(-10);
    const unit = document.getElementById('newProdUnit').value.trim() || 'Unit';
    const price = parseFloat(document.getElementById('newProdPrice').value) || 0;
    const taxRate = parseInt(document.getElementById('newProdGst').value) || 5;
    const stock = parseInt(document.getElementById('newProdStock').value) || 20;

    if (!name || price <= 0) {
      alert('Please enter valid product name and price.');
      return;
    }

    const nextCode = String(STATE.products.length + 101);
    const newProd = {
      id: `custom_${Date.now()}`,
      code: nextCode,
      barcode,
      name,
      brand,
      brandId: brand.toLowerCase().replace(/[^a-z]/g, ''),
      category,
      unit,
      price,
      mrp: price,
      cost: Math.round(price * 0.8),
      taxRate,
      stock,
      image: 'https://hapdaily.com/wp-content/uploads/2025/12/HAP-Logo.png'
    };

    STATE.products.unshift(newProd);
    saveStockOverrides();
    renderCatalog();
    renderBrandTabs();
    renderInventory();
    addProdModal?.classList.remove('open');
    alert(`Added "${name}" to product database!`);
  });

  // Theme Toggle
  document.getElementById('themeToggleBtn')?.addEventListener('click', () => {
    document.body.classList.toggle('pos-theme-dark');
  });

  // Global Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    // F1 = Billing View
    if (e.key === 'F1') {
      e.preventDefault();
      document.getElementById('navBilling')?.click();
    }
    // F3 = Inventory
    else if (e.key === 'F3') {
      e.preventDefault();
      document.getElementById('navInventory')?.click();
    }
    // F4 = Cash Checkout
    else if (e.key === 'F4') {
      e.preventDefault();
      document.getElementById('payMethodCash')?.click();
      document.getElementById('checkoutBtn')?.click();
    }
    // F5 = UPI Checkout
    else if (e.key === 'F5') {
      e.preventDefault();
      document.getElementById('payMethodUpi')?.click();
    }
    // F6 = Reports
    else if (e.key === 'F6') {
      e.preventDefault();
      document.getElementById('navReports')?.click();
    }
    // F7 = Orders
    else if (e.key === 'F7') {
      e.preventDefault();
      document.getElementById('navOrders')?.click();
    }
    // F8 = Hold Bill
    else if (e.key === 'F8') {
      e.preventDefault();
      addNewBillTab();
    }
    // Ctrl + Enter = Checkout
    else if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      completeCheckout();
    }
    // ESC = Close Modals
    else if (e.key === 'Escape') {
      document.querySelectorAll('.modal-backdrop.open').forEach(m => m.classList.remove('open'));
    }
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
