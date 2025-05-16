import { CartService } from './cart.service';
import './style.css';

interface Dessert {
  id: number;
  name: string;
  price: number;
  image: string;
  quantity?: number;
  category?: string;
}

const cartService = new CartService();

// Fetching desserts from data.json
async function fetchDesserts(): Promise<Dessert[]> {
  const res = await fetch('data.json');
  const data = await res.json();
  return data.map((item: any, idx: number) => ({
    id: idx + 1,
    name: item.name,
    price: item.price,
    image: item.image.thumbnail,
    category: item.category,
    quantity: 0
  }));
}

let desserts: Dessert[] = [];

async function initializeApp() {
  desserts = await fetchDesserts();

  document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
    <div class="layout">
      <div class="left">
        <h2>Desserts</h2>
        <div id="dessertGrid" class="dessert-grid"></div>
      </div>
      <div class="right">
        <h2><span id="cartL">Your Cart (</span><span id="cart-count">0</span><span id="cartL">)</span></h2>
        <div id="cartList" class="cart-list"></div>
        <p><strong>Order Total:</strong> $<span id="orderTotal">0.00</span></p>
        <p class="green">Your added items will appear hear</p>
        <button id="checkoutBtn">Confirm Order</button>
      </div>
    </div>
  `;

  await renderDesserts();
  await renderCart();
}

async function renderDesserts() {
  const container = document.querySelector('#dessertGrid')!;

  container.innerHTML = desserts.map(d => {
    return `
      <div class="dessert-card">
        <img src="${d.image}" alt="${d.name}" />
        <div class="dessert-category">${d.category || ''}</div>
        <h3>${d.name}</h3>
        <p>$${d.price.toFixed(2)}</p>
        <div class="card-actions">
          <button data-action="add" data-id="${d.id}">Add to Cart</button>
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('button[data-action="add"]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const target = e.currentTarget as HTMLButtonElement;
      const id = Number(target.dataset.id);
      const dessert = desserts.find(d => d.id === id);
      if (!dessert) return;
      await cartService.addToCart({ ...dessert });
      await renderDesserts();
      await renderCart();
    });
  });
}

async function renderCart() {
  const cart = await cartService.getCart();
  const container = document.querySelector('#cartList')!;
  const totalEl = document.querySelector('#orderTotal')!;
  const countEl = document.querySelector('#cart-count')!;

  container.innerHTML = '';

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="empty-cart">
        <img src="assets/illustration-empty-cart.svg" alt="Empty Cart" class="empty-cart-img" />
        <div class="empty-cart-text">Your added items will appear here</div>
      </div>
    `;
    totalEl.textContent = '0.00';
    countEl.textContent = '0';
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) (checkoutBtn as HTMLButtonElement).style.display = 'none';
    const greenRow = document.querySelector('.carbon-neutral-row');
    if (greenRow) (greenRow as HTMLElement).style.display = 'none';
    return;
  }

  // Cart not empty: render items
  container.innerHTML = `
    <div class="cart-items">
      ${cart.map(item => `
        <div class="cart-item-row">
          <div class="cart-item-info">
            <span class="cart-item-name">${item.name}</span>
            <span class="cart-item-qty">${item.quantity}x</span>
            <span class="cart-item-price">$${item.price.toFixed(2)}</span>
            <span class="cart-item-total">$${(item.price * (item.quantity ?? 0)).toFixed(2)}</span>
          </div>
          <button class="cart-remove-btn" data-remove="${item.id}">
            <img src="assets/icon-remove-item.svg" alt="Remove" />
          </button>
        </div>
      `).join('')}
    </div>
    <div class="carbon-neutral-row">
      <img src="assets/icon-carbon-neutral.svg" alt="Carbon Neutral" class="carbon-neutral-icon" />
      <span>This is a <b>carbon-neutral</b> delivery</span>
    </div>
  `;

  const checkoutBtn = document.getElementById('checkoutBtn');
  if (checkoutBtn) {
    (checkoutBtn as HTMLButtonElement).style.display = 'block';
    checkoutBtn.className = 'confirm-order-btn';
  }

  const greenRow = container.querySelector('.carbon-neutral-row');
  if (greenRow) (greenRow as HTMLElement).style.display = 'flex';

  // Update total and count
  const total = cart.reduce((sum, item) => sum + item.price * (item.quantity ?? 0), 0);
  totalEl.textContent = total.toFixed(2);
  countEl.textContent = cart.reduce((count, item) => count + (item.quantity ?? 0), 0).toString();

  // Remove item event
  container.querySelectorAll('button[data-remove]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = Number(btn.getAttribute('data-remove'));
      await cartService.removeItem(id);
      await renderCart();
      await renderDesserts();
    });
  });
}

// Modal rendering
function renderOrderConfirmedModal(cart: Dessert[], total: number) {
  // Remove any existing modal
  document.querySelectorAll('.order-modal-backdrop').forEach(e => e.remove());

  const modal = document.createElement('div');
  modal.className = 'order-modal-backdrop';
  modal.innerHTML = `
    <div class="order-modal">
      <div class="order-modal-header">
        <img src="assets/icon-order-confirmed.svg" alt="Order Confirmed" class="order-modal-icon" />
        <h2>Order Confirmed</h2>
        <p class="order-modal-sub">We hope you enjoy your food!</p>
      </div>
      <div class="order-modal-list">
        ${cart.map(item => `
          <div class="order-modal-item">
            <img src="${item.image}" alt="${item.name}" />
            <div class="order-modal-item-info">
              <span class="order-modal-item-name">${item.name}</span>
              <span class="order-modal-item-qty">${item.quantity} x $${item.price.toFixed(2)}</span>
            </div>
            <span class="order-modal-item-total">$${(item.price * (item.quantity ?? 0)).toFixed(2)}</span>
          </div>
        `).join('')}
        <div class="order-modal-total-row">
          <span>Order Total</span>
          <span class="order-modal-total">$${total.toFixed(2)}</span>
        </div>
      </div>
      <button class="order-modal-btn">Start New Order</button>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector('.order-modal-btn')!.addEventListener('click', async () => {
    modal.remove();
    await renderCart();
    await renderDesserts();
  });
}

document.addEventListener('click', async (e) => {
  const target = e.target as HTMLElement;
  if (target.id === 'checkoutBtn') {
    const cart = await cartService.getCart();
    const total = cart.reduce((sum, item) => sum + item.price * (item.quantity ?? 0), 0);
    renderOrderConfirmedModal(cart, total);
  }
});

initializeApp().catch(console.error);