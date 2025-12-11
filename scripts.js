const storage = {
  getUser() { return JSON.parse(localStorage.getItem('kcr_user') || 'null'); },
  setUser(u) { localStorage.setItem('kcr_user', JSON.stringify(u)); },
  clearUser() { localStorage.removeItem('kcr_user'); },
  getCart() { return JSON.parse(localStorage.getItem('kcr_cart') || '[]'); },
  setCart(c) { localStorage.setItem('kcr_cart', JSON.stringify(c)); }
};

// tiny helpers na parang smurfs
const $ = sel => document.querySelector(sel);
const $all = sel => Array.from(document.querySelectorAll(sel));

// Modals: toggle class 'is-open' tutututrut Max Verstappen
function showModal(el){ if(typeof el === 'string') el = $(el); if(!el) return; el.classList.add('is-open'); el.setAttribute('aria-hidden','false'); }
function hideModal(el){ if(typeof el === 'string') el = $(el); if(!el) return; el.classList.remove('is-open'); el.setAttribute('aria-hidden','true'); }

// Auth UI
function updateAuthUI(){ const user = storage.getUser(); const authBtn = $('#auth-btn'); if(!authBtn) return;
  if(user){ authBtn.textContent = `Logout (${user.email.split('@')[0]})`; authBtn.classList.add('btn-ghost'); authBtn.onclick = ()=>{ if(confirm('Logout?')){ storage.clearUser(); updateAuthUI(); alert('Signed out'); } } }
  else { authBtn.textContent = 'Log in'; authBtn.classList.remove('btn-ghost'); authBtn.onclick = ()=> openAuthModal(); }
}

function openAuthModal(){ const modal = $('#modal-auth'); if(!modal) return; const form = modal.querySelector('form');
  modal.querySelector('#modal-title').textContent = 'Sign in or Create an account';
  modal.querySelector('#auth-email').value = '';
  modal.querySelector('#auth-pass').value = '';
  showModal(modal);
  modal.querySelectorAll('[data-close]').forEach(btn=> btn.onclick = ()=> hideModal(modal));
  form.onsubmit = e => {
    e.preventDefault(); const email = modal.querySelector('#auth-email').value.trim(); const pass = modal.querySelector('#auth-pass').value;
    if(!email || !pass) return alert('Please enter email and password');
    // Demo-only: store user pre
    storage.setUser({ email, created: new Date().toISOString() });
    hideModal(modal); updateAuthUI(); alert(`Signed in as ${email}`);
  };
}

// Cart rendering and helpers to pre
function updateCartCount(){ const el = $('#cart-count'); if(!el) return; const items = storage.getCart(); el.textContent = items.reduce((s,i)=>s + (i.qty||0), 0); }

function renderCart(){ const items = storage.getCart(); const container = $('#cart-items'); const totalEl = $('#cart-total'); if(!container) return;
  container.innerHTML = '';
  let total = 0;
  items.forEach((it, idx) => {
    const row = document.createElement('div'); row.className = 'row'; row.style.padding = '10px 0';
    const left = document.createElement('div'); left.style.flex = '1'; left.innerHTML = `<div style="font-weight:700">${it.name}</div><div class="muted" style="font-size:0.95rem">${it.desc||''}</div>`;
    const right = document.createElement('div'); right.style.display = 'flex'; right.style.alignItems = 'center'; right.style.gap = '10px';
    const qty = document.createElement('input'); qty.type = 'number'; qty.min = '1'; qty.value = it.qty || 1; qty.style.width = '72px'; qty.dataset.idx = idx; qty.onchange = ()=> updateCartItemQty(idx, Number(qty.value||1));
    const price = document.createElement('div'); price.textContent = `$${(it.price * it.qty).toFixed(2)}`; price.style.fontWeight = '700';
    const remove = document.createElement('button'); remove.className = 'btn btn-secondary small'; remove.textContent = 'Remove'; remove.onclick = ()=> removeFromCart(idx);
    right.appendChild(qty); right.appendChild(price); right.appendChild(remove);
    row.appendChild(left); row.appendChild(right); container.appendChild(row);
    total += it.price * it.qty;
  });
  totalEl && (totalEl.textContent = total.toFixed(2)); updateCartCount();
}

function addToCart(item){ const cart = storage.getCart(); const existing = cart.find(c=>c.id === item.id && JSON.stringify(c.options||{}) === JSON.stringify(item.options||{}));
  if(existing){ existing.qty = (existing.qty || 0) + (item.qty || 1); }
  else { cart.push(item); }
  storage.setCart(cart); renderCart(); updateCartCount(); }

function updateCartItemQty(idx, qty){ const cart = storage.getCart(); if(!cart[idx]) return; cart[idx].qty = Math.max(1, Number(qty||1)); storage.setCart(cart); renderCart(); }
function removeFromCart(idx){ const cart = storage.getCart(); cart.splice(idx,1); storage.setCart(cart); renderCart(); }

function openCart(){ renderCart(); showModal($('#modal-cart')); const modal = $('#modal-cart'); modal.querySelectorAll('[data-close]').forEach(b=> b.onclick = ()=> hideModal(modal)); const checkout = modal.querySelector('#checkout-btn'); if(checkout) checkout.onclick = ()=> checkoutFlow(); }

// Checkout mock: redirect to order-summary which reads cart hecc yeh
function checkoutFlow(){ const user = storage.getUser(); if(!user){ if(confirm('You must be signed in to checkout. Sign in now?')){ openAuthModal(); } return; }
  const cart = storage.getCart(); if(!cart || cart.length === 0) return alert('Cart is empty');
  // In demo: redirect to order-summary page boss
  window.location.href = 'order-summary.html';
}

// Product button helpers
function getQtyForButton(btn){ if(btn.dataset.qty) return Number(btn.dataset.qty); const form = btn.closest('.form-card') || btn.closest('form') || btn.parentElement; if(form){ const i = form.querySelector('input[type="number"]'); if(i) return Number(i.value||1); } return 1; }
function getOptionsForButton(btn){ const form = btn.closest('.form-card') || btn.closest('form') || btn.parentElement; if(!form) return {}; const selects = form.querySelectorAll('select'); const opts = {}; selects.forEach(s=> opts[s.id || s.name || s.dataset.key || 'opt'] = s.value); return opts; }

function wireProductButtons(){ $all('[data-add-to-cart]').forEach(btn => btn.addEventListener('click', e => {
  const qty = getQtyForButton(btn);
  const item = {
    id: btn.dataset.id || `p-${Date.now()}`,
    name: btn.dataset.name || btn.getAttribute('data-add-to-cart') || 'Product',
    desc: btn.dataset.desc || '',
    price: Number(btn.dataset.price || 9.99),
    qty: Number(qty || 1),
    options: getOptionsForButton(btn)
  };
  addToCart(item);
  const orig = btn.textContent; btn.textContent = 'Added ✓'; setTimeout(()=> btn.textContent = orig, 1100);
})); }

// Order summary page renderer (if present)
function renderOrderSummary(){ const el = $('#order-summary-items'); if(!el) return; const items = storage.getCart(); el.innerHTML = ''; let total=0; items.forEach((it, idx)=>{
  const row = document.createElement('div'); row.className='row'; row.style.padding='12px 0';
  row.innerHTML = `<div style="flex:1"><div style="font-weight:700">${it.name}</div><div class='muted' style='font-size:0.95rem'>${it.desc||''}</div></div>`;
  const controls = document.createElement('div'); controls.style.display='flex'; controls.style.alignItems='center'; controls.style.gap='10px';
  const qty = document.createElement('input'); qty.type='number'; qty.min='1'; qty.value = it.qty; qty.style.width='72px'; qty.onchange = ()=> { updateCartItemQty(idx, Number(qty.value||1)); renderOrderSummary(); };
  const price = document.createElement('div'); price.textContent = `$${(it.price * it.qty).toFixed(2)}`; price.style.fontWeight='700';
  const remove = document.createElement('button'); remove.className='btn btn-secondary small'; remove.textContent='Remove'; remove.onclick = ()=> { removeFromCart(idx); renderOrderSummary(); };
  controls.appendChild(qty); controls.appendChild(price); controls.appendChild(remove);
  row.appendChild(controls); el.appendChild(row); total += it.price * it.qty;
}); $('#order-total') && ($('#order-total').textContent = (total || 0).toFixed(2)); }

// Modal CSS injection guard (not necessary with new CSS but keep safe fallback)
function injectBaseModalStyle(){ if($('#__kcr_modal_css')) return; const s = document.createElement('style'); s.id='__kcr_modal_css'; s.textContent = `
.modal{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(7,18,44,0.3);opacity:0;pointer-events:none;transition:opacity .18s}
.modal.is-open{opacity:1;pointer-events:auto}
.modal .modal-card{background:white;padding:16px;border-radius:12px;max-width:720px;width:100%}
`; document.head.appendChild(s); }

// Init wiring
window.addEventListener('DOMContentLoaded', ()=>{
  injectBaseModalStyle(); updateAuthUI(); wireProductButtons(); updateCartCount();
  const cartBtn = $('#cart-btn'); if(cartBtn) cartBtn.onclick = openCart;
  const authBtn = $('#auth-btn'); if(authBtn) authBtn.onclick = ()=> { const u = storage.getUser(); if(u){ if(confirm('Logout?')){ storage.clearUser(); updateAuthUI(); } } else openAuthModal(); };
  // Render order-summary if present
  renderOrderSummary();
});
