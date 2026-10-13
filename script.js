document.addEventListener('DOMContentLoaded', () => {
  // Application State
  let products = [];
  let filteredProducts = [];
  let cart = JSON.parse(localStorage.getItem('aurastore_cart')) || [];
  let currentCategory = 'all';

  // DOM Elements
  const productsGrid = document.getElementById('productsGrid');
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const categoryContainer = document.getElementById('categoryContainer');
  const sortSelect = document.getElementById('sortSelect');
  const resultsCount = document.getElementById('resultsCount');
  const activeFilterBadge = document.getElementById('activeFilterBadge');
  const activeFilterName = document.getElementById('activeFilterName');
  
  const cartBadge = document.getElementById('cartBadge');
  const cartItemsList = document.getElementById('cartItemsList');
  const cartSubtotal = document.getElementById('cartSubtotal');
  const checkoutBtn = document.getElementById('checkoutBtn');
  const modalProductBody = document.getElementById('modalProductBody');

  // Fetch Products from FakeStore API
  async function fetchProducts() {
    renderSkeletons();
    try {
      const res = await fetch('https://fakestoreapi.com/products');
      products = await res.json();
      filteredProducts = [...products];
      renderProducts(filteredProducts);
      updateCartUI();
    } catch (err) {
      productsGrid.innerHTML = `
        <div class="col-12 text-center py-5">
          <i class="fa-solid fa-triangle-exclamation text-danger fs-1 mb-3"></i>
          <h5 class="fw-bold">Unable to Load Products</h5>
          <p class="text-muted">Please check your internet connection and try again.</p>
        </div>
      `;
    }
  }

  // Render Skeleton Loading Placeholders
  function renderSkeletons() {
    productsGrid.innerHTML = Array(8).fill(0).map(() => `
      <div class="col-6 col-md-4 col-lg-3">
        <div class="product-card p-3 d-flex flex-column h-100">
          <div class="skeleton-box mb-3" style="height: 180px;"></div>
          <div class="skeleton-box mb-2" style="height: 15px; width: 40%;"></div>
          <div class="skeleton-box mb-2" style="height: 20px; width: 90%;"></div>
          <div class="skeleton-box mt-auto" style="height: 35px;"></div>
        </div>
      </div>
    `).join('');
  }

  // Filter & Render Products
  function renderProducts(items) {
    resultsCount.textContent = items.length;

    if (items.length === 0) {
      productsGrid.innerHTML = `
        <div class="col-12 text-center py-5">
          <i class="fa-solid fa-box-open text-muted fs-1 mb-3"></i>
          <h5 class="fw-bold">No Products Found</h5>
          <p class="text-muted">Try adjusting your search terms or category filters.</p>
        </div>
      `;
      return;
    }

    productsGrid.innerHTML = items.map(product => `
      <div class="col-6 col-md-4 col-lg-3 product-item-col">
        <div class="product-card d-flex flex-column" onclick="openProductModal(${product.id})">
          <div class="product-img-wrapper position-relative">
            <span class="position-absolute top-0 start-0 m-3 badge bg-magenta rounded-pill text-uppercase" style="font-size: 0.7rem;">
              ${product.category}
            </span>
            <img src="${product.image}" alt="${product.title}" class="product-img" loading="lazy" />
          </div>
          <div class="p-3 d-flex flex-column flex-grow-1">
            <div class="d-flex align-items-center gap-1 mb-1 text-warning small">
              <i class="fa-solid fa-star"></i>
              <span class="fw-bold text-dark">${product.rating.rate}</span>
              <span class="text-muted">(${product.rating.count})</span>
            </div>
            <h6 class="product-title text-dark">${product.title}</h6>
            <div class="mt-auto pt-3 d-flex align-items-center justify-content-between">
              <span class="fs-5 fw-extrabold text-violet">$${product.price.toFixed(2)}</span>
              <button class="btn btn-add-cart" onclick="event.stopPropagation(); addToCart(${product.id})">
                <i class="fa-solid fa-plus me-1"></i> Add
              </button>
            </div>
          </div>
        </div>
      </div>
    `).join('');

    // GSAP Entry Stagger Animation
    gsap.from('.product-item-col', {
      opacity: 0,
      y: 30,
      duration: 0.4,
      stagger: 0.05,
      ease: 'power2.out'
    });
  }

  // Filter Logic Combined
  function applyFilters() {
    const query = searchInput.value.toLowerCase().trim();

    filteredProducts = products.filter(product => {
      const matchesCategory = currentCategory === 'all' || product.category.toLowerCase() === currentCategory.toLowerCase();
      const matchesSearch = product.title.toLowerCase().includes(query) || product.description.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });

    // Apply Sorting
    const sortValue = sortSelect.value;
    if (sortValue === 'price-low') {
      filteredProducts.sort((a, b) => a.price - b.price);
    } else if (sortValue === 'price-high') {
      filteredProducts.sort((a, b) => b.price - a.price);
    } else if (sortValue === 'rating') {
      filteredProducts.sort((a, b) => b.rating.rate - a.rating.rate);
    }

    renderProducts(filteredProducts);
  }

  // Event Listeners for Filters
  searchInput.addEventListener('input', () => {
    clearSearchBtn.classList.toggle('d-none', searchInput.value === '');
    applyFilters();
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearSearchBtn.classList.add('d-none');
    applyFilters();
  });

  categoryContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('category-btn')) {
      document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
      e.target.classList.add('active');

      currentCategory = e.target.getAttribute('data-category');
      
      if (currentCategory !== 'all') {
        activeFilterBadge.classList.remove('d-none');
        activeFilterName.textContent = e.target.textContent;
      } else {
        activeFilterBadge.classList.add('d-none');
      }

      applyFilters();
    }
  });

  sortSelect.addEventListener('change', applyFilters);

  // Cart Functions
  window.addToCart = function(productId) {
    const product = products.find(p => p.id === productId);
    const existing = cart.find(item => item.id === productId);

    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({ ...product, quantity: 1 });
    }

    saveCart();
    updateCartUI();

    // GSAP Cart Badge Animation Trigger
    gsap.fromTo('#cartBadge', { scale: 1.6 }, { scale: 1, duration: 0.3, ease: 'back.out(2)' });
  };

  window.updateQuantity = function(productId, delta) {
    const item = cart.find(i => i.id === productId);
    if (item) {
      item.quantity += delta;
      if (item.quantity <= 0) {
        cart = cart.filter(i => i.id !== productId);
      }
    }
    saveCart();
    updateCartUI();
  };

  function saveCart() {
    localStorage.setItem('aurastore_cart', JSON.stringify(cart));
  }

  function updateCartUI() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    cartBadge.textContent = totalItems;
    cartSubtotal.textContent = `$${subtotal.toFixed(2)}`;

    if (cart.length === 0) {
      cartItemsList.innerHTML = `
        <div class="text-center py-5">
          <i class="fa-solid fa-cart-flatbed text-muted fs-1 mb-3"></i>
          <p class="text-muted fw-semibold">Your bag is currently empty.</p>
        </div>
      `;
      return;
    }

    cartItemsList.innerHTML = cart.map(item => `
      <div class="cart-item-card d-flex align-items-center gap-3">
        <img src="${item.image}" alt="${item.title}" class="cart-item-img" />
        <div class="flex-grow-1 overflow-hidden">
          <h6 class="mb-1 text-truncate small fw-bold">${item.title}</h6>
          <span class="text-violet fw-extrabold small">$${item.price.toFixed(2)}</span>
          <div class="d-flex align-items-center gap-2 mt-2">
            <button class="btn btn-sm btn-light border py-0 px-2" onclick="updateQuantity(${item.id}, -1)">-</button>
            <span class="small fw-bold">${item.quantity}</span>
            <button class="btn btn-sm btn-light border py-0 px-2" onclick="updateQuantity(${item.id}, 1)">+</button>
          </div>
        </div>
        <button class="btn btn-sm text-danger border-0" onclick="updateQuantity(${item.id}, -${item.quantity})">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>
    `).join('');
  }

  // Product Modal View
  window.openProductModal = function(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    modalProductBody.innerHTML = `
      <div class="row g-4 align-items-center">
        <div class="col-md-5 text-center">
          <img src="${product.image}" alt="${product.title}" class="img-fluid max-vh-50 p-3" style="max-height: 280px; object-fit: contain;" />
        </div>
        <div class="col-md-7">
          <span class="badge bg-magenta rounded-pill text-uppercase mb-2">${product.category}</span>
          <h4 class="fw-bold mb-2">${product.title}</h4>
          <div class="d-flex align-items-center gap-2 mb-3 text-warning">
            <i class="fa-solid fa-star"></i>
            <span class="fw-bold text-dark">${product.rating.rate}</span>
            <span class="text-muted small">(${product.rating.count} reviews)</span>
          </div>
          <p class="text-muted small mb-4">${product.description}</p>
          <div class="d-flex align-items-center justify-content-between pt-3 border-top">
            <span class="fs-3 fw-extrabold text-violet">$${product.price.toFixed(2)}</span>
            <button class="btn btn-checkout py-2 px-4 rounded-3 fw-bold" onclick="addToCart(${product.id})">
              <i class="fa-solid fa-cart-plus me-2"></i> Add To Bag
            </button>
          </div>
        </div>
      </div>
    `;

    const productModal = new bootstrap.Modal(document.getElementById('productModal'));
    productModal.show();
  };

  checkoutBtn.addEventListener('click', () => {
    if (cart.length === 0) return;
    alert('🎉 Thank you for your order! Checkout simulated successfully.');
    cart = [];
    saveCart();
    updateCartUI();
  });

  // Initial Load
  fetchProducts();
});