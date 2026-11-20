
/* =========================================================
   MANGO LOCAL — Browser-only marketplace prototype
   Data is saved in this browser using localStorage.
   No real authentication or payment processing.
========================================================= */

const STORAGE_KEY = "mango_local_v1";

const money = value => "₹" + Number(value || 0).toLocaleString("en-IN", {
  maximumFractionDigits: 2
});
const uid = prefix => prefix + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, ch => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[ch]));
const today = () => new Date().toISOString().slice(0, 10);

function seedData() {
  return {
    users: [
      { id: "u_customer", name: "Demo Customer", email: "customer@mango.demo", password: "demo123", role: "customer" },
      { id: "u_owner", name: "Demo Business Owner", email: "owner@mango.demo", password: "demo123", role: "business" },
      { id: "u_admin", name: "MANGO Admin", email: "admin@mango.demo", password: "admin123", role: "admin" }
    ],
    businesses: [
      { id: "b_print", ownerId: "u_owner", name: "PixelPrint Studio", category: "Printing & Design", description: "Professional printing, custom invitations, branding and creative design services.", city: "Coimbatore", phone: "9876543210", verified: true, created: today() },
      { id: "b_craft", ownerId: "u_owner", name: "CraftNest Works", category: "Handmade & Gifts", description: "Thoughtful handmade gifts, custom products and personalised creations.", city: "Coimbatore", phone: "9876543211", verified: false, created: today() },
      { id: "b_tech", ownerId: "u_customer", name: "TechFix Hub", category: "Electronics & Repair", description: "Computer and electronics repair, accessories and technical support.", city: "Chennai", phone: "9876543212", verified: true, created: today() }
    ],
    products: [
      { id: "p1", businessId: "b_print", name: "Business Cards", description: "Custom printed business cards.", price: 350, unit: "100 cards" },
      { id: "p2", businessId: "b_print", name: "Custom Posters", description: "High-quality custom posters.", price: 250, unit: "per poster" },
      { id: "p3", businessId: "b_print", name: "Logo Design", description: "Professional logo design service.", price: 1500, unit: "per design" },
      { id: "p4", businessId: "b_craft", name: "Personalised Gift Box", description: "A custom gift box for special occasions.", price: 799, unit: "per box" },
      { id: "p5", businessId: "b_tech", name: "Laptop Service", description: "Basic laptop inspection and service.", price: 499, unit: "per service" }
    ],
    orders: [
      {
        id: "o_demo", customerId: "u_customer", businessId: "b_print",
        description: "Need 200 business cards with a custom design.",
        quantity: 2, dueDate: "", created: today(), status: "Quotation sent",
        quote: { amount: 700, deliveryDate: today(), note: "Includes design and printing." },
        paymentStatus: "Unpaid", paidAmount: 0, history: ["Order request submitted", "Quotation sent"]
      }
    ],
    expenses: [],
    complaints: [],
    currentUserId: null
  };
}

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return seedData();
    const parsed = JSON.parse(saved);
    const initial = seedData();
    return { ...initial, ...parsed };
  } catch {
    return seedData();
  }
}

let db = loadData();
let currentPage = "home";
let dashboardTab = "overview";
let exploreSearch = "";
let exploreCategory = "All";
let toastTimer;

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function currentUser() {
  return db.users.find(user => user.id === db.currentUserId) || null;
}

function myBusinesses() {
  const user = currentUser();
  return user ? db.businesses.filter(b => b.ownerId === user.id) : [];
}

function businessById(id) {
  return db.businesses.find(b => b.id === id);
}

function orderById(id) {
  return db.orders.find(o => o.id === id);
}

function toast(message) {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2800);
}

function setPage(page) {
  currentPage = page;
  document.getElementById("mainNav").classList.remove("open");
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function updateHeader() {
  const user = currentUser();
  document.getElementById("userLabel").textContent = user ? user.name : "Guest";
  document.getElementById("loginBtn").classList.toggle("hidden", !!user);
  document.getElementById("logoutBtn").classList.toggle("hidden", !user);
  document.querySelectorAll(".nav-link").forEach(button => {
    button.classList.toggle("active", button.dataset.page === currentPage);
  });
}

function pageHead(title, subtitle) {
  return `<section class="page-head"><div class="container"><h1>${title}</h1><p>${subtitle}</p></div></section>`;
}

function render() {
  updateHeader();
  const view = document.getElementById("view");

  if (currentPage === "home") view.innerHTML = renderHome();
  else if (currentPage === "explore") view.innerHTML = renderExplore();
  else if (currentPage === "orders") view.innerHTML = renderOrders();
  else if (currentPage === "dashboard") view.innerHTML = renderDashboard();
  else view.innerHTML = renderHome();
}

function renderHome() {
  const user = currentUser();
  const businesses = db.businesses.filter(b => b.verified);
  return `
    <section class="hero">
      <div class="container hero-content">
        <div class="eyebrow">Marketplace for Accounts, Networking, Growth & Orders</div>
        <h1>Good business<br>starts with connection.</h1>
        <p>Discover trusted businesses, request services, manage orders and keep track of your business activity — all in one place.</p>
        <div class="hero-buttons">
          <button class="btn btn-primary" data-action="explore">Explore businesses →</button>
          <button class="btn btn-outline" data-action="business-register">I'm a business owner</button>
        </div>
        <div class="hero-note">One platform. More connections. Better business.</div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="section-heading">
          <div><h2>Discover businesses</h2><p>Find services and products from businesses on MANGO.</p></div>
          <button class="btn btn-outline" data-action="explore">View all businesses →</button>
        </div>
        <div class="grid grid-3">
          ${businesses.slice(0, 3).map(businessCard).join("") || emptyState("No businesses listed yet.")}
        </div>
      </div>
    </section>

    <section class="section" style="background:#fff">
      <div class="container">
        <div class="section-heading"><div><h2>Everything connected</h2><p>Tools that make buying and running a business simpler.</p></div></div>
        <div class="grid grid-4">
          ${feature("🔎", "Discover", "Explore businesses and find the services you need.")}
          ${feature("🧾", "Get quotations", "Send requests, receive quotes and approve them.")}
          ${feature("📦", "Track orders", "Follow order progress from request to completion.")}
          ${feature("📊", "Manage business", "Track sales, expenses and estimated profit.")}
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container card" style="background:#fff8e9;border-color:#f5dfb8">
        <div class="section-heading">
          <div><h2>Are you a business owner?</h2><p>Bring your business online, manage customer requests and monitor your performance.</p></div>
          <button class="btn btn-dark" data-action="business-register">Create a business profile →</button>
        </div>
      </div>
    </section>

    ${user ? `<div class="container" style="padding-bottom:30px"><p class="pill green">Signed in as ${escapeHTML(user.role)}</p></div>` : ""}
  `;
}

function feature(icon, title, description) {
  return `<div class="card feature-card"><div class="category-icon">${icon}</div><h3>${title}</h3><p>${description}</p></div>`;
}

function businessCard(b) {
  const count = db.products.filter(p => p.businessId === b.id).length;
  return `
    <article class="card business-card">
      <div class="business-cover"><span>🏢</span><span style="font-size:12px">MANGO BUSINESS</span></div>
      <div class="business-info">
        <h3>${escapeHTML(b.name)} ${b.verified ? '<span class="pill green">Verified demo</span>' : ""}</h3>
        <div class="business-meta">${escapeHTML(b.category)} · ${escapeHTML(b.city)}</div>
        <p>${escapeHTML(b.description)}</p>
        <div class="business-meta">${count} listed product/service${count === 1 ? "" : "s"}</div>
        <button class="btn btn-dark btn-small" data-action="view-business" data-id="${b.id}">View business →</button>
      </div>
    </article>`;
}

function emptyState(message) {
  return `<div class="empty">${escapeHTML(message)}</div>`;
}

function renderExplore() {
  const categories = ["All", ...new Set(db.businesses.map(b => b.category))];
  const list = db.businesses.filter(b => b.verified).filter(b => {
    const search = exploreSearch.toLowerCase();
    const matches = `${b.name} ${b.category} ${b.description} ${b.city}`.toLowerCase().includes(search);
    return matches && (exploreCategory === "All" || b.category === exploreCategory);
  });

  return `${pageHead("Explore businesses", "Discover services, products and local businesses.")}
    <section class="page-content"><div class="container">
      <div class="searchbar">
        <input id="exploreSearch" class="search-input" placeholder="Search business, service or location..." value="${escapeHTML(exploreSearch)}">
        <select id="exploreCategory" style="max-width:240px">
          ${categories.map(c => `<option ${c === exploreCategory ? "selected" : ""}>${escapeHTML(c)}</option>`).join("")}
        </select>
      </div>
      <p class="business-meta">${list.length} business${list.length === 1 ? "" : "es"} found</p>
      <div class="grid grid-3">${list.map(businessCard).join("") || emptyState("No matching businesses found.")}</div>
    </div></section>`;
}

function renderOrders() {
  const user = currentUser();
  if (!user) return loginPrompt("Sign in to view your orders.");
  const orders = user.role === "admin" ? db.orders :
    user.role === "business" ? db.orders.filter(o => myBusinesses().some(b => b.id === o.businessId)) :
    db.orders.filter(o => o.customerId === user.id);

  return `${pageHead("Orders", "View order requests, quotations, payments and progress.")}
    <section class="page-content"><div class="container">
      ${orders.length ? `<div class="table-wrap"><table>
        <thead><tr><th>Order</th><th>Business</th><th>Description</th><th>Order status</th><th>Payment</th><th>Action</th></tr></thead>
        <tbody>${orders.map(o => {
          const b = businessById(o.businessId);
          return `<tr>
            <td>${escapeHTML(o.id.slice(-7).toUpperCase())}</td>
            <td>${escapeHTML(b?.name || "Business")}</td>
            <td>${escapeHTML(o.description.slice(0, 45))}</td>
            <td>${statusPill(o.status)}</td>
            <td>${paymentPill(o.paymentStatus)}</td>
            <td><button class="btn btn-light btn-small" data-action="view-order" data-id="${o.id}">Open</button></td>
          </tr>`;
        }).join("")}</tbody>
      </table></div>` : emptyState("You don't have any orders yet. Explore businesses to get started.") }
      <div style="margin-top:20px"><button class="btn btn-primary" data-action="explore">Find a business</button></div>
    </div></section>`;
}

function statusPill(status) {
  const color = ["Completed", "Ready"].includes(status) ? "green" :
    ["Rejected", "Cancelled"].includes(status) ? "red" :
    ["Quotation sent", "Awaiting payment"].includes(status) ? "orange" : "";
  return `<span class="pill ${color}">${escapeHTML(status)}</span>`;
}
function paymentPill(status) {
  return `<span class="pill ${status === "Paid" ? "green" : status === "Failed" ? "red" : "orange"}">${escapeHTML(status)}</span>`;
}
function loginPrompt(message) {
  return `${pageHead("Welcome to MANGO", message)}
    <section class="page-content"><div class="container card">
      <p>Please sign in to continue.</p>
      <button class="btn btn-primary" data-action="login">Sign in</button>
    </div></section>`;
}

function renderDashboard() {
  const user = currentUser();
  if (!user) return loginPrompt("Sign in to access your dashboard.");

  if (user.role === "admin") return renderAdminDashboard();
  if (user.role === "business") return renderBusinessDashboard();
  return renderCustomerDashboard();
}

function renderCustomerDashboard() {
  const user = currentUser();
  const orders = db.orders.filter(o => o.customerId === user.id);
  const spent = orders.reduce((sum, o) => sum + (o.paymentStatus === "Paid" ? Number(o.paidAmount || 0) : 0), 0);
  const pending = orders.filter(o => !["Completed", "Rejected", "Cancelled"].includes(o.status)).length;

  return `${pageHead("Customer dashboard", `Welcome back, ${escapeHTML(user.name)}.`)}
    <section class="page-content"><div class="container">
      <div class="stats-grid">
        ${stat("Total orders", orders.length, "All your requests")}
        ${stat("Amount paid", money(spent), "Recorded demo payments")}
        ${stat("Active orders", pending, "Orders still in progress")}
        ${stat("Businesses", db.businesses.filter(b => b.verified).length, "Available to explore")}
      </div>
      <div class="section-heading"><div><h2>Your recent orders</h2><p>Track quotations and order progress.</p></div><button class="btn btn-primary" data-action="explore">Explore businesses</button></div>
      ${orders.length ? orderTable(orders) : emptyState("No orders yet. Explore businesses and submit your first request.")}
      <div class="card" style="margin-top:22px">
        <h3>Your spending overview</h3>
        <p>Total recorded payments: <strong>${money(spent)}</strong>. This is based only on paid demo orders.</p>
      </div>
    </div></section>`;
}

function renderBusinessDashboard() {
  const user = currentUser();
  const businesses = myBusinesses();
  const ownedIds = businesses.map(b => b.id);
  const orders = db.orders.filter(o => ownedIds.includes(o.businessId));
  const paid = orders.reduce((sum, o) => sum + (o.paymentStatus === "Paid" ? Number(o.paidAmount || 0) : 0), 0);
  const expenses = db.expenses.filter(e => ownedIds.includes(e.businessId));
  const expenseTotal = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const tabContent = {
    overview: businessOverview(businesses, orders, paid, expenseTotal),
    businesses: businessManagement(businesses),
    orders: `<h2>Customer orders</h2><p class="business-meta">Review requests, send quotations and update progress.</p>${orders.length ? orderTable(orders, true) : emptyState("No customer requests yet.")}`,
    products: productManagement(businesses),
    expenses: expenseManagement(businesses, expenses),
    finance: financeManagement(businesses, orders, paid, expenseTotal),
    verification: verificationManagement(businesses)
  };

  return `${pageHead("Business dashboard", `Manage your business activity, ${escapeHTML(user.name)}.`)}
    <section class="page-content"><div class="container dashboard-layout">
      <aside class="side-menu">
        ${dashboardMenu("overview", "Overview")}
        ${dashboardMenu("businesses", "My businesses")}
        ${dashboardMenu("orders", "Customer orders")}
        ${dashboardMenu("products", "Products & services")}
        ${dashboardMenu("expenses", "Expenses")}
        ${dashboardMenu("finance", "Finance & commission")}
        ${dashboardMenu("verification", "Verification")}
      </aside>
      <div class="dashboard-main">${tabContent[dashboardTab] || tabContent.overview}</div>
    </div></section>`;
}

function dashboardMenu(key, label) {
  return `<button class="${dashboardTab === key ? "active" : ""}" data-action="dashboard-tab" data-tab="${key}">${label}</button>`;
}

function stat(label, value, note) {
  return `<div class="stat"><span>${label}</span><strong>${value}</strong><small>${note}</small></div>`;
}

function businessOverview(businesses, orders, paid, expenses) {
  return `
    <div class="section-heading"><div><h2>Business overview</h2><p>A snapshot of your business activity.</p></div><button class="btn btn-primary" data-action="add-business">+ Add business</button></div>
    <div class="stats-grid">
      ${stat("My businesses", businesses.length, "Business profiles")}
      ${stat("Customer orders", orders.length, "All order requests")}
      ${stat("Payments received", money(paid), "Paid demo orders")}
      ${stat("Recorded expenses", money(expenses), "Expenses entered")}
    </div>
    <div class="card"><h3>Welcome to your business workspace</h3><p>Manage customer requests, send quotations, update orders and track your finances from the menu.</p></div>
    <div style="margin-top:22px"><h3>Recent customer orders</h3>${orders.length ? orderTable(orders.slice(-5).reverse(), true) : emptyState("Your customer orders will appear here.")}</div>`;
}

function businessManagement(businesses) {
  return `<div class="section-heading"><div><h2>My businesses</h2><p>One account can manage multiple businesses.</p></div><button class="btn btn-primary" data-action="add-business">+ Add business</button></div>
    ${businesses.length ? `<div class="grid grid-3">${businesses.map(b => `
      <div class="card"><div class="category-icon">🏢</div><h3>${escapeHTML(b.name)}</h3>
        <p>${escapeHTML(b.category)} · ${escapeHTML(b.city)}</p>
        <p style="margin:10px 0">${escapeHTML(b.description)}</p>
        ${b.verified ? '<span class="pill green">Verified demo</span>' : '<span class="pill orange">Verification pending</span>'}
      </div>`).join("")}</div>` : emptyState("You have not registered a business yet.")}`;
}

function productManagement(businesses) {
  const ids = businesses.map(b => b.id);
  const products = db.products.filter(p => ids.includes(p.businessId));
  return `<div class="section-heading"><div><h2>Products & services</h2><p>Add items customers can discover.</p></div><button class="btn btn-primary" data-action="add-product">+ Add item</button></div>
    ${products.length ? `<div class="table-wrap"><table><thead><tr><th>Item</th><th>Business</th><th>Price</th><th>Unit</th></tr></thead><tbody>
    ${products.map(p => `<tr><td><strong>${escapeHTML(p.name)}</strong><br>${escapeHTML(p.description)}</td><td>${escapeHTML(businessById(p.businessId)?.name || "")}</td><td>${money(p.price)}</td><td>${escapeHTML(p.unit)}</td></tr>`).join("")}
    </tbody></table></div>` : emptyState("No products or services listed yet.")}`;
}

function expenseManagement(businesses, expenses) {
  return `<div class="section-heading"><div><h2>Business expenses</h2><p>Record rent, materials, salaries and other costs.</p></div><button class="btn btn-primary" data-action="add-expense">+ Add expense</button></div>
    ${expenses.length ? `<div class="table-wrap"><table><thead><tr><th>Date</th><th>Business</th><th>Category</th><th>Description</th><th>Amount</th></tr></thead><tbody>
    ${expenses.map(e => `<tr><td>${escapeHTML(e.date)}</td><td>${escapeHTML(businessById(e.businessId)?.name || "")}</td><td>${escapeHTML(e.category)}</td><td>${escapeHTML(e.description)}</td><td>${money(e.amount)}</td></tr>`).join("")}
    </tbody></table></div>` : emptyState("No expenses recorded yet.")}`;
}

function commissionFor(sales) {
  const firstSlab = Math.min(Math.max(0, sales), 5000000);
  const upperSlab = Math.max(0, sales - 5000000);
  return firstSlab * 0.01 + upperSlab * 0.008;
}

function financeManagement(businesses, orders, paid, expenseTotal) {
  const ownedIds = businesses.map(b => b.id);
  const monthlyOrders = orders.filter(o =>
    o.paymentStatus === "Paid" && o.created?.slice(0, 7) === today().slice(0, 7)
  );
  const monthlySales = monthlyOrders.reduce((sum, o) => sum + Number(o.paidAmount || 0), 0);
  const monthlyCommission = commissionFor(monthlySales);
  const commissionRows = businesses.map(b => {
    const sales = db.orders.filter(o => o.businessId === b.id && o.paymentStatus === "Paid" && o.created?.slice(0, 7) === today().slice(0, 7))
      .reduce((sum, o) => sum + Number(o.paidAmount || 0), 0);
    return `<tr><td>${escapeHTML(b.name)}</td><td>${money(sales)}</td><td>${money(commissionFor(sales))}</td></tr>`;
  }).join("");

  return `<h2>Finance & commission</h2><p class="business-meta">A simple local estimate based on recorded demo payments and expenses.</p>
    <div class="stats-grid">
      ${stat("Total received", money(paid), "All recorded paid orders")}
      ${stat("Total expenses", money(expenseTotal), "All recorded expenses")}
      ${stat("Estimated net", money(paid - expenseTotal), "Before other taxes and costs")}
      ${stat("This month's commission", money(monthlyCommission), "Based on eligible paid sales")}
    </div>
    <div class="card">
      <h3>Monthly commission model</h3>
      <p>Calculated separately for each business: <strong>1% on the first ₹50 lakh</strong> of eligible completed and paid sales, and <strong>0.8% on eligible sales above ₹50 lakh</strong>. Cancelled and refunded orders are excluded. Payment gateway charges and applicable taxes are accounted for separately.</p>
      <div class="form-group" style="margin-top:18px">
        <label>Try the commission calculator (monthly sales)</label>
        <input class="field" id="commissionInput" type="number" min="0" placeholder="Enter sales amount in rupees">
      </div>
      <p id="commissionResult" class="pill orange">Estimated commission: ₹0</p>
    </div>
    <h3 style="margin-top:24px">Business-wise monthly commission</h3>
    ${businesses.length ? `<div class="table-wrap"><table><thead><tr><th>Business</th><th>Eligible paid sales</th><th>Estimated commission</th></tr></thead><tbody>${commissionRows}</tbody></table></div>` : emptyState("Add a business to see its commission summary.")}`;
}

function verificationManagement(businesses) {
  return `<h2>Business verification</h2><p class="business-meta">This local demo does not verify legal documents or business identity.</p>
    ${businesses.length ? `<div class="grid grid-3">${businesses.map(b => `<div class="card"><h3>${escapeHTML(b.name)}</h3><p>${escapeHTML(b.category)}</p><p style="margin:12px 0">${b.verified ? '<span class="pill green">Verified demo status</span>' : '<span class="pill orange">Pending review</span>'}</p></div>`).join("")}</div>` : emptyState("Register a business first.")}`;
}

function orderTable(orders, businessMode = false) {
  return `<div class="table-wrap"><table>
    <thead><tr><th>Order</th><th>${businessMode ? "Customer" : "Business"}</th><th>Description</th><th>Status</th><th>Payment</th><th>Action</th></tr></thead>
    <tbody>${orders.map(o => {
      const b = businessById(o.businessId);
      const customer = db.users.find(u => u.id === o.customerId);
      return `<tr><td>${escapeHTML(o.id.slice(-7).toUpperCase())}</td>
        <td>${escapeHTML(businessMode ? customer?.name || "Customer" : b?.name || "Business")}</td>
        <td>${escapeHTML(o.description.slice(0, 55))}</td>
        <td>${statusPill(o.status)}</td><td>${paymentPill(o.paymentStatus)}</td>
        <td><button class="btn btn-light btn-small" data-action="view-order" data-id="${o.id}">Open</button></td></tr>`;
    }).join("")}</tbody>
  </table></div>`;
}

function renderAdminDashboard() {
  const pending = db.businesses.filter(b => !b.verified);
  return `${pageHead("Admin dashboard", "Local demonstration administration workspace.")}
    <section class="page-content"><div class="container">
      <div class="card" style="margin-bottom:20px"><span class="pill orange">Demo admin mode</span><p style="margin-top:10px">This is not a secure production admin panel. Do not use it to manage real customer data.</p></div>
      <div class="stats-grid">
        ${stat("Users", db.users.length, "Local demo accounts")}
        ${stat("Businesses", db.businesses.length, "All registered profiles")}
        ${stat("Orders", db.orders.length, "All order requests")}
        ${stat("Complaints", db.complaints.length, "Submitted reports")}
      </div>
      <h2>Business verification requests</h2>
      ${pending.length ? `<div class="grid grid-3">${pending.map(b => `<div class="card"><h3>${escapeHTML(b.name)}</h3><p>${escapeHTML(b.category)} · ${escapeHTML(b.city)}</p><button class="btn btn-primary btn-small" style="margin-top:15px" data-action="verify-business" data-id="${b.id}">Mark as demo verified</button></div>`).join("")}</div>` : emptyState("No pending verification requests.")}
      <h2 style="margin-top:30px">Registered users</h2>
      <div class="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th></tr></thead><tbody>
      ${db.users.map(u => `<tr><td>${escapeHTML(u.name)}</td><td>${escapeHTML(u.email)}</td><td>${escapeHTML(u.role)}</td></tr>`).join("")}
      </tbody></table></div>
      <h2 style="margin-top:30px">All orders</h2>
      ${db.orders.length ? orderTable(db.orders) : emptyState("No orders yet.")}
      <div class="card" style="margin-top:25px">
        <h3>Demo data controls</h3>
        <p>Reset all local prototype data to the original sample accounts and orders.</p>
        <button class="btn btn-danger" style="margin-top:15px" data-action="reset-data">Reset demo data</button>
      </div>
    </div></section>`;
}


/* =========================================================
   MODALS AND USER ACTIONS
========================================================= */

function showModal(title, subtitle, content) {
  document.getElementById("modalRoot").innerHTML = `
    <div class="modal-backdrop" data-action="close-backdrop">
      <div class="modal" onclick="event.stopPropagation()">
        <button class="modal-close" data-action="close-modal">×</button>
        <h2>${title}</h2>
        <p class="modal-sub">${subtitle || ""}</p>
        ${content}
      </div>
    </div>`;
}

function closeModal() {
  document.getElementById("modalRoot").innerHTML = "";
}

function loginModal() {
  showModal("Welcome back", "Sign in to your MANGO demo account.", `
    <form id="loginForm">
      <div class="form-group"><label>Email address</label><input class="field" name="email" type="email" required placeholder="you@example.com"></div>
      <div class="form-group"><label>Password</label><input class="field" name="password" type="password" required placeholder="Enter password"></div>
      <button class="btn btn-primary" style="width:100%">Sign in</button>
    </form>
    <div class="card" style="margin-top:18px;background:#f7f9fc">
      <strong style="font-size:13px">Try the demo accounts</strong>
      <p style="margin:8px 0">Customer: customer@mango.demo / demo123</p>
      <p style="margin:8px 0">Business: owner@mango.demo / demo123</p>
      <p style="margin:8px 0">Admin: admin@mango.demo / admin123</p>
      <small>These sample credentials are for this local prototype only.</small>
    </div>
    <p style="text-align:center;margin-top:16px;font-size:13px">New here? <a href="#" data-action="register" style="color:#1e69a7;font-weight:700">Create an account</a></p>
  `);
}

function registerModal() {
  showModal("Create your account", "Join MANGO as a customer or business owner.", `
    <form id="registerForm">
      <div class="form-group"><label>Full name</label><input class="field" name="name" required maxlength="70"></div>
      <div class="form-group"><label>Email address</label><input class="field" name="email" type="email" required></div>
      <div class="form-group"><label>Password</label><input class="field" name="password" type="password" minlength="6" required></div>
      <div class="form-group"><label>Account type</label>
        <select name="role" class="field"><option value="customer">Customer</option><option value="business">Business owner</option></select>
      </div>
      <button class="btn btn-primary" style="width:100%">Create local demo account</button>
    </form>
    <p style="font-size:11px;color:#788596;margin-top:15px">Demo only: this account is stored in this browser and is not available to other devices or users.</p>
  `);
}

function businessModal() {
  const user = currentUser();
  if (!user) return loginModal();

  showModal("Register a business", "Create a profile for customers to discover.", `
    <form id="businessForm">
      <div class="form-group"><label>Business name</label><input class="field" name="name" required maxlength="80"></div>
      <div class="form-group"><label>Business category</label>
        <select class="field" name="category" required>
          <option value="">Select category</option>
          <option>Printing & Design</option><option>Electronics & Repair</option>
          <option>Food & Beverage</option><option>Clothing & Fashion</option>
          <option>Handmade & Gifts</option><option>Education</option>
          <option>Home Services</option><option>Health & Wellness</option>
          <option>Professional Services</option><option>Other</option>
        </select>
      </div>
      <div class="form-group"><label>City</label><input class="field" name="city" required></div>
      <div class="form-group"><label>Contact number</label><input class="field" name="phone" required maxlength="15"></div>
      <div class="form-group"><label>About your business</label><textarea name="description" required maxlength="500"></textarea></div>
      <button class="btn btn-primary" style="width:100%">Submit business profile</button>
    </form>
    <p style="font-size:11px;color:#788596;margin-top:12px">New profiles start as pending demo verification. They won't appear in public search until marked verified.</p>
  `);
}

function productModal() {
  const businesses = myBusinesses();
  if (!businesses.length) {
    toast("Register a business before adding products.");
    dashboardTab = "businesses";
    render();
    return;
  }
  showModal("Add product or service", "List an item customers can request.", `
    <form id="productForm">
      <div class="form-group"><label>Business</label><select class="field" name="businessId">${businesses.map(b => `<option value="${b.id}">${escapeHTML(b.name)}</option>`).join("")}</select></div>
      <div class="form-group"><label>Product / service name</label><input class="field" name="name" required maxlength="80"></div>
      <div class="form-group"><label>Description</label><textarea name="description" required maxlength="300"></textarea></div>
      <div class="form-grid">
        <div class="form-group"><label>Starting price (₹)</label><input class="field" name="price" type="number" min="0" step="0.01" required></div>
        <div class="form-group"><label>Unit</label><input class="field" name="unit" placeholder="per item" required></div>
      </div>
      <button class="btn btn-primary" style="width:100%">Add listing</button>
    </form>
  `);
}

function expenseModal() {
  const businesses = myBusinesses();
  if (!businesses.length) return toast("Register a business first.");
  showModal("Record an expense", "Add a business cost to your local records.", `
    <form id="expenseForm">
      <div class="form-group"><label>Business</label><select class="field" name="businessId">${businesses.map(b => `<option value="${b.id}">${escapeHTML(b.name)}</option>`).join("")}</select></div>
      <div class="form-group"><label>Expense category</label>
        <select class="field" name="category"><option>Materials</option><option>Rent</option><option>Salaries</option><option>Transport</option><option>Utilities</option><option>Marketing</option><option>Other</option></select>
      </div>
      <div class="form-group"><label>Description</label><input class="field" name="description" required maxlength="120"></div>
      <div class="form-grid">
        <div class="form-group"><label>Amount (₹)</label><input class="field" name="amount" type="number" min="0.01" step="0.01" required></div>
        <div class="form-group"><label>Date</label><input class="field" name="date" type="date" value="${today()}" required></div>
      </div>
      <button class="btn btn-primary" style="width:100%">Save expense</button>
    </form>
  `);
}

function requestOrderModal(businessId, productId = "") {
  const business = businessById(businessId);
  if (!business) return;
  const user = currentUser();
  if (!user) return loginModal();

  const product = db.products.find(p => p.id === productId);
  showModal("Request a quotation", `Send your requirements to ${escapeHTML(business.name)}.`, `
    <form id="orderForm">
      <input type="hidden" name="businessId" value="${business.id}">
      ${product ? `<input type="hidden" name="productId" value="${product.id}"><div class="card" style="margin-bottom:15px"><strong>${escapeHTML(product.name)}</strong><p>${money(product.price)} / ${escapeHTML(product.unit)}</p></div>` : ""}
      <div class="form-group"><label>What do you need?</label><textarea name="description" required maxlength="1000" placeholder="Describe your requirements, specifications and preferences...">${product ? escapeHTML(product.name + ": " + product.description) : ""}</textarea></div>
      <div class="form-grid">
        <div class="form-group"><label>Quantity</label><input class="field" name="quantity" type="number" min="1" value="1" required></div>
        <div class="form-group"><label>Required by</label><input class="field" name="dueDate" type="date" min="${today()}"></div>
      </div>
      <button class="btn btn-primary" style="width:100%">Submit request</button>
    </form>
  `);
}

function showBusiness(businessId) {
  const b = businessById(businessId);
  if (!b) return;
  const products = db.products.filter(p => p.businessId === b.id);
  showModal(escapeHTML(b.name), `${escapeHTML(b.category)} · ${escapeHTML(b.city)} ${b.verified ? "· Verified demo" : ""}`, `
    <p>${escapeHTML(b.description)}</p>
    <p class="business-meta">Contact: ${escapeHTML(b.phone || "Not provided")}</p>
    <h3 style="margin-top:22px">Products & services</h3>
    ${products.length ? products.map(p => `
      <div class="card" style="margin:12px 0">
        <div style="display:flex;justify-content:space-between;gap:12px">
          <div><strong>${escapeHTML(p.name)}</strong><p>${escapeHTML(p.description)}</p><small>${money(p.price)} / ${escapeHTML(p.unit)}</small></div>
          <button class="btn btn-primary btn-small" data-action="request-product" data-business="${b.id}" data-product="${p.id}">Request</button>
        </div>
      </div>`).join("") : emptyState("No products or services listed yet.")}
    <button class="btn btn-dark" style="width:100%;margin-top:12px" data-action="request-business" data-id="${b.id}">Send custom request</button>
  `);
}

function showOrder(orderId) {
  const order = orderById(orderId);
  if (!order) return;
  const user = currentUser();
  const business = businessById(order.businessId);
  const owner = user && business && business.ownerId === user.id;
  const customer = user && order.customerId === user.id;
  const admin = user?.role === "admin";
  if (!owner && !customer && !admin) {
    toast("You do not have permission to view this order.");
    return;
  }

  let controls = "";
  if (owner && order.status === "Requested") {
    controls = `
      <div class="card" style="margin-top:16px">
        <h3>Send a quotation</h3>
        <form id="quoteForm">
          <input type="hidden" name="orderId" value="${order.id}">
          <div class="form-grid">
            <div class="form-group"><label>Quotation amount (₹)</label><input class="field" type="number" name="amount" min="0.01" step="0.01" required></div>
            <div class="form-group"><label>Estimated delivery date</label><input class="field" type="date" name="deliveryDate" min="${today()}" required></div>
          </div>
          <div class="form-group"><label>Quotation notes / terms</label><textarea name="note" maxlength="500"></textarea></div>
          <div class="modal-actions"><button class="btn btn-danger" type="button" data-action="reject-order" data-id="${order.id}">Reject request</button><button class="btn btn-primary">Send quotation</button></div>
        </form>
      </div>`;
  } else if (customer && order.status === "Quotation sent") {
    controls = `
      <div class="card" style="margin-top:16px;background:#fff8e9">
        <h3>Quotation received</h3>
        <p><strong>Amount:</strong> ${money(order.quote?.amount)}</p>
        <p><strong>Estimated delivery:</strong> ${escapeHTML(order.quote?.deliveryDate)}</p>
        <p>${escapeHTML(order.quote?.note || "No additional terms.")}</p>
        <div class="modal-actions">
          <button class="btn btn-danger" data-action="cancel-order" data-id="${order.id}">Decline</button>
          <button class="btn btn-primary" data-action="approve-quote" data-id="${order.id}">Approve quotation</button>
        </div>
      </div>`;
  } else if (customer && order.status === "Awaiting payment") {
    controls = `
      <div class="card" style="margin-top:16px;background:#fff8e9">
        <h3>Demo payment</h3>
        <p>Quotation total: <strong>${money(order.quote?.amount)}</strong></p>
        <p>This button only records a simulated payment in this browser. It does not transfer money.</p>
        <button class="btn btn-primary" style="width:100%;margin-top:12px" data-action="simulate-payment" data-id="${order.id}">Simulate successful payment</button>
      </div>`;
  } else if (owner && ["Confirmed", "In progress", "Ready"].includes(order.status)) {
    const next = { Confirmed: "In progress", "In progress": "Ready", Ready: "Completed" }[order.status];
    controls = `<div class="card" style="margin-top:16px"><h3>Update fulfilment</h3><p>Move this order to the next stage: <strong>${next}</strong>.</p><button class="btn btn-primary" data-action="advance-order" data-id="${order.id}">Mark as ${next}</button></div>`;
  }

  showModal("Order details", `Order ${order.id.slice(-7).toUpperCase()} · ${escapeHTML(business?.name || "")}`, `
    <div class="grid grid-3" style="grid-template-columns:repeat(2,1fr)">
      <div><small class="business-meta">Order status</small><p>${statusPill(order.status)}</p></div>
      <div><small class="business-meta">Payment status</small><p>${paymentPill(order.paymentStatus)}</p></div>
    </div>
    <div class="card" style="margin-top:12px">
      <p><strong>Customer:</strong> ${escapeHTML(db.users.find(u => u.id === order.customerId)?.name || "Customer")}</p>
      <p><strong>Request:</strong> ${escapeHTML(order.description)}</p>
      <p><strong>Quantity:</strong> ${escapeHTML(order.quantity)}</p>
      <p><strong>Required by:</strong> ${escapeHTML(order.dueDate || "Not specified")}</p>
      ${order.quote ? `<hr><p><strong>Quoted amount:</strong> ${money(order.quote.amount)}</p><p><strong>Delivery date:</strong> ${escapeHTML(order.quote.deliveryDate)}</p><p><strong>Quotation notes:</strong> ${escapeHTML(order.quote.note || "—")}</p>` : ""}
      ${order.paymentStatus === "Paid" ? `<p><strong>Recorded payment:</strong> ${money(order.paidAmount)}</p>` : ""}
    </div>
    <h3 style="margin-top:20px">Order activity</h3>
    <div class="card">${(order.history || []).map((h, i) => `<p>${i + 1}. ${escapeHTML(h)}</p>`).join("")}</div>
    ${controls}
  `);
}

function addHistory(order, message) {
  order.history = order.history || [];
  order.history.push(`${new Date().toLocaleString("en-IN")} — ${message}`);
}

function requireLogin(action) {
  if (!currentUser()) {
    toast("Please sign in first.");
    loginModal();
    return false;
  }
  return true;
}

/* =========================================================
   EVENT HANDLING
========================================================= */

document.addEventListener("click", event => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;
  const id = target.dataset.id;

  switch (action) {
    case "home": setPage("home"); break;
    case "explore": setPage("explore"); break;
    case "login": loginModal(); break;
    case "register": registerModal(); break;
    case "business-register":
    case "add-business": businessModal(); break;
    case "add-product": productModal(); break;
    case "add-expense": expenseModal(); break;
    case "close-modal": closeModal(); break;
    case "close-backdrop":
      if (event.target === target) closeModal();
      break;
    case "view-business": showBusiness(id); break;
    case "view-order": showOrder(id); break;
    case "request-business": closeModal(); requestOrderModal(id); break;
    case "request-product":
      closeModal();
      requestOrderModal(target.dataset.business, target.dataset.product);
      break;
    case "dashboard-tab":
      dashboardTab = target.dataset.tab;
      render();
      break;
    case "orders": setPage("orders"); break;
    case "request-order": requestOrderModal(id); break;
    case "approve-quote": {
      const order = orderById(id);
      if (!order || order.status !== "Quotation sent") break;
      order.status = "Awaiting payment";
      addHistory(order, "Customer approved the quotation. Awaiting payment.");
      save(); closeModal(); showOrder(id); toast("Quotation approved.");
      break;
    }
    case "simulate-payment": {
      const order = orderById(id);
      if (!order || order.status !== "Awaiting payment") break;
      order.paymentStatus = "Paid";
      order.paidAmount = Number(order.quote?.amount || 0);
      order.status = "Confirmed";
      addHistory(order, "Demo payment marked successful. No real money transferred.");
      save(); closeModal(); showOrder(id); toast("Demo payment recorded.");
      break;
    }
    case "advance-order": {
      const order = orderById(id);
      const next = { Confirmed: "In progress", "In progress": "Ready", Ready: "Completed" };
      if (!order || !next[order.status]) break;
      order.status = next[order.status];
      addHistory(order, `Business updated order to ${order.status}.`);
      save(); closeModal(); showOrder(id); toast("Order status updated.");
      break;
    }
    case "reject-order": {
      const order = orderById(id);
      if (!order) break;
      order.status = "Rejected";
      addHistory(order, "Business rejected the request.");
      save(); closeModal(); render(); toast("Request rejected.");
      break;
    }
    case "cancel-order": {
      const order = orderById(id);
      if (!order) break;
      order.status = "Cancelled";
      addHistory(order, "Customer declined the quotation.");
      save(); closeModal(); render(); toast("Quotation declined.");
      break;
    }
    case "verify-business": {
      const b = businessById(id);
      if (!b) break;
      b.verified = true;
      save(); render(); toast("Business marked as verified in this demo.");
      break;
    }
    case "reset-data":
      if (confirm("Reset all MANGO local demo data? This cannot be undone.")) {
        db = seedData();
        save();
        dashboardTab = "overview";
        setPage("home");
        toast("Demo data reset.");
      }
      break;
    case "logout":
      db.currentUserId = null;
      save();
      setPage("home");
      toast("Signed out.");
      break;
  }
});

document.addEventListener("submit", event => {
  const form = event.target;
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());

  if (form.id === "loginForm") {
    const user = db.users.find(u => u.email.toLowerCase() === data.email.toLowerCase() && u.password === data.password);
    if (!user) return toast("Incorrect email or password.");
    db.currentUserId = user.id;
    save(); closeModal(); setPage("dashboard"); toast(`Welcome, ${user.name}!`);
  }

  if (form.id === "registerForm") {
    if (db.users.some(u => u.email.toLowerCase() === data.email.toLowerCase())) {
      return toast("An account with this email already exists.");
    }
    const user = {
      id: uid("u"), name: data.name.trim(), email: data.email.trim(),
      password: data.password, role: data.role
    };
    db.users.push(user);
    db.currentUserId = user.id;
    save(); closeModal(); setPage("dashboard"); toast("Local demo account created.");
  }

  if (form.id === "businessForm") {
    const user = currentUser();
    if (!user) return toast("Please sign in first.");
    const business = {
      id: uid("b"), ownerId: user.id, name: data.name.trim(),
      category: data.category, city: data.city.trim(),
      phone: data.phone.trim(), description: data.description.trim(),
      verified: false, created: today()
    };
    db.businesses.push(business);
    save(); closeModal(); dashboardTab = "businesses"; setPage("dashboard");
    toast("Business profile submitted for demo review.");
  }

  if (form.id === "productForm") {
    const b = businessById(data.businessId);
    if (!b || b.ownerId !== currentUser()?.id) return toast("Invalid business selection.");
    db.products.push({
      id: uid("p"), businessId: data.businessId, name: data.name.trim(),
      description: data.description.trim(), price: Number(data.price), unit: data.unit.trim()
    });
    save(); closeModal(); render(); toast("Product/service added.");
  }

  if (form.id === "expenseForm") {
    const b = businessById(data.businessId);
    if (!b || b.ownerId !== currentUser()?.id) return toast("Invalid business selection.");
    db.expenses.push({
      id: uid("e"), businessId: data.businessId, category: data.category,
      description: data.description.trim(), amount: Number(data.amount), date: data.date
    });
    save(); closeModal(); render(); toast("Expense recorded.");
  }

  if (form.id === "orderForm") {
    const user = currentUser();
    const b = businessById(data.businessId);
    if (!user || !b || !b.verified || b.ownerId === user.id) {
      return toast("You cannot submit this request.");
    }
    const order = {
      id: uid("o"), customerId: user.id, businessId: b.id,
      description: data.description.trim(), quantity: Number(data.quantity),
      dueDate: data.dueDate || "", created: today(),
      status: "Requested", quote: null, paymentStatus: "Unpaid",
      paidAmount: 0, history: [`${new Date().toLocaleString("en-IN")} — Order request submitted.`]
    };
    db.orders.push(order);
    save(); closeModal(); setPage("orders"); toast("Order request submitted.");
  }

  if (form.id === "quoteForm") {
    const order = orderById(data.orderId);
    const b = order && businessById(order.businessId);
    if (!order || b?.ownerId !== currentUser()?.id || order.status !== "Requested") {
      return toast("You cannot quote this order.");
    }
    const amount = Number(data.amount);
    if (!Number.isFinite(amount) || amount <= 0) return toast("Enter a valid quotation amount.");
    order.quote = { amount, deliveryDate: data.deliveryDate, note: data.note.trim() };
    order.status = "Quotation sent";
    addHistory(order, `Quotation sent for ${money(amount)}.`);
    save(); closeModal(); showOrder(order.id); toast("Quotation sent to customer.");
  }
});

document.addEventListener("input", event => {
  if (event.target.id === "exploreSearch") {
    exploreSearch = event.target.value;
    const position = event.target.selectionStart;
    render();
    const input = document.getElementById("exploreSearch");
    input?.focus();
    input?.setSelectionRange(position, position);
  }
  if (event.target.id === "commissionInput") {
    const sales = Math.max(0, Number(event.target.value || 0));
    const result = document.getElementById("commissionResult");
    if (result) result.textContent = `Estimated commission: ${money(commissionFor(sales))}`;
  }
});

document.addEventListener("change", event => {
  if (event.target.id === "exploreCategory") {
    exploreCategory = event.target.value;
    render();
  }
});

document.getElementById("loginBtn").addEventListener("click", loginModal);
document.getElementById("logoutBtn").addEventListener("click", () => {
  db.currentUserId = null;
  save();
  setPage("home");
  toast("Signed out.");
});
document.getElementById("mobileMenu").addEventListener("click", () => {
  document.getElementById("mainNav").classList.toggle("open");
});
document.querySelectorAll(".nav-link").forEach(button => {
  button.addEventListener("click", () => setPage(button.dataset.page));
});

/* Start the application */
save();
render();
