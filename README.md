# 🍦 HAP Daily POS & Retail Billing Software
> **Next-Gen Retail Billing & Inventory Management Software** built specifically for **Hatsun Agro Product (HAP Daily)** outlets, franchise stores, and dairy booths.

---

## 🌟 Overview & Official Menu Integration

This software is pre-loaded with **215 authentic products and high-resolution images** directly extracted from the official **HAP Daily Menu** ([hapdaily.com/menu](https://hapdaily.com/menu)):

- **Arun Icecreams (125 SKUs)**: Cones, Tubs, Bars, Bites, Slice-it, Cassatta, Kulfi, Sandwiches, Push-ups, Kids Bars, Donut bars.
- **Arokya Milk (32 SKUs)**: Full Cream Milk, Standardized Milk, Toned Milk, Double Toned Milk, Cow Milk across all pouch sizes (100ml to 5.5L).
- **Hatsun Dairy (38 SKUs)**: Hatsun Curd, Paneer, Ghee, Cooking Butter, Table Butter, Buttermilk, Lassi, Whey Drinks, Cheese Spread, Fresh Cream.
- **HAP Cake (12 SKUs)**: Premium Ice Cream Cakes, Cake Slices, Cassatta cakes.
- **Hanobar (10 SKUs)**: Specialty ice cream bars & snacks.
- **Dako (9 SKUs)**: Dark Chocolate Rolls, Roasted Mixed Nuts, Almond Brittle, Spreads, Choco Fudge.
- **Aniva (5 SKUs)**: Specialty dairy treats.

---

## 🚀 Key Features

### 🛒 1. Fast Touch & Barcode Billing POS
- **Live Barcode Scanner Support**: Plug-and-play with any standard USB/Bluetooth barcode scanner.
- **⚡ Fast Demo Scanner**: Interactive dropdown with popular items to simulate barcode scan events instantly.
- **Instant Search**: Real-time debounce search across brand, category, item name, and barcode.
- **Brand Quick Tabs**: One-click switching between Arun Icecreams, Arokya Milk, Hatsun Dairy, HAP Cake, etc.
- **Multi-Tab Hold & Recall Bills**: Serve multiple customers concurrently (`Bill #1`, `Bill #2`, `+ Tab`). Hold customer 1's basket while customer 2 pays for milk!
- **Customer Loyalty Tracker**: Phone number lookup, customer name, and loyalty point rewards.
- **Automatic GST Breakdown**: Automatic 5%, 12%, and 18% GST calculation (split into CGST & SGST) with nearest-rupee round-off.
- **Cash Tendered & Instant Change Due**: Quick tender buttons (`Exact`, `₹50`, `₹100`, `₹200`, `₹500`) with instant change calculation.

### 🧾 2. Thermal Receipt Printer Format (80mm & 58mm)
- **Direct Thermal Receipt Printing**: One-click print formatted strictly for standard 80mm/58mm POS thermal printers (or standard A4).
- **Store & Compliance Details**: Prints store name, franchise outlet ID, GSTIN, FSSAI License Number, date, time, cashier name, and tax breakdown.
- **Scannable Invoice QR Code**: Dynamic QR code printed on every receipt for digital verification.
- **📲 WhatsApp Bill Share**: One-click button to send pre-formatted bill details directly to customer's WhatsApp!

### 📲 3. Instant Dynamic UPI QR Code
- Generates real-time scannable UPI QR codes (GPay, PhonePe, Paytm, CRED) matching the exact bill amount and merchant VPA.
- Soundbox chime simulation upon payment confirmation.

### 📦 4. Inventory & Stock Management (`F3`)
- Real-time stock counters across all 215 products.
- Low-stock warning flags (`< 15 units`) to alert store staff for fresh milk & ice cream restocking.
- Fast inline restock buttons (`+10`, `+50`).
- **Add Custom Store SKU**: Add local dairy items, cold storage items, or carry bags.
- **Export Inventory CSV**: Full export for store auditing and warehouse reconciliation.

### 📊 5. Day-End Close & Sales Analytics (`F6` - Z-Report)
- Today's Gross Sales, Total Invoices, Average Bill Value, and Total GST collected.
- Payment Mode breakdown: Cash in Drawer vs UPI Collections vs Card.
- Brand share distribution (Arun vs Arokya vs Hatsun vs HAP Cake).
- Top 10 Best-Selling Products of the Day.
- **Print Day-End Z-Report**: Cash drawer physical tally slip for shift handovers and store closing.

### ⚙️ 6. Store Settings & Audio Effects
- Customize Franchise Outlet Name, Address, GSTIN, FSSAI Number, Cashier Name, and UPI ID.
- Synthesized Web Audio POS beep (scanner sound) and cash register chime on checkout.
- Dark Mode / Light Mode toggle.

---

## ⌨️ Fast POS Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `F1` | Go to **Billing POS** Screen |
| `F3` | Open **Inventory & Stock Manager** |
| `F4` | Select **Cash** & Complete Checkout |
| `F5` | Open **Dynamic UPI QR Code** Modal |
| `F6` | Open **Day-End Close & Reports** (Z-Report) |
| `F7` | View **Invoices & Orders Archive** |
| `F8` | **Hold Bill** / Open New Customer Tab |
| `Ctrl + Enter` | **Charge & Print Receipt** |
| `ESC` | Close Modals / Cancel |

---

## 💻 Running the Application

The server is currently running locally at:
👉 **http://localhost:5173/**

To run or build manually:
```bash
# Start development server
npm run dev

# Build for production deployment
npm run build

# Preview production build
npm run preview
```
