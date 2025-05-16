

import { CartService } from './cart.service';
import './style.css';

interface Dessert {
  id: number;
  name: string;
  price: number;
  image: string;
  quantity?: number;
}

const cartService = new CartService();

// Fetching desserts from data.json
async function fetchDesserts(): Promise<Dessert[]> {
  // const res = await fetch('/data.json');
  const res = await fetch('public/data.json');
  const data = await res.json();
  // Adding id and flatten image for thumbnail
  return data.map((item: any, idx: number) => ({
    id: idx + 1,
    name: item.name,
    price: item.price,
    image: item.image.thumbnail,
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
  const cartItems = await cartService.getCart();

  container.innerHTML = desserts.map(d => {
    const inCart = cartItems.find(c => c.id === d.id)?.quantity ?? 0;
    return `
      <div class="dessert-card">
        <img src="${d.image}" alt="${d.name}" />
        <h3>${d.name}</h3>
        <p>$${d.price.toFixed(2)}</p>
        <div class="card-actions">
          ${inCart > 0
            ? `<div class="quantity-control">
                 <button data-action="decrease" data-id="${d.id}">-</button>
                 <span>${inCart}</span>
                 <button data-action="increase" data-id="${d.id}">+</button>
               </div>`
            : `<button data-action="add" data-id="${d.id}">Add to Cart</button>`
          }
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const target = e.currentTarget as HTMLButtonElement;
      const id = Number(target.dataset.id);
      const action = target.dataset.action;
      const dessert = desserts.find(d => d.id === id);
      if (!dessert) return;

      switch (action) {
        case 'add':
        case 'increase': {
          // Check if the dessert is already in the cart
          const existing = (await cartService.getCart()).find(i => i.id === id);
          await cartService.addToCart({ ...dessert, quantity: existing?.quantity ?? 0 });
          break;
        }
        case 'decrease': {
          const item = (await cartService.getCart()).find(i => i.id === id);
          if (item && item.quantity! > 1) {
            await cartService.updateQuantity(id, item.quantity! - 1);
          } else {
            await cartService.removeItem(id);
          }
          break;
        }
      }

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

  container.innerHTML = cart.map(item => `
    <div class="cart-item">
      <span>${item.name} x${item.quantity}</span>
      <span>$${(item.price * item.quantity!).toFixed(2)}</span>
      <button data-remove="${item.id}">❌</button>
    </div>
  `).join('');

  const total = cart.reduce((sum, item) => sum + item.price * (item.quantity ?? 0), 0);
  totalEl.textContent = total.toFixed(2);
  countEl.textContent = cart.reduce((count, item) => count + (item.quantity ?? 0), 0).toString();

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
        <img src="src/assets/icon-order-confirmed.svg" alt="Order Confirmed" class="order-modal-icon" />
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
    // Use clearCart from cart.service.ts (must exist)
    // @ts-ignore
    await cartService.clearCart();
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
