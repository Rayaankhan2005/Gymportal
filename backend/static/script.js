const API_URL = "/api/users";

// Elements
const userTableBody = document.getElementById("userTableBody");
const emptyState = document.getElementById("emptyState");
const addUserBtn = document.getElementById("addUserBtn");
const userModal = document.getElementById("userModal");
const modalContent = document.getElementById("modalContent");
const closeBtn = document.getElementById("closeBtn");
const cancelBtn = document.getElementById("cancelBtn");
const userForm = document.getElementById("userForm");
const modalTitle = document.getElementById("modalTitle");
const planDurationSelect = document.getElementById("planDuration");
const joiningDateInput = document.getElementById("joiningDate");

// Stats Elements
// Stats Elements
// Dynamically selected in updateStats now, or keep references simple.

// Navigation Elements
const navDashboard = document.getElementById("navDashboard");
const navWorkouts = document.getElementById("navWorkouts");
const navSettings = document.getElementById("navSettings");
const navMembers = document.getElementById("navMembers"); // Same as dashboard for now
const dashboardSection = document.getElementById("dashboardSection");
const workoutsSection = document.getElementById("workoutsSection");
const settingsSection = document.getElementById("settingsSection");
const pageTitle = document.getElementById("pageTitle");
const pageSubtitle = document.getElementById("pageSubtitle");
const mainAddUserBtn = document.getElementById("addUserBtn");
const searchInput = document.getElementById("searchInput");
const filterStatus = document.getElementById("filterStatus");
const filterPlan = document.getElementById("filterPlan");

// State
let isEditing = false;
let currentUserId = null;
let allUsers = []; // Store all users for filtering

// Initial Load
document.addEventListener("DOMContentLoaded", () => {
  // Check Theme
  const isDark = localStorage.getItem("theme") === "dark";
  if (isDark) document.documentElement.classList.add("dark");
  updateThemeIcon();

  fetchUsers();
  setupNavigation();

  // Listeners
  searchInput.addEventListener("input", applyFilters);
  filterStatus.addEventListener("change", applyFilters);
  filterPlan.addEventListener("change", applyFilters);
});

// Theme Logic
function toggleTheme() {
  const html = document.documentElement;
  html.classList.toggle("dark");
  const isDark = html.classList.contains("dark");
  localStorage.setItem("theme", isDark ? "dark" : "light");
  updateThemeIcon();
}

function updateThemeIcon() {
  const isDark = document.documentElement.classList.contains("dark");
  document.getElementById("themeIcon").innerText = isDark ? "☀️" : "🌙";
}

// Unified Filter Logic
function applyFilters() {
  const term = searchInput.value.toLowerCase();
  const status = filterStatus.value;
  const plan = filterPlan.value;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filtered = allUsers.filter((user) => {
    // Search Filter
    const matchesSearch =
      user.name.toLowerCase().includes(term) ||
      user.email.toLowerCase().includes(term) ||
      user.phone.includes(term);

    // Plan Filter
    // User plan is loose text like "1 Month", "3 Months"
    // Dropdown values: "1 Month", "3 Months", "6 Months", "1 Year"
    let matchesPlan = false;
    if (plan === "All") {
      matchesPlan = true;
    } else {
      // Simple string match or normalized check
      if (user.plan_type === plan) matchesPlan = true;

      // Handle variations (e.g. if DB has different format)
      if (plan === "1 Year" && user.plan_type === "12 Months")
        matchesPlan = true;
    }

    // Status Filter
    const expiry = new Date(user.expiry_date);
    expiry.setHours(0, 0, 0, 0);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let matchesStatus = false;
    if (status === "All") matchesStatus = true;
    else if (status === "Active" && diffDays >= 0) matchesStatus = true;
    else if (status === "Expired" && diffDays < 0) matchesStatus = true;
    else if (status === "Expiring" && diffDays >= 0 && diffDays <= 5)
      matchesStatus = true;

    return matchesSearch && matchesPlan && matchesStatus;
  });

  renderUsers(filtered);
}

// Navigation Logic (SPA)
function setupNavigation() {
  function setActive(link) {
    // Reset styles
    [navDashboard, navWorkouts, navSettings, navMembers].forEach((el) => {
      el.className =
        "flex items-center space-x-3 px-4 py-3 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100 rounded-xl transition-all";
    });
    // Set active style
    link.className =
      "flex items-center space-x-3 px-4 py-3 bg-red-100 text-red-600 dark:bg-primary-600/20 dark:text-primary-400 border border-red-200 dark:border-primary-500/20 rounded-xl transition-all shadow-lg shadow-red-500/10 dark:shadow-primary-500/10";
  }

  function hideAllSections() {
    dashboardSection.classList.add("hidden");
    workoutsSection.classList.add("hidden");
    settingsSection.classList.add("hidden");
  }

  // Dashboard Click
  navDashboard.onclick = (e) => {
    e.preventDefault();
    hideAllSections();
    dashboardSection.classList.remove("hidden");
    setActive(navDashboard);
    pageTitle.innerText = "Overview";
    pageSubtitle.innerText = "Welcome back, get ready to train!";
    mainAddUserBtn.style.display = "flex";
  };

  // Members Click (Same as Dashboard)
  navMembers.onclick = (e) => {
    e.preventDefault();
    navDashboard.click();
  };

  // Workouts Click
  navWorkouts.onclick = (e) => {
    e.preventDefault();
    hideAllSections();
    workoutsSection.classList.remove("hidden");
    setActive(navWorkouts);
    pageTitle.innerText = "Programs";
    pageSubtitle.innerText = "Explore our workout plans.";
    mainAddUserBtn.style.display = "none";
  };

  // Settings Click
  navSettings.onclick = (e) => {
    e.preventDefault();
    hideAllSections();
    settingsSection.classList.remove("hidden");
    setActive(navSettings);
    pageTitle.innerText = "Settings";
    pageSubtitle.innerText = "Configure your dashboard.";
    mainAddUserBtn.style.display = "none";
  };
}

// Auto-set Expiry Date based on Joining Date + Plan Duration
function updateExpiry() {
  const months = parseInt(planDurationSelect.value);
  const joiningDateVal = joiningDateInput.value;

  if (!joiningDateVal) return;

  const date = new Date(joiningDateVal);
  date.setMonth(date.getMonth() + months);

  // Format to YYYY-MM-DD
  const dateString = date.toISOString().split("T")[0];
  document.getElementById("expiryDate").value = dateString;
}

// Fetch Users
async function fetchUsers() {
  try {
    const response = await fetch(API_URL);
    const users = await response.json();
    allUsers = users; // Save for search
    renderUsers(users);
    updateStats(users);
    // renderChart(users); // Removed
  } catch (error) {
    console.error("Error fetching users:", error);
  }
}

// Update Dashboard Stats
function updateStats(users) {
  let active = 0;
  let expiringSoon = 0;
  let expired = 0;
  let revenue = 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  users.forEach((user) => {
    const expiry = new Date(user.expiry_date);
    expiry.setHours(0, 0, 0, 0);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays >= 0) {
      active++;
      if (diffDays <= 5) expiringSoon++;
    } else {
      expired++;
    }

    if (user.amount) revenue += parseFloat(user.amount);
  });

  document.getElementById("statActiveMembers").innerText = active;
  document.getElementById("statExpiringSoon").innerText = expiringSoon;
  document.getElementById("statExpired").innerText = expired;

  const statTotalRevenue = document.getElementById("statTotalRevenue");
  statTotalRevenue.innerText = "₹" + revenue.toLocaleString("en-IN");

  // Highlight Warning colors
  const expiringSoonEl = document.getElementById("statExpiringSoon");
  const expiredEl = document.getElementById("statExpired");

  if (expiringSoon > 0) expiringSoonEl.classList.add("text-yellow-400");
  else expiringSoonEl.classList.remove("text-yellow-400");

  if (expired > 0) expiredEl.classList.add("text-red-400");
  else expiredEl.classList.remove("text-red-400");
}

// Render Users
function renderUsers(users) {
  userTableBody.innerHTML = "";

  if (users.length === 0) {
    emptyState.classList.remove("hidden");
    return;
  }
  emptyState.classList.add("hidden");

  users.forEach((user) => {
    const tr = document.createElement("tr");
    tr.className =
      "hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group border-b border-slate-200 dark:border-slate-800/30";

    // Calculate status & Remaining Days
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today
    const expiry = new Date(user.expiry_date);
    expiry.setHours(0, 0, 0, 0); // Normalize expiry

    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let statusClass = "";
    let statusText = "";

    if (diffDays < 0) {
      // Expired
      statusClass = "bg-red-500/10 text-red-400 border border-red-500/20";
      statusText = `Expired (${Math.abs(diffDays)} days ago)`;
    } else if (diffDays <= 5) {
      // Expiring Soon (Warning)
      statusClass =
        "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20";
      statusText = `Expiring (${diffDays} days left)`;
    } else {
      // Active
      statusClass =
        "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
      statusText = `Active (${diffDays} days left)`;
    }

    // Payment Badge Style
    const paymentMethod = user.payment_method || "Cash";
    let paymentDisplay = `<span class="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded border border-slate-700">Cash 💵</span>`;

    if (paymentMethod.includes("GPay")) {
      paymentDisplay = `<img src="/static/assets/gpay.png" alt="GPay" class="h-6 object-contain" title="Google Pay">`;
    } else if (paymentMethod.includes("PhonePe")) {
      paymentDisplay = `<img src="/static/assets/phonepe.png" alt="PhonePe" class="h-6 object-contain" title="PhonePe">`;
    } else if (paymentMethod.includes("Paytm")) {
      paymentDisplay = `<img src="/static/assets/paytm.png" alt="Paytm" class="h-8 object-contain" title="Paytm">`;
    }

    tr.innerHTML = `
            <td class="p-5">
                <div class="flex items-center space-x-3">
                    <div class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500 dark:text-slate-400">${user.name.charAt(
                      0
                    )}</div>
                    <div>
                         <div class="font-medium text-slate-900 dark:text-slate-100">${
                           user.name
                         }</div>
                         <div class="text-xs text-slate-500">${user.phone}</div>
                    </div>
                </div>
            </td>
            <td class="p-5">
                <div class="text-slate-700 dark:text-slate-300 text-sm font-medium">${
                  user.plan_type
                }</div>
                <div class="text-xs text-slate-500">${user.workout_type}</div>
            </td>
            <td class="p-5 text-slate-500 dark:text-slate-400 font-mono text-xs">${
              user.joining_date || "-"
            }</td>
            <td class="p-5 text-slate-500 dark:text-slate-400 font-mono text-xs">${
              user.expiry_date
            }</td>
             <td class="p-5">
                 <div class="flex items-center space-x-3">
                     <span class="text-sm text-slate-700 dark:text-slate-300 font-mono">₹${
                       user.amount || 0
                     }</span>
                     ${paymentDisplay}
                 </div>
            </td>
            <td class="p-5">
                <span class="px-2.5 py-1 rounded-full text-xs font-medium ${statusClass}">
                    ${statusText}
                </span>
            </td>
            <td class="p-5 text-right w-40">
                <div class="flex justify-end space-x-1 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button onclick="printReceipt(${
                      user.id
                    })" class="p-2 text-primary-500 dark:text-primary-400 hover:bg-primary-500/10 rounded-lg transition-colors" title="Print Receipt">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                    </button>
                    <button onclick="editUser(${user.id}, '${user.name.replace(
      /'/g,
      "\\'"
    )}', '${user.email.replace(/'/g, "\\'")}', '${user.phone}', '${
      user.plan_type
    }', '${user.workout_type}', '${user.expiry_date}', '${(
      user.payment_method || "Cash"
    ).replace(/'/g, "\\'")}', ${user.amount || 0}, '${
      user.joining_date || ""
    }')" 
                        class="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-500/10 rounded-lg transition-colors" title="Edit">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                    </button>
                    <button onclick="deleteUser(${user.id})"
                        class="p-2 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors" title="Delete">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2-2H7a2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
            </td>
        `;
    userTableBody.appendChild(tr);
  });
}

// Modal Logic
function openModal() {
  userModal.classList.remove("hidden");
  userModal.classList.add("flex");
  setTimeout(() => {
    userModal.classList.remove("opacity-0");
    modalContent.classList.remove("scale-95");
    modalContent.classList.add("scale-100");
  }, 10);
}

function closeModal() {
  userModal.classList.add("opacity-0");
  modalContent.classList.remove("scale-100");
  modalContent.classList.add("scale-95");
  setTimeout(() => {
    userModal.classList.add("hidden");
    userModal.classList.remove("flex");
  }, 300);
}

addUserBtn.onclick = () => {
  isEditing = false;
  currentUserId = null;
  modalTitle.innerText = "New Membership";
  userForm.reset();

  // Default Joining Date to Today
  const today = new Date().toISOString().split("T")[0];
  joiningDateInput.value = today;

  updateExpiry();
  openModal();
};

closeBtn.onclick = closeModal;
cancelBtn.onclick = closeModal;
userModal.onclick = (event) => {
  if (event.target === userModal) {
    closeModal();
  }
};

// Handle Form Submit
userForm.onsubmit = async (e) => {
  e.preventDefault();

  // Get Plan Text mapping
  const planMap = {
    1: "1 Month",
    3: "3 Months",
    6: "6 Months",
    12: "1 Year",
  };
  const durationVal = document.getElementById("planDuration").value;

  const formData = {
    name: document.getElementById("name").value,
    email: document.getElementById("email").value,
    phone: document.getElementById("phone").value,
    plan_type: planMap[durationVal] || "Custom",
    workout_type: document.getElementById("workoutType").value,
    joining_date: document.getElementById("joiningDate").value,
    expiry_date: document.getElementById("expiryDate").value,
    payment_method: document.getElementById("paymentMethod").value,
    amount: document.getElementById("amount").value,
  };

  try {
    let response;
    if (isEditing) {
      response = await fetch(`${API_URL}/${currentUserId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
    } else {
      response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
    }

    if (response.ok) {
      closeModal();
      fetchUsers();
    } else {
      alert("Error saving user");
    }
  } catch (error) {
    console.error("Error:", error);
  }
};

// Edit User
window.editUser = (
  id,
  name,
  email,
  phone,
  plan,
  workout,
  expiry,
  payment,
  amount,
  joining
) => {
  isEditing = true;
  currentUserId = id;
  modalTitle.innerText = "Edit Membership";

  document.getElementById("name").value = name;
  document.getElementById("email").value = email;
  document.getElementById("phone").value = phone;
  document.getElementById("workoutType").value = workout;
  document.getElementById("expiryDate").value = expiry;
  document.getElementById("paymentMethod").value = payment;
  document.getElementById("amount").value = amount;
  document.getElementById("joiningDate").value = joining;

  // Reverse map plan for select (simple heuristic)
  let duration = "1";
  if (plan.includes("3")) duration = "3";
  if (plan.includes("6")) duration = "6";
  if (plan.includes("Year")) duration = "12";
  document.getElementById("planDuration").value = duration;

  openModal();
};

// Print Receipt (Professional Invoice)
window.printReceipt = (id) => {
  const user = allUsers.find((u) => u.id === id);
  if (!user) return;

  const today = new Date();
  const dateStr = today.toISOString().split("T")[0]; // YYYY-MM-DD
  const invoiceId = `INV-${today.getFullYear()}${String(
    today.getMonth() + 1
  ).padStart(2, "0")}-${String(Math.floor(Math.random() * 1000)).padStart(
    3,
    "0"
  )}`;

  // Format dates for display
  const formatDate = (d) =>
    new Date(d).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  const billingDate = formatDate(dateStr);
  const joiningDate = user.joining_date ? formatDate(user.joining_date) : "-";
  const expiryDate = formatDate(user.expiry_date);

  const printWindow = window.open("", "_blank", "width=800,height=800");
  printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <title>Invoice #${invoiceId}</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
                body { font-family: 'Inter', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                .print-hidden { display: none; }
                @media print {
                    .no-print { display: none; }
                    body { padding: 0; margin: 0; }
                }
            </style>
        </head>
        <body class="bg-gray-50 p-8 md:p-12 max-w-4xl mx-auto">
            
            <div class="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-200">
                <!-- Header -->
                <div class="bg-slate-900 text-white p-8 flex justify-between items-start">
                    <div>
                        <h1 class="text-3xl font-bold tracking-wider uppercase">INVOICE</h1>
                        <p class="text-slate-400 mt-1">Gym Management Portal</p>
                    </div>
                    <div class="text-right">
                        <h2 class="text-xl font-semibold">Gym Management Portal</h2>
                        <p class="text-sm text-slate-300 mt-1">123 Fitness Street, Wellness City</p>
                        <p class="text-sm text-slate-300">contact@gymportal.com | +91 98765 43210</p>
                    </div>
                </div>

                <!-- Info Block -->
                <div class="p-8 grid grid-cols-2 gap-8 border-b border-gray-100">
                    <div>
                        <p class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Billed To</p>
                        <h3 class="text-xl font-bold text-gray-900">${
                          user.name
                        }</h3>
                        <p class="text-sm text-gray-500 mt-1">${user.phone}</p>
                        <p class="text-sm text-gray-500">${user.email}</p>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <p class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Invoice Number</p>
                            <p class="font-mono font-medium text-gray-700">#${invoiceId}</p>
                        </div>
                        <div>
                            <p class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Billing Date</p>
                            <p class="font-medium text-gray-700">${billingDate}</p>
                        </div>
                        <div>
                            <p class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Joining Date</p>
                            <p class="font-medium text-gray-700">${joiningDate}</p>
                        </div>
                        <div>
                            <p class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Payment Method</p>
                            <p class="font-medium text-gray-700">${
                              user.payment_method || "Cash"
                            }</p>
                        </div>
                    </div>
                </div>

                <!-- Table -->
                <div class="p-8">
                    <table class="w-full text-left">
                        <thead>
                            <tr class="border-b-2 border-slate-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                <th class="pb-3 pl-2">Description</th>
                                <th class="pb-3">Type</th>
                                <th class="pb-3">Valid Until</th>
                                <th class="pb-3 text-right pr-2">Amount</th>
                            </tr>
                        </thead>
                        <tbody class="text-sm">
                            <tr class="border-b border-gray-50">
                                <td class="py-4 pl-2">
                                    <p class="font-bold text-gray-800">Gym Membership Plan</p>
                                    <p class="text-gray-500 text-xs mt-0.5">${
                                      user.plan_type
                                    } Access</p>
                                </td>
                                <td class="py-4 font-medium text-gray-600">${
                                  user.workout_type
                                }</td>
                                <td class="py-4 font-medium text-gray-600">${expiryDate}</td>
                                <td class="py-4 font-bold text-gray-900 text-right pr-2">₹${
                                  user.amount || 0
                                }</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Footer / Total -->
                <div class="bg-gray-50 p-8 border-t border-gray-200">
                    <div class="flex justify-end items-center">
                        <div class="text-right">
                             <p class="text-sm text-gray-500 mb-1">Subtotal</p>
                             <p class="text-2xl font-bold text-slate-900">Total</p>
                        </div>
                        <div class="w-32 text-right">
                             <p class="text-sm font-medium text-gray-700 mb-1">₹${
                               user.amount || 0
                             }</p>
                             <p class="text-2xl font-bold text-primary-600">₹${
                               user.amount || 0
                             }</p>
                        </div>
                    </div>
                    
                    <div class="mt-12 pt-8 border-t border-gray-200 grid grid-cols-2 gap-8 items-end">
                        <div>
                            <p class="text-xs text-gray-400 mb-2">Terms & Conditions:</p>
                            <p class="text-[10px] text-gray-400 leading-relaxed">
                                1. Fees once paid are non-refundable.<br>
                                2. Membership is non-transferable.<br>
                                3. Please retain this invoice for future reference.
                            </p>
                        </div>
                        <div class="text-right">
                             <div class="h-10 mb-2"></div>
                             <p class="text-xs font-bold text-gray-400 uppercase border-t border-gray-300 inline-block pt-2 w-40 text-center">Authorized Signatory</p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="text-center mt-8 no-print">
                <button onclick="window.print()" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium shadow-lg transition-colors flex items-center justify-center mx-auto space-x-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                    <span>Print Invoice</span>
                </button>
            </div>

            <script>
                // Auto print after a short delay to ensure styles load
                window.onload = function() {
                    setTimeout(() => {
                         // window.print();
                    }, 500);
                }
            </script>
        </body>
        </html>
    `);
  printWindow.document.close();
};

// Delete User
window.deleteUser = async (id) => {
  if (confirm("Are you sure you want to delete this member?")) {
    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        fetchUsers();
      }
    } catch (error) {
      console.error("Error deleting user:", error);
    }
  }
};

// Mobile Sidebar Logic
const sidebar = document.getElementById("sidebar");
const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const sidebarOverlay = document.getElementById("sidebarOverlay");

function toggleSidebar() {
  const isClosed = sidebar.classList.contains("-translate-x-full");
  if (isClosed) {
    // Open
    sidebar.classList.remove("-translate-x-full");
    sidebarOverlay.classList.remove("hidden");
  } else {
    // Close
    sidebar.classList.add("-translate-x-full");
    sidebarOverlay.classList.add("hidden");
  }
}

if (mobileMenuBtn) {
  mobileMenuBtn.addEventListener("click", toggleSidebar);
}

if (sidebarOverlay) {
  sidebarOverlay.addEventListener("click", toggleSidebar);
}

// Close sidebar when clicking a nav item on mobile
const navLinks = sidebar.querySelectorAll("a");
navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    // Only close if we are on mobile (check overlay visibility or window width)
    if (window.innerWidth < 768) {
      toggleSidebar();
    }
  });
});
