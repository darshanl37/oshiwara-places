/* Oshiwara Places — app.js */
(function(){
'use strict';

/* ===== CATEGORY MAPPING ===== */
const CAT_MAP = {
  food: ['restaurant','bar','cafe','bakery','night_club','meal_delivery','meal_takeaway','food'],
  health: ['doctor','hospital','dentist','physiotherapist','pharmacy','health','veterinary_care'],
  beauty: ['beauty_salon','hair_care','spa','gym'],
  shopping: ['store','clothing_store','shoe_store','jewelry_store','shopping_mall','electronics_store',
             'home_goods_store','furniture_store','pet_store','book_store','convenience_store',
             'supermarket','hardware_store','bicycle_store'],
  services: ['real_estate_agency','insurance_agency','travel_agency','car_repair','car_dealer',
             'car_wash','atm','bank','accounting','lawyer','locksmith','painter','plumber',
             'electrician','moving_company','storage','laundry','lodging','school','university']
};

function getCategory(types) {
  if (!types) return 'services';
  for (const [cat, list] of Object.entries(CAT_MAP)) {
    if (types.some(t => list.includes(t))) return cat;
  }
  return 'services';
}

function getCategoryLabel(cat) {
  return {food:'Food & Drinks',health:'Health & Medical',beauty:'Beauty & Wellness',
          shopping:'Shopping',services:'Services'}[cat] || 'Other';
}

function getTypeLabel(types) {
  if (!types || !types.length) return '';
  const map = {restaurant:'Restaurant',bar:'Bar',cafe:'Cafe',bakery:'Bakery',doctor:'Doctor',
    hospital:'Hospital',dentist:'Dentist',pharmacy:'Pharmacy',beauty_salon:'Salon',
    hair_care:'Hair Care',spa:'Spa',gym:'Gym',store:'Store',night_club:'Nightclub'};
  for (const t of types) { if (map[t]) return map[t]; }
  return '';
}

/* ===== STARS ===== */
function starsHTML(rating, size) {
  if (!rating) return '';
  const full = Math.floor(rating);
  const half = rating - full >= 0.3;
  const empty = 5 - full - (half ? 1 : 0);
  const sz = size || 14;
  let s = `<span class="stars" style="font-size:${sz}px">`;
  for (let i = 0; i < full; i++) s += '\u2605';
  if (half) s += '\u2606';
  for (let i = 0; i < empty; i++) s += '\u2606';
  return s + '</span>';
}

/* ===== GRADIENT CLASS ===== */
function gradClass(types) {
  return 'grad-' + getCategory(types);
}

/* ===== SOURCE BADGE ===== */
function srcBadge(name) {
  const n = name.toLowerCase();
  if (n.includes('google')) return '<span class="card-src cs-google">Google</span>';
  if (n.includes('magicpin')) return '<span class="card-src cs-magicpin">MagicPin</span>';
  if (n.includes('tripadvisor')) return '<span class="card-src cs-tripadvisor">TripAdvisor</span>';
  if (n.includes('practo')) return '<span class="card-src cs-practo">Practo</span>';
  if (n.includes('slurrp')) return '<span class="card-src cs-slurrp">Slurrp</span>';
  if (n.includes('websearch') || n.includes('blog')) return '<span class="card-src cs-blog">Blog</span>';
  return `<span class="card-src cs-blog">${name}</span>`;
}

/* ===== ENRICH DATA ===== */
PLACES.forEach(p => {
  p._cat = getCategory(p.types);
  p._searchText = [p.name, p.address, p.formatted_address,
    p.known_for, (p.cuisines||[]).join(' '), getCategoryLabel(p._cat),
    getTypeLabel(p.types)].filter(Boolean).join(' ').toLowerCase();
});

/* ===== STATE ===== */
let filtered = [...PLACES];
let displayed = 0;
const BATCH = 30;
let currentCat = 'all';
let currentSort = 'reviews';
let currentRating = 0;
let currentSearch = '';
let hasReviewsOnly = false;

/* ===== DOM ===== */
const grid = document.getElementById('cardsGrid');
const loadMore = document.getElementById('loadMore');
const resultCount = document.getElementById('resultCount');
const searchInput = document.getElementById('searchInput');
const searchClear = document.getElementById('searchClear');
const sortSelect = document.getElementById('sortSelect');
const ratingFilter = document.getElementById('ratingFilter');
const hasReviewsCheck = document.getElementById('hasReviews');
const modalOverlay = document.getElementById('modalOverlay');
const modalContent = document.getElementById('modalContent');
const modalClose = document.getElementById('modalClose');

/* ===== FILTER & SORT ===== */
function applyFilters() {
  filtered = PLACES.filter(p => {
    if (currentCat !== 'all' && p._cat !== currentCat) return false;
    if (currentRating && (!p.rating || p.rating < currentRating)) return false;
    if (hasReviewsOnly && (!p.reviews || !p.reviews.length)) return false;
    if (currentSearch && !p._searchText.includes(currentSearch)) return false;
    return true;
  });
  if (currentSort === 'reviews') filtered.sort((a,b) => (b.user_ratings_total||0) - (a.user_ratings_total||0));
  else if (currentSort === 'rating') filtered.sort((a,b) => (b.rating||0) - (a.rating||0));
  else filtered.sort((a,b) => (a.name||'').localeCompare(b.name||''));
  displayed = 0;
  grid.innerHTML = '';
  renderBatch();
  resultCount.textContent = `Showing ${filtered.length} of ${PLACES.length} places`;
}

/* ===== RENDER CARDS ===== */
function renderBatch() {
  const end = Math.min(displayed + BATCH, filtered.length);
  const frag = document.createDocumentFragment();
  for (let i = displayed; i < end; i++) {
    frag.appendChild(createCard(filtered[i]));
  }
  grid.appendChild(frag);
  displayed = end;
  loadMore.style.display = displayed < filtered.length ? 'block' : 'none';
  observeImages();
}

function createCard(p) {
  const card = document.createElement('div');
  card.className = 'card';
  card.onclick = () => openModal(p);

  const cat = getCategoryLabel(p._cat);
  const typeLabel = getTypeLabel(p.types) || cat;
  const hasPhoto = !!p.photo_url;
  const initial = (p.name||'?')[0].toUpperCase();

  let imgHTML;
  if (hasPhoto) {
    imgHTML = `<img class="card-img" data-src="${p.photo_url}" alt="${esc(p.name)}" loading="lazy">`;
  } else {
    imgHTML = `<div class="card-img-placeholder ${gradClass(p.types)}">${initial}</div>`;
  }

  let sources = '<span class="card-src cs-google">Google</span>';
  if (p.external_source_names) {
    sources += p.external_source_names.map(srcBadge).join('');
  }

  let extras = '';
  if (p.open_now === true) extras += '<span class="card-open">Open now</span> ';
  if (p.known_for) extras += `<div class="card-known">Known for: ${esc(p.known_for.substring(0,100))}</div>`;
  if (p.cuisines && p.cuisines.length) {
    extras += '<div class="card-cuisines">' + p.cuisines.slice(0,4).map(c => `<span class="cuisine-tag">${esc(c)}</span>`).join('') + '</div>';
  }
  if (p.cost_for_two) extras += `<div class="card-cost">\u20B9${p.cost_for_two.toLocaleString('en-IN')} for two</div>`;

  card.innerHTML = `
    <div class="card-img-wrap">
      ${imgHTML}
      <span class="card-badge">${typeLabel}</span>
    </div>
    <div class="card-body">
      <div class="card-name">${esc(p.name)}</div>
      <div class="card-rating">
        ${starsHTML(p.rating)} <span class="rating-num">${p.rating||'N/A'}</span>
        <span class="rating-count">(${(p.user_ratings_total||0).toLocaleString()} reviews)</span>
      </div>
      <div class="card-sources">${sources}</div>
      ${extras}
      <div class="card-address">${esc(p.formatted_address || p.address || '')}</div>
    </div>`;
  return card;
}

/* ===== LAZY IMAGES ===== */
let imgObserver;
function observeImages() {
  if (!imgObserver) {
    imgObserver = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const img = e.target;
          if (img.dataset.src) { img.src = img.dataset.src; delete img.dataset.src; }
          imgObserver.unobserve(img);
        }
      });
    }, {rootMargin:'200px'});
  }
  grid.querySelectorAll('img[data-src]').forEach(img => imgObserver.observe(img));
}

/* ===== INFINITE SCROLL ===== */
const scrollObserver = new IntersectionObserver((entries) => {
  if (entries[0].isIntersecting && displayed < filtered.length) renderBatch();
}, {rootMargin:'400px'});
scrollObserver.observe(loadMore);

/* ===== EVENTS ===== */
document.getElementById('categoryPills').addEventListener('click', e => {
  const btn = e.target.closest('.pill');
  if (!btn) return;
  document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  currentCat = btn.dataset.cat;
  applyFilters();
});

sortSelect.addEventListener('change', () => { currentSort = sortSelect.value; applyFilters(); });
ratingFilter.addEventListener('change', () => { currentRating = parseFloat(ratingFilter.value); applyFilters(); });
hasReviewsCheck.addEventListener('change', () => { hasReviewsOnly = hasReviewsCheck.checked; applyFilters(); });

let searchTimeout;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimeout);
  searchClear.style.display = searchInput.value ? 'flex' : 'none';
  searchTimeout = setTimeout(() => {
    currentSearch = searchInput.value.trim().toLowerCase();
    applyFilters();
  }, 250);
});
searchClear.addEventListener('click', () => {
  searchInput.value = '';
  searchClear.style.display = 'none';
  currentSearch = '';
  applyFilters();
});

/* ===== MODAL ===== */
function openModal(p) {
  const cat = getCategoryLabel(p._cat);
  const initial = (p.name||'?')[0].toUpperCase();
  const hasPhoto = !!p.photo_url;

  let heroHTML = hasPhoto
    ? `<img class="modal-hero" src="${p.photo_url}" alt="${esc(p.name)}">`
    : `<div class="modal-hero-placeholder ${gradClass(p.types)}">${initial}</div>`;

  let sourcesHTML = `<div class="modal-src-card"><strong class="cs-google">Google</strong>${p.rating||'N/A'} \u2605 &middot; ${(p.user_ratings_total||0).toLocaleString()} reviews</div>`;
  if (p.magicpin_rating) sourcesHTML += `<div class="modal-src-card"><strong class="cs-magicpin">MagicPin</strong>${p.magicpin_rating}</div>`;
  if (p.tripadvisor_info) sourcesHTML += `<div class="modal-src-card"><strong class="cs-tripadvisor">TripAdvisor</strong>${esc(p.tripadvisor_info.substring(0,120))}</div>`;

  // Rating breakdown from reviews
  let breakdownHTML = '';
  if (p.reviews && p.reviews.length) {
    const counts = [0,0,0,0,0];
    p.reviews.forEach(r => { if (r.rating>=1&&r.rating<=5) counts[r.rating-1]++; });
    const max = Math.max(...counts, 1);
    breakdownHTML = '<div class="rating-breakdown">';
    for (let i = 4; i >= 0; i--) {
      const pct = (counts[i] / max * 100).toFixed(0);
      breakdownHTML += `<div class="rb-row"><span class="rb-label">${i+1}</span>${starsHTML(1,12)}<div class="rb-bar"><div class="rb-fill" style="width:${pct}%"></div></div><span class="rb-count">${counts[i]}</span></div>`;
    }
    breakdownHTML += '</div>';
  }

  // Reviews list
  let reviewsHTML = '';
  if (p.reviews && p.reviews.length) {
    const sorted = [...p.reviews].sort((a,b) => (b.rating||0) - (a.rating||0));
    reviewsHTML = sorted.map(r => {
      const avatar = r.profile_photo
        ? `<div class="review-avatar"><img src="${r.profile_photo}" alt=""></div>`
        : `<div class="review-avatar">${(r.author||'?')[0].toUpperCase()}</div>`;
      return `<div class="review-item">
        <div class="review-header">${avatar}<div><div class="review-author">${esc(r.author||'Anonymous')}</div><div class="review-time">${esc(r.time||'')}</div></div></div>
        <div class="review-stars">${starsHTML(r.rating,13)}</div>
        <div class="review-text">${esc(r.text||'')}</div>
      </div>`;
    }).join('');
  }

  // Info grid
  let infoItems = '';
  if (p.phone) infoItems += `<div class="modal-info-item"><span>Phone</span><a href="tel:${p.phone}">${esc(p.phone)}</a></div>`;
  if (p.website) infoItems += `<div class="modal-info-item"><span>Website</span><a href="${p.website}" target="_blank" rel="noopener">${esc(p.website.replace(/^https?:\/\//,'').substring(0,40))}</a></div>`;
  if (p.google_url) infoItems += `<div class="modal-info-item"><span>Directions</span><a href="${p.google_url}" target="_blank" rel="noopener">Open in Google Maps</a></div>`;
  if (p.opening_hours) infoItems += `<div class="modal-info-item"><span>Hours</span>${esc(typeof p.opening_hours === 'string' ? p.opening_hours : (Array.isArray(p.opening_hours) ? p.opening_hours.join(', ') : ''))}</div>`;
  if (p.cost_for_two) infoItems += `<div class="modal-info-item"><span>Cost for two</span>\u20B9${p.cost_for_two.toLocaleString('en-IN')}</div>`;

  let sectionsHTML = '';
  if (p.editorial_summary) sectionsHTML += `<div class="modal-section"><h3>About</h3><p>${esc(p.editorial_summary)}</p></div>`;
  if (p.blog_description) sectionsHTML += `<div class="modal-section"><h3>From blogs</h3><p>${esc(p.blog_description)}</p></div>`;
  if (p.known_for) sectionsHTML += `<div class="modal-section"><h3>Known for</h3><p>${esc(p.known_for)}</p></div>`;
  if (p.cuisines && p.cuisines.length) sectionsHTML += `<div class="modal-section"><h3>Cuisines</h3><div class="modal-tags">${p.cuisines.map(c=>`<span class="modal-tag">${esc(c)}</span>`).join('')}</div></div>`;
  if (p.practo_info) sectionsHTML += `<div class="modal-section"><h3>Practo</h3><p>${esc(p.practo_info)}</p></div>`;

  modalContent.innerHTML = `
    ${heroHTML}
    <div class="modal-body">
      <div class="modal-name">${esc(p.name)}</div>
      <div class="modal-cat">${cat} ${p.business_status === 'CLOSED_TEMPORARILY' ? ' &middot; <span style="color:#dc2626">Temporarily Closed</span>' : ''}</div>
      <div class="modal-rating-row">
        <span class="modal-rating-big">${p.rating||'N/A'}</span>
        ${starsHTML(p.rating,20)}
        <span class="modal-review-count">${(p.user_ratings_total||0).toLocaleString()} reviews</span>
      </div>
      <div class="modal-sources">${sourcesHTML}</div>
      ${sectionsHTML}
      ${infoItems ? `<div class="modal-section"><h3>Details</h3><div class="modal-info-grid">${infoItems}</div></div>` : ''}
      ${breakdownHTML ? `<div class="modal-section"><h3>Rating breakdown</h3>${breakdownHTML}</div>` : ''}
      ${reviewsHTML ? `<div class="modal-section"><h3>Reviews</h3>${reviewsHTML}</div>` : ''}
      <div class="modal-section"><h3>Address</h3><p>${esc(p.formatted_address || p.address || '')}</p></div>
    </div>`;

  modalOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

function closeModal() {
  modalOverlay.classList.remove('open');
  document.body.style.overflow = '';
}

/* ===== COUNT-UP ANIMATION ===== */
const statsObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.querySelectorAll('.stat-num').forEach(el => {
        const target = parseInt(el.dataset.target);
        const suffix = el.dataset.suffix || '';
        const duration = 1200;
        const start = performance.now();
        function tick(now) {
          const p = Math.min((now - start) / duration, 1);
          const ease = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(target * ease).toLocaleString() + (p >= 1 ? suffix : '');
          if (p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      });
      statsObserver.unobserve(entry.target);
    }
  });
}, {threshold:0.3});
statsObserver.observe(document.getElementById('statsBar'));

/* ===== GOOGLE MAP ===== */
window.initMap = function() {
  const center = {lat:19.137, lng:72.833};
  const map = new google.maps.Map(document.getElementById('map'), {
    center, zoom:15,
    styles:[
      {featureType:'all',elementType:'geometry',stylers:[{saturation:-20}]},
      {featureType:'water',stylers:[{color:'#e0f0ff'}]},
      {featureType:'road',elementType:'geometry',stylers:[{lightness:30}]},
      {featureType:'poi',elementType:'labels',stylers:[{visibility:'off'}]}
    ],
    mapTypeControl:false, streetViewControl:false, fullscreenControl:false
  });

  const catColors = {food:'#ea580c',health:'#3b82f6',beauty:'#ec4899',shopping:'#6366f1',services:'#10b981'};
  const infoWindow = new google.maps.InfoWindow();

  PLACES.forEach(p => {
    if (!p.lat || !p.lng) return;
    const color = catColors[p._cat] || '#a1a1aa';
    const marker = new google.maps.Marker({
      position:{lat:p.lat,lng:p.lng}, map,
      icon:{
        path:google.maps.SymbolPath.CIRCLE, scale:6,
        fillColor:color, fillOpacity:.85, strokeColor:'#fff', strokeWeight:1.5
      },
      title:p.name
    });
    marker.addListener('click', () => {
      const img = p.photo_url ? `<img src="${p.photo_url}" style="width:200px;height:120px;object-fit:cover;border-radius:8px;margin-bottom:8px">` : '';
      infoWindow.setContent(`<div style="font-family:Inter,sans-serif;max-width:220px">
        ${img}<div style="font-weight:600;font-size:14px">${esc(p.name)}</div>
        <div style="color:#78716c;font-size:12px">${p.rating ? p.rating + ' \u2605' : ''} ${p.user_ratings_total ? '(' + p.user_ratings_total.toLocaleString() + ')' : ''}</div>
      </div>`);
      infoWindow.open(map, marker);
    });
  });
};

/* ===== ESCAPE HTML ===== */
function esc(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

/* ===== INIT ===== */
applyFilters();

})();
