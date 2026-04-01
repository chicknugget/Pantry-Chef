const API = "http://localhost:8000";

// ═══════════════════════════════════════
// STATE
// ═══════════════════════════════════════
let pantryItems = [];
let chatHistory = [];
let pastRecipes = [];
let activeItemId = null;
let currentCategoryIndex = 0;
let manualShoppingItems = JSON.parse(localStorage.getItem("manualShoppingItems") || "[]");

const CATEGORIES = ["meat", "vegetable", "dairy", "other"];

const CATEGORY_LABELS = {
  meat: "Meats & Proteins",
  vegetable: "Vegetables & Fruits",
  dairy: "Dairy",
  other: "Miscellaneous"
};

const TUP_IMAGES = {
  meat: "assets/meat-lunchbox.png",
  vegetable: "assets/veggie-lunchbox.png",
  dairy: "assets/dairy-lunchbox.png",
  other: "assets/other-lunchbox.png"
};

// ═══════════════════════════════════════
// SCROLL NAV
// ═══════════════════════════════════════
function scrollToSection(id) {
  document.getElementById(id).scrollIntoView({ behavior: "smooth" });
}

// ═══════════════════════════════════════
// PANTRY — LOAD
// ═══════════════════════════════════════
async function loadPantry() {
  try {
    const res = await fetch(`${API}/pantry/`);
    pantryItems = await res.json();
    renderShelves();
    checkLowStock();
  } catch (e) {
    console.error("Could not load pantry:", e);
  }
}

// ═══════════════════════════════════════
// TUPPERWARE RENDER
// ═══════════════════════════════════════
function tupImage(cat) {
  const c = (cat || "other").toLowerCase();
  if (c === "meat") return TUP_IMAGES.meat;
  if (c === "vegetable" || c === "veg") return TUP_IMAGES.vegetable;
  if (c === "dairy") return TUP_IMAGES.dairy;
  return TUP_IMAGES.other;
}

function renderTupperware(item) {
  const img   = tupImage(item.category);
  const isLow = item.quantity <= 0 ||
                (item.low_threshold > 0 && item.quantity <= item.low_threshold);

  return `
    <div class="tupperware ${isLow ? "tup-low" : ""}"
         onclick="openItemModal(${item.id})"
         title="${item.name}">
      ${isLow ? `<div class="low-dot"><span>!</span></div>` : ""}
      <img src="${img}" alt="${item.category || "item"}" class="tup-img" />
      <div class="tup-name">${item.name}</div>
      <div class="tup-qty">${item.quantity} ${item.unit}</div>
    </div>
  `;
}

// ═══════════════════════════════════════
// SHELVES RENDER
// ═══════════════════════════════════════
function renderShelves() {
  const container = document.getElementById("pantry-shelves");
  if (!container) return;

  // group items by category
  const grouped = {};
  CATEGORIES.forEach(c => grouped[c] = []);
  pantryItems.forEach(item => {
    const cat = (item.category || "other").toLowerCase();
    const key = CATEGORIES.includes(cat) ? cat : "other";
    grouped[key].push(item);
  });

  container.innerHTML = CATEGORIES.map((cat, catIdx) => {
    const items = grouped[cat];

    // distribute items across 4 shelves
    const shelves = [[], [], [], []];
    items.forEach((item, i) => shelves[i % 4].push(item));

    const shelvesHTML = shelves.map(shelfItems => `
      <div class="shelf">
        ${shelfItems.map(renderTupperware).join("")}
      </div>
    `).join("");

    return `
      <div class="category-block ${catIdx === currentCategoryIndex ? "active" : ""}"
           data-cat="${cat}">
        ${shelvesHTML}
      </div>
    `;
  }).join("");

  updateShelfNav();
}

function prevCategory() {
  const prev = currentCategoryIndex - 1;
  if (prev >= 0) goToCategory(prev);
}

function updateShelfNav() {
  const dotsEl = document.getElementById("category-dots");
  const prevBtn = document.getElementById("shelf-prev-btn");
  const nextBtn = document.getElementById("shelf-next-btn");

  // show/hide arrows based on position
  if (prevBtn) prevBtn.style.visibility = currentCategoryIndex === 0 ? "hidden" : "visible";
  if (nextBtn) nextBtn.style.visibility = currentCategoryIndex === CATEGORIES.length - 1 ? "hidden" : "visible";

  if (dotsEl) {
    dotsEl.innerHTML = CATEGORIES.map((cat, i) => `
      <div class="category-dot ${i === currentCategoryIndex ? "active" : ""}"
           title="${CATEGORY_LABELS[cat]}"
           onclick="goToCategory(${i})"></div>
    `).join("");
  }
}

function goToCategory(i) {
  currentCategoryIndex = i;
  document.querySelectorAll(".category-block").forEach((el, idx) => {
    el.classList.toggle("active", idx === i);
  });
  updateShelfNav();
}

function nextCategory() {
  const next = (currentCategoryIndex + 1) % CATEGORIES.length;
  goToCategory(next);
}


// ═══════════════════════════════════════
// ADD ITEM
// ═══════════════════════════════════════
async function addItem() {
  const name = document.getElementById("item-name").value.trim();
  const qty = parseFloat(document.getElementById("item-qty").value);
  const unit = document.getElementById("item-unit").value;
  const category = document.getElementById("item-category").value || "other";
  const threshold = parseFloat(document.getElementById("item-threshold").value) || 0;

  if (!name || !qty || qty <= 0) {
    alert("Please enter a name and a valid quantity.");
    return;
  }

  try {
    const res = await fetch(`${API}/pantry/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, quantity: qty, unit, category, low_threshold: threshold })
    });

    if (!res.ok) {
      const err = await res.json();
      alert("Error: " + JSON.stringify(err.detail));
      return;
    }

    ["item-name", "item-qty", "item-threshold"].forEach(id =>
      document.getElementById(id).value = ""
    );
    document.getElementById("item-category").value = "other";
    await loadPantry();

  } catch (e) {
    alert("Could not connect to server.");
  }
}

// ═══════════════════════════════════════
// LOW STOCK
// ═══════════════════════════════════════
async function checkLowStock() {
  try {
    const res   = await fetch(`${API}/pantry/low-stock`);
    const items = await res.json();

    // also catch anything at zero even without threshold set
    const zeroItems = pantryItems.filter(i => i.quantity <= 0);
    const allLow    = [...items, ...zeroItems.filter(z => !items.find(i => i.id === z.id))];

    const banner = document.getElementById("low-stock-banner");
    if (allLow.length > 0) {
      document.getElementById("low-stock-text").textContent =
        `Running low on: ${allLow.map(i => i.name).join(", ")}`;
      banner.style.display = "flex";
    } else {
      banner.style.display = "none";
    }

    // re-render shelves so red indicators update
    renderShelves();

  } catch(e) {}
}

// ═══════════════════════════════════════
// ITEM MODAL
// ═══════════════════════════════════════
function openItemModal(id) {
  const item = pantryItems.find(i => i.id === id);
  if (!item) return;
  activeItemId = id;
  document.getElementById("modal-item-name").textContent = item.name;
  document.getElementById("modal-qty").value = item.quantity;
  document.getElementById("modal-unit").value = item.unit;
  document.getElementById("modal-threshold").value = item.low_threshold;
  document.getElementById("item-modal").style.display = "flex";
}

function closeItemModal() {
  document.getElementById("item-modal").style.display = "none";
  activeItemId = null;
}

function closeModal(e) {
  if (e.target.id === "item-modal") closeItemModal();
}

function adjustQty(delta) {
  const input = document.getElementById("modal-qty");
  const val = parseFloat(input.value) || 0;
  input.value = Math.max(0.1, +(val + delta).toFixed(1));
}

async function saveItemEdit() {
  if (!activeItemId) return;
  const qty = parseFloat(document.getElementById("modal-qty").value);
  const unit = document.getElementById("modal-unit").value.trim();
  const threshold = parseFloat(document.getElementById("modal-threshold").value) || 0;
  try {
    await fetch(`${API}/pantry/${activeItemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: qty, unit, low_threshold: threshold })
    });
    closeItemModal();
    await loadPantry();
  } catch (e) {
    alert("Could not save changes.");
  }
}

async function deleteItem() {
  if (!activeItemId) return;
  if (!confirm("Remove this item from your pantry?")) return;
  try {
    await fetch(`${API}/pantry/${activeItemId}`, { method: "DELETE" });
    closeItemModal();
    await loadPantry();
  } catch (e) {
    alert("Could not delete item.");
  }
}

// ═══════════════════════════════════════
// RECIPES — CHAT
// ═══════════════════════════════════════
async function sendMessage() {
  const input = document.getElementById("chat-input");
  const msg = input.value.trim();
  if (!msg) return;
  input.value = "";

  const dietaryGoal = document.getElementById("dietary-goal").value.trim();
  const allergiesRaw = document.getElementById("allergies").value.trim();
  const allergies = allergiesRaw ? allergiesRaw.split(",").map(s => s.trim()) : [];

  chatHistory.push({ role: "user", content: msg });
  appendChatMsg("user", msg);

  const typingId = appendTyping();

  try {
    const res = await fetch(`${API}/recipes/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        history: chatHistory,
        dietary_goal: dietaryGoal || null,
        allergies: allergies.length ? allergies : null
      })
    });

    const data = await res.json();
    removeTyping(typingId);

    const reply = data.response;
    const ytLink = data.youtube_link;
    const recipeName = data.recipe_name;

    chatHistory.push({ role: "assistant", content: reply });

    let extra = "";
    if (ytLink && recipeName !== "this recipe") {
      extra = `\n\n<a class="yt-card" href="${ytLink}" target="_blank">&#9654; Watch: ${recipeName} on YouTube</a>`;
    }
    appendChatMsg("assistant", reply + extra);
    if (data.recipe_name && data.recipe_name !== "this recipe") {
      appendMadeThisBtn(data.recipe_name, reply);
    }
    if (data.recipe_name && data.recipe_name !== "this recipe") {
      pastRecipes.push({
        name: data.recipe_name,
        recipe: reply,
        youtube: ytLink || null
      });
    }

  } catch (e) {
    removeTyping(typingId);
    appendChatMsg("assistant", "Sorry, I couldn't reach the server. Make sure the backend is running.");
  }
}

function appendMadeThisBtn(recipeName, recipeText) {
  const win = document.getElementById("chat-window");
  const div = document.createElement("div");
  div.className = "chat-msg assistant";
  div.innerHTML = `
    <button class="btn-made-this" onclick="handleMadeThis('${recipeName.replace(/'/g, "\\'")}', this)">
      &#10003; I made this — update my pantry
    </button>
  `;
  win.appendChild(div);
  win.scrollTop = win.scrollHeight;
}

async function handleMadeThis(recipeName, btn) {
  btn.disabled = true;
  btn.textContent = "updating pantry...";

  // ask the LLM to extract ingredients and amounts from the last recipe
  try {
    const res = await fetch(`${API}/recipes/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        history: [
          {
            role: "user",
            content: `From the recipe "${recipeName}", list only the ingredients and amounts used. Reply ONLY with a JSON array like: [{"name": "eggs", "amount": 2}, {"name": "rice", "amount": 200}]. No other text.`
          }
        ]
      })
    });

    const data = await res.json();
    const text = data.response.trim();

    // extract JSON from response
    const jsonMatch = text.match(/\[.*\]/s);
    if (!jsonMatch) throw new Error("Could not parse ingredients");

    const ingredients = JSON.parse(jsonMatch[0]);

    // deduct from pantry
    const deductRes = await fetch(`${API}/recipes/deduct`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ingredients })
    });

    const result = await deductRes.json();

    btn.textContent = "✓ pantry updated!";
    btn.style.background = "#2d6a2d";

    let msg = `Pantry updated after making ${recipeName}!`;
    if (result.not_found?.length) {
      msg += `\nCouldn't find: ${result.not_found.join(", ")} — you may need to add them manually.`;
    }
    appendChatMsg("assistant", msg);
    await loadPantry();

  } catch (e) {
    btn.textContent = "failed — try again";
    btn.disabled = false;
    appendChatMsg("assistant", "Sorry, I couldn't update the pantry automatically. Try editing quantities manually.");
  }
}

function appendChatMsg(role, content) {
  const win = document.getElementById("chat-window");
  const div = document.createElement("div");
  div.className = `chat-msg ${role}`;
  div.innerHTML = `<div class="msg-bubble">${content}</div>`;
  win.appendChild(div);
  win.scrollTop = win.scrollHeight;
}

function appendTyping() {
  const win = document.getElementById("chat-window");
  const id = "typing-" + Date.now();
  const div = document.createElement("div");
  div.className = "chat-msg assistant";
  div.id = id;
  div.innerHTML = `<div class="msg-bubble"><div class="typing-dots">
    <span></span><span></span><span></span>
  </div></div>`;
  win.appendChild(div);
  win.scrollTop = win.scrollHeight;
  return id;
}

function removeTyping(id) { document.getElementById(id)?.remove(); }

function loadPastRecipes() {
  if (!pastRecipes.length) {
    appendChatMsg("assistant", "No recipes yet this session — ask me for one first!");
    return;
  }
  const list = pastRecipes.map(r => `• ${r.name}`).join("\n");
  appendChatMsg("assistant", `Recipes from this session:\n${list}\n\nAsk me about any of them to see the full recipe again.`);
}

// ═══════════════════════════════════════
// SHOPPING LIST
// ═══════════════════════════════════════
async function loadShoppingList() {
  try {
    const res      = await fetch(`${API}/pantry/shopping-list`);
    const apiItems = await res.json();

    // also add zero quantity items not already in list
    const zeroItems = pantryItems
      .filter(i => i.quantity <= 0 && !apiItems.find(a => a.name === i.name))
      .map(i => ({
        name:             i.name,
        current_quantity: 0,
        unit:             i.unit
      }));

    renderShoppingList([...apiItems, ...zeroItems]);
  } catch(e) {
    document.getElementById("shopping-items").innerHTML =
      `<div class="shopping-empty">Could not load — is the server running?</div>`;
  }
}

function renderShoppingList(apiItems) {
  const container = document.getElementById("shopping-items");

  const allItems = [
    ...apiItems.map(i => ({
      name:   i.name,
      detail: `have ${i.current_quantity} ${i.unit}, need more`,
      source: "auto"
    })),
    ...manualShoppingItems.map(name => ({
      name,
      detail: "added manually",
      source: "manual"
    }))
  ];

  if (!allItems.length) {
    container.innerHTML = `<div class="shopping-empty">All stocked up! Nothing is running low.</div>`;
    return;
  }

  container.innerHTML = allItems.map((item, i) => `
    <div class="shopping-item" id="shop-item-${i}">
      <input type="checkbox" onchange="toggleShopItem(${i}, this)">
      <span class="shopping-item-name">${item.name}</span>
      <span class="shopping-item-qty">${item.detail}</span>
      <button class="shop-delete-btn" onclick="deleteShoppingItem(${i}, '${item.source}', '${item.name}')">&#10005;</button>
    </div>
  `).join("");
}

function toggleShopItem(i, cb) {
  document.getElementById(`shop-item-${i}`).classList.toggle("checked", cb.checked);
}

function addManualItem() {
  const wrap = document.getElementById("manual-add-wrap");
  wrap.style.display = wrap.style.display === "none" ? "flex" : "none";
  if (wrap.style.display === "flex") document.getElementById("manual-item").focus();
}

function saveManualItem() {
  const val = document.getElementById("manual-item").value.trim();
  if (!val) return;
  manualShoppingItems.push(val);
  localStorage.setItem("manualShoppingItems", JSON.stringify(manualShoppingItems));
  document.getElementById("manual-item").value = "";
  document.getElementById("manual-add-wrap").style.display = "none";
  loadShoppingList();
}

function downloadShoppingCard() {
  const items = document.querySelectorAll(".shopping-item .shopping-item-name");
  if (!items.length) { alert("Your shopping list is empty!"); return; }
  let text = "SHOPPING LIST\n─────────────\n";
  items.forEach(el => text += `• ${el.textContent}\n`);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
  a.download = "shopping-list.txt";
  a.click();
}

function deleteShoppingItem(i, source, name) {
  if (source === "manual") {
    manualShoppingItems = manualShoppingItems.filter(n => n !== name);
    localStorage.setItem("manualShoppingItems", JSON.stringify(manualShoppingItems));
  }
  document.getElementById(`shop-item-${i}`)?.remove();
}

// ═══════════════════════════════════════
// INIT
// ═══════════════════════════════════════
document.addEventListener("DOMContentLoaded", () => {
  loadPantry();
  loadShoppingList();
});