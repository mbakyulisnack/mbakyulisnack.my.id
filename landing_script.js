document.addEventListener('DOMContentLoaded', () => {
    // Definisi elemen DOM
    const catalogPage = document.getElementById('catalog-page');
    const cartPage = document.getElementById('cart-page');
    const productSearchInput = document.getElementById('product-search');
    const cartIcon = document.getElementById('cart-icon');
    const cartBadge = document.getElementById('cart-badge');
    const productListContainer = document.getElementById('product-list-container');
    const cartItemsList = document.getElementById('cart-items-list');
    const cartTotalPrice = document.getElementById('cart-total-price');
    const backToCatalogButton = document.getElementById('back-to-catalog');
    const orderDateInput = document.getElementById('order-date');
    const orderTimeInput = document.getElementById('order-time');
    const orderTimePeriodSpan = document.getElementById('order-time-period');
    const customerNameInput = document.getElementById('customer-name');
    const customerWhatsappInput = document.getElementById('customer-whatsapp');
    const countryCodeSelect = $('#country-code');
    const branchSelect = $('#branch-select');
    const sendOrderButton = document.getElementById('send-order-button');
    const loadingSpinner = document.getElementById('loading-spinner');

    // Modal Elements - Pastikan productModal ada sebelum mencari elemen di dalamnya
    const productModal = document.getElementById('product-modal');
    if (!productModal) {
        console.error("Essential DOM element 'product-modal' not found. Script might not function correctly.");
        return;
    }

    const modalProductImage = document.getElementById('modal-product-image');
    const modalProductName = document.getElementById('modal-product-name');
    const modalProductPrice = document.getElementById('modal-product-price');
    const modalQuantityInput = document.getElementById('modal-quantity-input');
    const modalDecreaseQtyBtn = document.getElementById('modal-decrease-qty-btn');
    const modalIncreaseQtyBtn = document.getElementById('modal-increase-qty-btn');
    const modalAddToCartBtn = document.getElementById('modal-add-to-cart-btn');
    const modalCloseButton = productModal.querySelector('.close-button');
    let currentProductInModal = null;

    // Final comprehensive check for ALL essential elements
    const essentialElements = {
        catalogPage: catalogPage,
        cartPage: cartPage,
        productSearchInput: productSearchInput,
        cartIcon: cartIcon,
        cartBadge: cartBadge,
        productListContainer: productListContainer,
        cartTotalPrice: cartTotalPrice,
        backToCatalogButton: backToCatalogButton,
        orderDateInput: orderDateInput,
        orderTimeInput: orderTimeInput,
        orderTimePeriodSpan: orderTimePeriodSpan,
        customerNameInput: customerNameInput,
        customerWhatsappInput: customerWhatsappInput,
        countryCodeSelect: countryCodeSelect,
        branchSelect: branchSelect,
        sendOrderButton: sendOrderButton,
        loadingSpinner: loadingSpinner,
        modalProductImage: modalProductImage,
        modalProductName: modalProductName,
        modalProductPrice: modalProductPrice,
        modalQuantityInput: modalQuantityInput,
        modalDecreaseQtyBtn: modalDecreaseQtyBtn,
        modalIncreaseQtyBtn: modalIncreaseQtyBtn,
        modalAddToCartBtn: modalAddToCartBtn,
        modalCloseButton: modalCloseButton
    };

    let missingElements = [];
    for (const [key, value] of Object.entries(essentialElements)) {
        if (value === null || typeof value === 'undefined') {
            missingElements.push(key);
        }
    }

    if (missingElements.length > 0) {
        console.error(`One or more essential DOM elements are missing after specific checks: ${missingElements.join(', ')}. Script might not function correctly.`);
        return;
    }

    // NEW: Sembunyikan modal secara eksplisit di awal, sebagai failsafe
    productModal.style.display = 'none';

    // NEW: URL dasar untuk gambar produk (jika masih di hosting server Anda)
    // Sesuaikan ini jika gambar Anda dihosting di Firebase Storage, atau di CDN lain
    const BASE_PRODUCT_IMAGE_URL = 'https://mbakyulisnack.my.id/uploads/jajans/';

    let allProducts = [];
    let cart = []; // Array of { id, nama, harga, quantity, foto }

    const LOCAL_STORAGE_CART_KEY = 'jajan_cart';

    // Utility Functions
    window.showSpinner = () => { loadingSpinner.style.display = 'block'; };
    window.hideSpinner = () => { loadingSpinner.style.display = 'none'; };

    window.showToast = (message, type = 'success') => {
        Swal.fire({
            toast: true,
            position: 'bottom-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
            icon: type,
            title: message,
            didOpen: (toast) => {
                toast.addEventListener('mouseenter', Swal.stopTimer);
                toast.addEventListener('mouseleave', Swal.resumeTimer);
            }
        });
    };

    function formatRupiah(amount) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    }

    function getFormattedIndonesianDate(dateString) {
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const year = date.getFullYear();
        const monthNamesId = [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];
        const month = monthNamesId[date.getMonth()];
        return `${day}-${month}-${year}`;
    }

    function formatTimeOfDay(timeString) {
        if (!timeString) return '';
        const [hours, minutes] = timeString.split(':').map(Number);
        let period = '';

        if (hours >= 0 && hours < 6) {
            period = 'Dini Hari';
        } else if (hours >= 6 && hours < 11) {
            period = 'Pagi';
        } else if (hours >= 11 && hours < 15) {
            period = 'Siang';
        } else if (hours >= 15 && hours < 18) {
            period = 'Sore';
        } else {
            period = 'Malam';
        }
        return `${timeString} ${period}`;
    }

    // --- Page Navigation ---
    function showPage(pageId) {
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        document.getElementById(pageId).classList.add('active');

        if (pageId === 'cart-page') {
            renderCart();
            loadBranches();
        }
    }

    // --- Cart Logic (LocalStorage) ---
    function saveCart() {
        localStorage.setItem(LOCAL_STORAGE_CART_KEY, JSON.stringify(cart));
        updateCartBadge();
        console.log("Cart saved:", cart);
    }

    function loadCart() {
        const storedCart = localStorage.getItem(LOCAL_STORAGE_CART_KEY);
        if (storedCart) {
            cart = JSON.parse(storedCart);
            updateCartBadge();
        } else {
            cart = [];
            updateCartBadge();
        }
    }

    function updateCartBadge() {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        if (cartBadge) {
            cartBadge.textContent = totalItems;
            cartBadge.style.display = totalItems > 0 ? 'block' : 'none';
            console.log("Cart badge updated. Total items:", totalItems);
        } else {
            console.error("Cart badge element not found for update.");
        }
    }

    function addToCart(product, quantity = 1) {
        console.log("Attempting to add to cart:", product, "Quantity:", quantity);

        const existingItem = cart.find(item => item.id === product.id); // Perubahan: id sekarang string dari Firebase
        if (existingItem) {
            existingItem.quantity += quantity;
            console.log(`Increased quantity for ${product.nama_katalog}. New quantity: ${existingItem.quantity}`);
        } else {
            cart.push({
                id: product.id, // ID dari Firebase
                nama: product.nama_katalog,
                harga: parseFloat(product.harga_katalog),
                quantity: quantity,
                foto: product.foto_katalog // Ini akan menjadi path relatif dari Firebase
            });
            console.log(`Added ${product.nama_katalog} to cart for the first time with quantity ${quantity}.`);
        }
        saveCart();
        window.showToast(`${product.nama_katalog} ditambahkan ke keranjang!`);
    }

    function removeFromCart(productId) {
        Swal.fire({
            title: 'Hapus Item?',
            text: 'Anda yakin ingin menghapus item ini dari keranjang?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Ya, Hapus!',
            cancelButtonText: 'Batal'
        }).then((result) => {
            if (result.isConfirmed) {
                cart = cart.filter(item => item.id !== productId);
                saveCart();
                renderCart();
                window.showToast('Item berhasil dihapus!', 'success');
                console.log(`Product ID ${productId} removed from cart.`);
            }
        });
    }

    function updateCartItemQuantity(productId, change) {
        const item = cart.find(i => i.id === productId);
        if (item) {
            item.quantity += change;
            if (item.quantity <= 0) {
                removeFromCart(productId);
            } else {
                saveCart();
                renderCart();
            }
            console.log(`Quantity for product ID ${productId} changed by ${change}. New quantity: ${item.quantity || 0}`);
        }
    }

    function updateCartItemQuantityFromInput(productId, newQuantity) {
        const item = cart.find(i => i.id === productId);
        if (item) {
            item.quantity = newQuantity;
            if (item.quantity <= 0) {
                removeFromCart(productId);
            } else {
                saveCart();
                renderCart();
            }
            console.log(`Quantity for product ID ${productId} updated to: ${item.quantity}`);
        }
    }

    function calculateCartTotal() {
        return cart.reduce((total, item) => total + (item.harga * item.quantity), 0);
    }

    // --- Product Catalog Rendering (FETCH FROM FIREBASE) ---
    async function fetchProducts(searchTerm = '') {
        showSpinner();
        try {
            const jajansRef = window.firebaseRef(window.firebaseDatabase, 'jajans');
            window.firebaseOnValue(jajansRef, (snapshot) => {
                const data = snapshot.val();
                hideSpinner();

                if (data) {
                    allProducts = Object.keys(data).map(key => ({
                        id: key,
                        ...data[key]
                    }));
                    console.log("Fetched products from Firebase successfully:", allProducts);
                    renderProductCards(searchTerm);
                } else {
                    productListContainer.innerHTML = '<p class="text-center">Belum ada jajan yang tersedia di Firebase.</p>';
                    allProducts = [];
                    console.log("No products available in Firebase.");
                }
            }, (error) => {
                hideSpinner();
                console.error('Error fetching products from Firebase:', error);
                productListContainer.innerHTML = '<p class="text-center">Terjadi kesalahan saat memuat daftar jajan dari Firebase.</p>';
                window.showToast('Gagal memuat daftar jajan dari Firebase.', 'error');
                allProducts = [];
            });
        } catch (error) {
            hideSpinner();
            console.error('Error setting up Firebase listener for products:', error);
            productListContainer.innerHTML = '<p class="text-center">Terjadi kesalahan saat inisialisasi Firebase.</p>';
            window.showToast('Gagal menginisialisasi listener jajan Firebase.', 'error');
        }
    }

    function renderProductCards(searchTerm = '') {
        const filteredProducts = allProducts.filter(product =>
            product.nama_katalog.toLowerCase().includes(searchTerm.toLowerCase()) &&
            !product.foto_katalog.includes('placeholder.jpg') // Tetap filter placeholder jika ada
        );

        productListContainer.innerHTML = '';
        if (filteredProducts.length === 0) {
            productListContainer.innerHTML = '<p class="text-center">Tidak ada jajan yang cocok dengan pencarian Anda atau belum ada jajan dengan gambar asli.</p>';
            return;
        }

        filteredProducts.forEach(product => {
            const productCard = document.createElement('div');
            productCard.className = 'product-card';
            // Gabungkan BASE_PRODUCT_IMAGE_URL dengan foto_katalog dari Firebase
            const imageUrl = product.foto_katalog.startsWith('http') ? product.foto_katalog : BASE_PRODUCT_IMAGE_URL + product.foto_katalog;

            productCard.innerHTML = `
                <img src="${imageUrl}" alt="${product.nama_katalog}">
                <div class="product-info">
                    <h3>${product.nama_katalog}</h3>
                    <p>${formatRupiah(product.harga_katalog)}</p>
                    <button class="add-to-cart-btn" data-product-id="${product.id}">Pesan</button>
                </div>
            `;
            productCard.addEventListener('click', () => {
                openProductModal(product);
            });
            productListContainer.appendChild(productCard);
        });
        console.log(`Rendered ${filteredProducts.length} products.`);
    }

    function animateToCart(buttonElement) {
        const flyingImg = buttonElement.closest('.product-card').querySelector('img').cloneNode();
        flyingImg.style.cssText = `
            position: fixed;
            z-index: 1000;
            width: ${buttonElement.offsetWidth}px;
            height: ${buttonElement.offsetHeight}px;
            object-fit: cover;
            border-radius: ${varToPx('--border-radius')}px;
            transition: all 0.8s cubic-bezier(0.68, -0.55, 0.27, 1.55);
        `;

        const buttonRect = buttonElement.getBoundingClientRect();
        const cartIconRect = cartIcon.getBoundingClientRect();

        flyingImg.style.left = `${buttonRect.left}px`;
        flyingImg.style.top = `${buttonRect.top}px`;

        document.body.appendChild(flyingImg);

        const dx = cartIconRect.left + cartIconRect.width / 2 - (buttonRect.left + buttonRect.width / 2);
        const dy = cartIconRect.top + cartIconRect.height / 2 - (buttonRect.top + buttonRect.height / 2);

        flyingImg.style.setProperty('--dx', `${dx}px`);
        flyingImg.style.setProperty('--dy', `${dy}px`);
        flyingImg.style.animation = 'flyToCart 0.8s forwards';

        flyingImg.addEventListener('animationend', () => {
            flyingImg.remove();
        });
    }

    function varToPx(variableName) {
        return parseFloat(getComputedStyle(document.documentElement).getPropertyValue(variableName));
    }


    // --- Cart Page Rendering ---
    function renderCart() {
        cartItemsList.innerHTML = '';
        if (cart.length === 0) {
            cartItemsList.innerHTML = '<p class="text-center">Keranjang Anda kosong.</p>';
            sendOrderButton.disabled = true;
        } else {
            cart.forEach(item => {
                // Pastikan URL gambar digabungkan dengan BASE_PRODUCT_IMAGE_URL
                const imageUrl = item.foto && item.foto.startsWith('http') ? item.foto : BASE_PRODUCT_IMAGE_URL + (item.foto || 'placeholder.jpg');

                const cartItemDiv = document.createElement('div');
                cartItemDiv.className = 'cart-item';
                cartItemDiv.innerHTML = `
                    <img src="${imageUrl}" alt="${item.nama}">
                    <div class="item-details">
                        <h4>${item.nama}</h4>
                        <p>${formatRupiah(item.harga)}</p>
                    </div>
                    <div class="item-quantity-control">
                        <button class="secondary-button decrease-qty-btn" data-id="${item.id}">-</button>
                        <input type="number" class="item-quantity-input" data-id="${item.id}" value="${item.quantity}" min="1">
                        <button class="primary-button increase-qty-btn" data-id="${item.id}">+</button>
                    </div>
                    <button class="remove-item-btn" data-id="${item.id}"><i class="fas fa-trash"></i></button>
                `;
                cartItemsList.appendChild(cartItemDiv);
            });

            // Add event listeners for quantity buttons
            document.querySelectorAll('.decrease-qty-btn').forEach(button => {
                button.addEventListener('click', (event) => {
                    const id = event.target.dataset.id; // ID dari Firebase adalah string
                    updateCartItemQuantity(id, -1);
                });
            });

            document.querySelectorAll('.increase-qty-btn').forEach(button => {
                button.addEventListener('click', (event) => {
                    const id = event.target.dataset.id; // ID dari Firebase adalah string
                    updateCartItemQuantity(id, 1);
                });
            });

            // Add event listener for quantity input (keyboard input)
            document.querySelectorAll('.item-quantity-input').forEach(input => {
                input.addEventListener('change', (event) => {
                    const id = event.target.dataset.id; // ID dari Firebase adalah string
                    let newQuantity = parseInt(event.target.value);

                    if (isNaN(newQuantity) || newQuantity < 1) {
                        newQuantity = 1;
                        event.target.value = 1;
                    }
                    updateCartItemQuantityFromInput(id, newQuantity);
                });
            });

            // Event listeners for individual remove item buttons
            document.querySelectorAll('.remove-item-btn').forEach(button => {
                button.addEventListener('click', (event) => {
                    const id = event.currentTarget.dataset.id; // ID dari Firebase adalah string
                    removeFromCart(id);
                });
            });

            sendOrderButton.disabled = false;
        }
        cartTotalPrice.textContent = formatRupiah(calculateCartTotal());
    }

    // --- Modal Functions ---
    function openProductModal(product) {
        currentProductInModal = product;

        // Gabungkan BASE_PRODUCT_IMAGE_URL dengan foto_katalog dari Firebase
        const imageUrl = product.foto_katalog.startsWith('http') ? product.foto_katalog : BASE_PRODUCT_IMAGE_URL + product.foto_katalog;

        modalProductImage.src = imageUrl;
        modalProductImage.alt = product.nama_katalog;
        modalProductName.textContent = product.nama_katalog;
        modalProductPrice.textContent = formatRupiah(product.harga_katalog);
        modalQuantityInput.value = 1;

        productModal.style.display = 'flex';
        modalQuantityInput.dataset.productId = product.id;
    }

    function closeProductModal() {
        productModal.style.display = 'none';
        currentProductInModal = null;
    }

    modalCloseButton.addEventListener('click', closeProductModal);

    productModal.addEventListener('click', (event) => {
        if (event.target === productModal) {
            closeProductModal();
        }
    });

    modalDecreaseQtyBtn.addEventListener('click', () => {
        let currentQty = parseInt(modalQuantityInput.value);
        if (currentQty > 1) {
            modalQuantityInput.value = currentQty - 1;
        }
    });

    modalIncreaseQtyBtn.addEventListener('click', () => {
        let currentQty = parseInt(modalQuantityInput.value);
        modalQuantityInput.value = currentQty + 1;
    });

    modalQuantityInput.addEventListener('change', () => {
        let newQty = parseInt(modalQuantityInput.value);
        if (isNaN(newQty) || newQty < 1) {
            modalQuantityInput.value = 1;
        }
    });

    modalAddToCartBtn.addEventListener('click', (event) => {
        if (currentProductInModal) {
            const quantity = parseInt(modalQuantityInput.value);
            addToCart(currentProductInModal, quantity);
            closeProductModal();
        } else {
            console.error("No product selected in modal.");
        }
    });

    // --- Branch Selection (Select2) (FETCH FROM FIREBASE) ---
    async function loadBranches() {
        showSpinner();
        try {
            const branchesRef = window.firebaseRef(window.firebaseDatabase, 'branches');
            window.firebaseOnValue(branchesRef, (snapshot) => {
                const data = snapshot.val();
                hideSpinner();

                if (data) {
                    const options = Object.keys(data).map(key => ({
                        id: key, // ID dari Firebase
                        text: `${data[key].cabang} - (${data[key].nama_lengkap})`,
                        whatsapp: data[key].whatsapp
                    }));

                    branchSelect.empty().append(new Option('Pilih Cabang', '', true, true));
                    branchSelect.select2({
                        data: options,
                        placeholder: "Pilih Cabang",
                        allowClear: true
                    });

                    branchSelect.on('change', () => {
                        const isCartEmpty = cart.length === 0;
                        const isBranchSelected = branchSelect.val() !== '';
                        sendOrderButton.disabled = isCartEmpty || !isBranchSelected;
                    });
                    branchSelect.trigger('change');

                } else {
                    window.showToast('Gagal memuat daftar cabang dari Firebase.', 'error');
                    branchSelect.empty().append(new Option('Tidak ada cabang tersedia di Firebase', '', true, true));
                    branchSelect.select2({
                        placeholder: "Tidak ada cabang",
                        disabled: true
                    });
                    sendOrderButton.disabled = true;
                }
            }, (error) => {
                hideSpinner();
                console.error('Error loading branches from Firebase:', error);
                window.showToast('Terjadi kesalahan saat memuat data cabang dari Firebase.', 'error');
                branchSelect.empty().append(new Option('Error memuat cabang Firebase', '', true, true));
                branchSelect.select2({
                    placeholder: "Error",
                    disabled: true
                });
                sendOrderButton.disabled = true;
            });
        } catch (error) {
            hideSpinner();
            console.error('Error setting up Firebase listener for branches:', error);
            window.showToast('Gagal menginisialisasi listener cabang Firebase.', 'error');
        }
    }

    // --- Send Order to WhatsApp (SAVE TO FIREBASE) ---
    sendOrderButton.addEventListener('click', async () => {
        const selectedBranchId = branchSelect.val();
        const customerName = customerNameInput.value;
        const customerNumber = customerWhatsappInput.value;
        const fullCustomerWhatsapp = countryCodeSelect.val() + customerNumber;
        const orderDate = orderDateInput.value;
        const orderTime = orderTimeInput.value;

        if (!selectedBranchId || !customerNumber || !customerName || !orderDate || !orderTime || cart.length === 0) {
            window.showToast('Mohon lengkapi semua detail pesanan dan pastikan keranjang tidak kosong.', 'error');
            return;
        }

        if (!/^[0-9]{8,15}$/.test(customerNumber)) {
            window.showToast('Format nomor WhatsApp pemesan tidak valid. Contoh: 81234567890', 'error');
            return;
        }

        showSpinner();
        try {
            // Ambil detail cabang yang dipilih untuk mendapatkan nomor WhatsApp cabang
            const branchData = branchSelect.select2('data')[0];
            const branchWhatsapp = branchData ? branchData.whatsapp : '';

            if (!branchWhatsapp) {
                window.showToast('Nomor WhatsApp cabang tidak ditemukan.', 'error');
                hideSpinner();
                return;
            }

            // Siapkan data pesanan untuk Firebase
            const orderData = {
                customer_name: customerName,
                customer_whatsapp: fullCustomerWhatsapp,
                order_date: getFormattedIndonesianDate(orderDate),
                order_time: orderTime,
                branch_id: selectedBranchId,
                branch_whatsapp: branchWhatsapp, // Simpan juga nomor WhatsApp cabang
                cart_items: cart.map(item => ({
                    id: item.id,
                    nama: item.nama,
                    harga: item.harga,
                    quantity: item.quantity,
                    foto: item.foto // Simpan URL foto juga jika perlu untuk catatan
                })),
                total_price: calculateCartTotal(),
                timestamp: new Date().toISOString() // Tambahkan timestamp untuk sorting/logging
            };

            // Simpan pesanan ke Firebase Realtime Database di path 'orders'
            const newOrderRef = window.firebasePush(window.firebaseRef(window.firebaseDatabase, 'orders'));
            await window.firebaseSet(newOrderRef, orderData);

            window.showToast('Pesanan berhasil dikirim dan disimpan di Firebase!');
            cart = [];
            saveCart();
            renderCart();
            customerNameInput.value = '';
            customerWhatsappInput.value = '';
            showPage('catalog-page');

            // Opsional: Redirect ke WhatsApp Web/App setelah menyimpan ke Firebase
            const waMessage = generateWhatsAppMessage(orderData);
            window.open(`https://wa.me/${branchWhatsapp}?text=${encodeURIComponent(waMessage)}`, '_blank');

        } catch (error) {
            hideSpinner();
            console.error('Error sending order to Firebase:', error);
            window.showToast('Terjadi kesalahan saat mengirim pesanan ke Firebase.', 'error');
        }
    });

    // Fungsi baru untuk generate pesan WhatsApp
    function generateWhatsAppMessage(order) {
        let message = `*Pesanan Baru Mbak Yuli Snack*\n\n`;
        message += `*Nama Pemesan:* ${order.customer_name}\n`;
        message += `*No. WA Pemesan:* ${order.customer_whatsapp}\n`;
        message += `*Tanggal/Jam Ambil:* ${order.order_date}, ${order.order_time}\n`;
        message += `*Cabang:* ${order.branch_id ? branchSelect.select2('data')[0].text : 'Tidak diketahui'}\n\n`; // Ambil teks cabang dari select2

        message += `*Detail Pesanan:*\n`;
        order.cart_items.forEach(item => {
            message += `- ${item.nama} x ${item.quantity} (${formatRupiah(item.harga)}) = ${formatRupiah(item.harga * item.quantity)}\n`;
        });
        message += `\n*Total Harga:* ${formatRupiah(order.total_price)}\n\n`;
        message += `Terima kasih atas pesanannya!`;
        return message;
    }

    // --- Event Listeners (Other) ---
    productSearchInput.addEventListener('input', (event) => {
        renderProductCards(event.target.value);
    });

    if (cartIcon) {
        cartIcon.addEventListener('click', () => {
            console.log("Cart icon clicked!");
            showPage('cart-page');
        });
    } else {
        console.error("Cart icon element not found!");
    }

    backToCatalogButton.addEventListener('click', () => {
        showPage('catalog-page');
    });

    // Set default date and time for order form
    const now = new Date();
    orderDateInput.value = now.toISOString().split('T')[0];

    const defaultTime = now.toTimeString().split(' ')[0].substring(0, 5);
    orderTimeInput.value = defaultTime;
    if (orderTimePeriodSpan) {
        orderTimePeriodSpan.textContent = formatTimeOfDay(defaultTime);
    }

    orderTimeInput.addEventListener('input', () => {
        if (orderTimePeriodSpan) {
            orderTimePeriodSpan.textContent = formatTimeOfDay(orderTimeInput.value);
        }
    });

    // Inisialisasi Select2 untuk kode negara
    const countryCodes = [
        { id: '+62', text: '+62' },
        { id: '+1', text: '+1' },
        { id: '+44', text: '+44' },
        { id: '+60', text: '+60' },
        { id: '+65', text: '+65' },
        { id: '+61', text: '+61' },
        { id: '+81', text: '+81' },
        { id: '+86', text: '+86' },
        { id: '+91', text: '+91' },
        // Tambahkan kode negara lain sesuai kebutuhan
    ];

    countryCodeSelect.select2({
        data: countryCodes,
        placeholder: "Pilih Kode",
        allowClear: false,
        minimumResultsForSearch: Infinity
    });
    countryCodeSelect.val('+62').trigger('change');

    // Initial load
    console.log("DOM Content Loaded. Initializing app.");
    loadCart();
    fetchProducts();

    hideSpinner();
});