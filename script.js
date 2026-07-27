/* ============================================================
   CONFIGURAÇÃO DO FIREBASE 
   Substitua os valores abaixo pelas credenciais do SEU projeto.
   Firebase Console -> Configurações do projeto -> Suas apps.
============================================================ */
const firebaseConfig = {
  apiKey: "AIzaSyCdbgPcsM-RLHzDkClVToAhGhOizfLvu6o",
  authDomain: "kitopl2.firebaseapp.com",
  databaseURL: "https://kitopl2-default-rtdb.firebaseio.com",
  projectId: "kitopl2",
  storageBucket: "kitopl2.firebasestorage.app",
  messagingSenderId: "529504176070",
  appId: "1:529504176070:web:2c20baf1163b98f563d4c7"
};


/* ============================================================
   E-mail exclusivo do admin
============================================================ */
const ADMIN_EMAIL = "admin@admin.com";

/* ============================================================
   Gatilhos de marketing pré-programados
============================================================ */
const MARKETING_TRIGGERS = [
  "🔥 Últimas unidades",
  "⚡ Oferta relâmpago",
  "🎯 Mais vendido",
  "💎 Exclusivo",
  "🚀 Novidade",
  "⭐ Recomendado",
  "🎁 Frete grátis",
  "⏰ Por tempo limitado",
  "💰 Melhor preço",
  "✅ Garantia estendida"
];

/* ============================================================
   Inicialização Firebase
============================================================ */
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

/* ============================================================
   Estado
============================================================ */
let currentUser = null;
let allProducts = [];
let allMenu = [];
let currentPage = 1;
const PAGE_SIZE_DESKTOP = 10;
const PAGE_SIZE_MOBILE = 10;

/* ============================================================
   Utilitários
============================================================ */
const $ = (id) => document.getElementById(id);
const isMobile = () => window.innerWidth <= 600;
const pageSize = () => (isMobile() ? PAGE_SIZE_MOBILE : PAGE_SIZE_DESKTOP);

function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

/* ============================================================
   MENU
============================================================ */
db.ref("menu").on("value", (snap) => {
  allMenu = [];
  snap.forEach((c) => allMenu.push({ id: c.key, ...c.val() }));
  renderMenu();
  renderAdminMenu();
});

function renderMenu() {
  const list = $("menuList");
  list.innerHTML = "";
  const roots = allMenu.filter((m) => !m.parent);
  roots.forEach((item) => list.appendChild(buildMenuItem(item)));
}

function buildMenuItem(item) {
  const li = document.createElement("li");
  const children = allMenu.filter((m) => m.parent === item.id);

  if (children.length > 0) {
    const label = document.createElement("span");
    label.className = "menu-label";
    label.textContent = item.label;
    li.appendChild(label);

    const sub = document.createElement("ul");
    sub.className = "submenu";
    children.forEach((ch) => {
      const cli = document.createElement("li");
      const a = document.createElement("a");
      a.textContent = ch.label;
      a.href = ch.link || "#";
      cli.appendChild(a);
      sub.appendChild(cli);
    });
    li.appendChild(sub);

    // toggle mobile
    label.addEventListener("click", () => {
      if (window.innerWidth <= 800) li.classList.toggle("open");
    });
  } else {
    const a = document.createElement("a");
    a.textContent = item.label;
    a.href = item.link || "#";
    li.appendChild(a);
  }
  return li;
}

$("menuToggle").addEventListener("click", () => {
  $("menuToggle").classList.toggle("active");
  $("mainMenu").classList.toggle("open");
});

/* ============================================================
   MARCA / HERO
============================================================ */
db.ref("brand").on("value", (snap) => {
  const b = snap.val() || {};
  if (b.squareImg) $("logoSquare").src = b.squareImg;
  if (b.wideImg) $("logoWide").src = b.wideImg;
  if (b.heroTitle) $("heroTitle").textContent = b.heroTitle;
  if (b.heroSubtitle) $("heroSubtitle").textContent = b.heroSubtitle;

  $("brandSquareUrl").value = b.squareImg && !b.squareImg.startsWith("data:") ? b.squareImg : "";
  $("brandWideUrl").value = b.wideImg && !b.wideImg.startsWith("data:") ? b.wideImg : "";
  $("brandHeroTitle").value = b.heroTitle || "";
  $("brandHeroSubtitle").value = b.heroSubtitle || "";
});

/* ============================================================
   FOOTER
============================================================ */
db.ref("footer").on("value", (snap) => {
  const f = snap.val() || {};
  renderFooterList("footerLinksList", f.links);
  renderFooterList("footerSocialList", f.socials);
  $("footerCopyText").textContent = f.copy || "© Sua Marca";

  $("footerLinks").value = (f.links || []).map((l) => `${l.name} | ${l.url}`).join("\n");
  $("footerSocials").value = (f.socials || []).map((l) => `${l.name} | ${l.url}`).join("\n");
  $("footerCopy").value = f.copy || "";
});

function renderFooterList(id, arr) {
  const ul = $(id);
  ul.innerHTML = "";
  (arr || []).forEach((l) => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = l.url; a.textContent = l.name; a.target = "_blank"; a.rel = "noopener";
    li.appendChild(a); ul.appendChild(li);
  });
}

/* ============================================================
   PRODUTOS - render público
============================================================ */
db.ref("products").on("value", (snap) => {
  allProducts = [];
  snap.forEach((c) => allProducts.push({ id: c.key, ...c.val() }));
  allProducts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  renderProducts();
  renderAdminProducts();
});

function renderProducts() {
  const grid = $("cardsGrid");
  grid.innerHTML = "";

  const size = pageSize();
  const totalPages = Math.max(1, Math.ceil(allProducts.length / size));
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * size;
  const items = allProducts.slice(start, start + size);

  items.forEach((p) => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <img src="${p.image || ''}" alt="${p.title || ''}" onerror="this.style.display='none'"/>
      <div class="card-body">
        <h3>${escapeHtml(p.title || '')}</h3>
        <p>${escapeHtml(p.description || '')}</p>
      </div>`;
    card.addEventListener("click", () => openProductModal(p));
    grid.appendChild(card);
  });

  renderPagination(totalPages);
}

function renderPagination(totalPages) {
  const pag = $("pagination");
  pag.innerHTML = "";
  if (totalPages <= 1) return;
  for (let i = 1; i <= totalPages; i++) {
    const b = document.createElement("button");
    b.textContent = i;
    if (i === currentPage) b.classList.add("active");
    b.addEventListener("click", () => { currentPage = i; renderProducts(); window.scrollTo({ top: 0, behavior: "smooth" }); });
    pag.appendChild(b);
  }
}

window.addEventListener("resize", () => renderProducts());

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[c]);
}

/* ============================================================
   Modal produto
============================================================ */
function openProductModal(p) {
  $("modalImg").src = p.image || "";
  $("modalTitle").textContent = p.title || "";
  $("modalDesc").textContent = p.description || "";
  $("modalScope").textContent = p.scope === "local" ? "Local" : "Nacional";
  if (p.scope === "local" && p.cities) {
    $("modalCitiesWrap").hidden = false;
    $("modalCities").textContent = p.cities;
  } else {
    $("modalCitiesWrap").hidden = true;
  }
  $("modalPrice").textContent = p.price || "";

  const trg = $("modalTriggers");
  trg.innerHTML = "";
  (p.triggers || []).forEach((t) => {
    const span = document.createElement("span");
    span.className = "trigger-badge";
    span.textContent = t;
    trg.appendChild(span);
  });

  const buyBtn = $("buyBtn");
  buyBtn.onclick = () => {
    if (p.buyLink) window.open(p.buyLink, "_blank");
    else alert("Configure o link de compra deste produto.");
  };

  $("productModal").classList.remove("hidden");
}

/* ============================================================
   Fechar modais
============================================================ */
document.querySelectorAll("[data-close]").forEach((b) => {
  b.addEventListener("click", () => b.closest(".modal").classList.add("hidden"));
});
document.querySelectorAll(".modal").forEach((m) => {
  m.addEventListener("click", (e) => { if (e.target === m) m.classList.add("hidden"); });
});

/* ============================================================
   LOGIN ADMIN
============================================================ */
$("adminAccess").addEventListener("click", () => {
  $("loginError").textContent = "";
  $("loginModal").classList.remove("hidden");
  setTimeout(() => $("loginEmail").focus(), 50);
});

// Enter salta campos
$("loginEmail").addEventListener("keydown", (e) => {
  if (e.key === "Enter") { e.preventDefault(); $("loginPass").focus(); }
});
$("loginPass").addEventListener("keydown", (e) => {
  if (e.key === "Enter") { e.preventDefault(); $("loginForm").requestSubmit(); }
});

$("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = $("loginEmail").value.trim();
  const pass = $("loginPass").value;
  $("loginError").textContent = "";
  $("loginLoader").classList.remove("hidden");
  $("loginBtn").disabled = true;

  try {
    await auth.signInWithEmailAndPassword(email, pass);
  } catch (err) {
    $("loginError").textContent = "Falha no login: " + (err.message || err.code);
  } finally {
    $("loginLoader").classList.add("hidden");
    $("loginBtn").disabled = false;
  }
});

auth.onAuthStateChanged((user) => {
  currentUser = user;
  if (user && user.email === ADMIN_EMAIL) {
    $("loginModal").classList.add("hidden");
    $("adminPanel").classList.remove("hidden");
  } else {
    $("adminPanel").classList.add("hidden");
    if (user && user.email !== ADMIN_EMAIL) {
      auth.signOut();
      $("loginError").textContent = "Acesso permitido apenas ao admin.";
    }
  }
});

$("logoutBtn").addEventListener("click", () => auth.signOut());
$("closeAdmin").addEventListener("click", () => $("adminPanel").classList.add("hidden"));

/* ============================================================
   ADMIN - abas
============================================================ */
document.querySelectorAll(".tab-btn").forEach((b) => {
  b.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((x) => x.classList.remove("active"));
    document.querySelectorAll(".tab-section").forEach((x) => x.classList.remove("active"));
    b.classList.add("active");
    $(b.dataset.tab).classList.add("active");
  });
});

/* ============================================================
   ADMIN - Produtos
============================================================ */
function renderTriggersChoices(selected = []) {
  const box = $("triggersList");
  box.innerHTML = "";
  MARKETING_TRIGGERS.forEach((t) => {
    const label = document.createElement("label");
    const cb = document.createElement("input");
    cb.type = "checkbox"; cb.value = t;
    if (selected.includes(t)) cb.checked = true;
    label.appendChild(cb);
    label.appendChild(document.createTextNode(t));
    box.appendChild(label);
  });
}
renderTriggersChoices();

$("productForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = $("prodId").value || db.ref("products").push().key;

  let image = $("prodImgUrl").value.trim();
  const file = $("prodImgFile").files[0];
  if (file) image = await fileToBase64(file);
  if (!image && $("prodId").value) {
    // manter imagem existente
    const existing = allProducts.find((p) => p.id === id);
    if (existing) image = existing.image;
  }

  const triggers = [...document.querySelectorAll("#triggersList input:checked")].map((c) => c.value);

  const data = {
    title: $("prodTitle").value.trim(),
    description: $("prodDesc").value.trim(),
    image: image || "",
    scope: $("prodScope").value,
    cities: $("prodCities").value.trim(),
    price: $("prodPrice").value.trim(),
    buyLink: $("prodBuyLink").value.trim(),
    triggers,
    createdAt: Date.now()
  };

  try {
    await db.ref("products/" + id).set(data);
    $("productForm").reset();
    $("prodId").value = "";
    renderTriggersChoices();
    alert("Produto salvo!");
  } catch (err) {
    alert("Erro: " + err.message);
  }
});

$("clearProdForm").addEventListener("click", () => {
  $("productForm").reset();
  $("prodId").value = "";
  renderTriggersChoices();
});

function renderAdminProducts() {
  const list = $("adminProductsList");
  if (!list) return;
  list.innerHTML = "";
  allProducts.forEach((p) => {
    const div = document.createElement("div");
    div.className = "admin-list-item";
    div.innerHTML = `<span>${escapeHtml(p.title || "(sem título)")}</span>
      <div class="actions">
        <button data-edit="${p.id}">Editar</button>
        <button data-del="${p.id}">Excluir</button>
      </div>`;
    list.appendChild(div);
  });
  list.querySelectorAll("[data-edit]").forEach((b) => {
    b.addEventListener("click", () => editProduct(b.dataset.edit));
  });
  list.querySelectorAll("[data-del]").forEach((b) => {
    b.addEventListener("click", () => {
      if (confirm("Excluir este produto?")) db.ref("products/" + b.dataset.del).remove();
    });
  });
}

function editProduct(id) {
  const p = allProducts.find((x) => x.id === id);
  if (!p) return;
  $("prodId").value = id;
  $("prodTitle").value = p.title || "";
  $("prodDesc").value = p.description || "";
  $("prodImgUrl").value = p.image && !p.image.startsWith("data:") ? p.image : "";
  $("prodScope").value = p.scope || "nacional";
  $("prodCities").value = p.cities || "";
  $("prodPrice").value = p.price || "";
  $("prodBuyLink").value = p.buyLink || "";
  renderTriggersChoices(p.triggers || []);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ============================================================
   ADMIN - Menu
============================================================ */
$("menuForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = $("menuId").value || db.ref("menu").push().key;
  const data = {
    label: $("menuLabel").value.trim(),
    link: $("menuLink").value.trim(),
    parent: $("menuParent").value.trim() || null
  };
  await db.ref("menu/" + id).set(data);
  $("menuForm").reset();
  $("menuId").value = "";
});

$("clearMenuForm").addEventListener("click", () => {
  $("menuForm").reset(); $("menuId").value = "";
});

function renderAdminMenu() {
  const list = $("adminMenuList");
  if (!list) return;
  list.innerHTML = "";
  allMenu.forEach((m) => {
    const div = document.createElement("div");
    div.className = "admin-list-item";
    div.innerHTML = `<span><strong>${escapeHtml(m.label)}</strong>
      <small style="color:#7a8896"> ${m.parent ? "(sub de " + m.parent + ")" : "(raiz)"} — id: ${m.id}</small></span>
      <div class="actions">
        <button data-edit="${m.id}">Editar</button>
        <button data-del="${m.id}">Excluir</button>
      </div>`;
    list.appendChild(div);
  });
  list.querySelectorAll("[data-edit]").forEach((b) => {
    b.addEventListener("click", () => {
      const m = allMenu.find((x) => x.id === b.dataset.edit);
      $("menuId").value = m.id;
      $("menuLabel").value = m.label || "";
      $("menuLink").value = m.link || "";
      $("menuParent").value = m.parent || "";
    });
  });
  list.querySelectorAll("[data-del]").forEach((b) => {
    b.addEventListener("click", () => {
      if (confirm("Excluir este item?")) db.ref("menu/" + b.dataset.del).remove();
    });
  });
}

/* ============================================================
   ADMIN - Marca
============================================================ */
$("saveBrand").addEventListener("click", async () => {
  const current = (await db.ref("brand").once("value")).val() || {};
  let squareImg = $("brandSquareUrl").value.trim() || current.squareImg || "";
  let wideImg = $("brandWideUrl").value.trim() || current.wideImg || "";

  const sf = $("brandSquareFile").files[0];
  const wf = $("brandWideFile").files[0];
  if (sf) squareImg = await fileToBase64(sf);
  if (wf) wideImg = await fileToBase64(wf);

  await db.ref("brand").set({
    squareImg, wideImg,
    heroTitle: $("brandHeroTitle").value.trim(),
    heroSubtitle: $("brandHeroSubtitle").value.trim()
  });
  alert("Marca atualizada!");
});

/* ============================================================
   ADMIN - Rodapé
============================================================ */
$("saveFooter").addEventListener("click", async () => {
  const parse = (text) =>
    text.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
      const [name, url] = l.split("|").map((s) => (s || "").trim());
      return { name, url };
    });
  await db.ref("footer").set({
    links: parse($("footerLinks").value),
    socials: parse($("footerSocials").value),
    copy: $("footerCopy").value.trim()
  });
  alert("Rodapé atualizado!");
});
