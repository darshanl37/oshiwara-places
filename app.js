/* Oshiwara Place Intelligence — app.js */

const TYPE_MAP = {
  restaurant:'Restaurant',bar:'Bar',cafe:'Cafe',bakery:'Bakery',night_club:'Nightclub',
  doctor:'Doctor',hospital:'Hospital',dentist:'Dentist',physiotherapist:'Physio',pharmacy:'Pharmacy',
  gym:'Gym',spa:'Spa',beauty_salon:'Salon',hair_care:'Salon',
  store:'Shop',clothing_store:'Clothing',grocery_or_supermarket:'Grocery',florist:'Florist',
  liquor_store:'Liquor',home_goods_store:'Home Store',school:'School',lodging:'Hotel',
  meal_takeaway:'Takeaway',meal_delivery:'Delivery'
};

const CAT_GROUPS = {
  'Food & Drinks':['restaurant','bar','cafe','bakery','night_club','meal_takeaway','meal_delivery','liquor_store'],
  'Health & Medical':['doctor','hospital','dentist','physiotherapist','pharmacy','health'],
  'Beauty & Wellness':['beauty_salon','hair_care','spa','gym'],
  'Shopping':['store','clothing_store','grocery_or_supermarket','florist','home_goods_store'],
  'Services':['school','lodging','local_government_office','storage']
};

const GRADIENTS = [
  ['#f97316','#eab308'],['#8b5cf6','#6366f1'],['#ec4899','#f43f5e'],
  ['#14b8a6','#06b6d4'],['#3b82f6','#6366f1'],['#10b981','#34d399'],
  ['#f59e0b','#f97316'],['#8b5cf6','#ec4899']
];

function getCategory(types) {
  const skip = new Set(['point_of_interest','establishment','food','health']);
  for (const t of types) { if (!skip.has(t) && TYPE_MAP[t]) return TYPE_MAP[t]; }
  for (const t of types) { if (!skip.has(t)) return t.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase()); }
  return 'Place';
}

function getCatGroup(types) {
  for (const [group, ts] of Object.entries(CAT_GROUPS)) {
    if (types.some(t => ts.includes(t))) return group;
  }
  return 'Services';
}

function hash(s) { let h=0; for(let i=0;i<s.length;i++) h=((h<<5)-h)+s.charCodeAt(i)|0; return Math.abs(h); }

function gradient(place) {
  const g = GRADIENTS[hash(place.name) % GRADIENTS.length];
  return `linear-gradient(135deg,${g[0]},${g[1]})`;
}

function starsHTML(rating, size) {
  const full = Math.floor(rating), half = rating - full >= 0.25;
  let s = '';
  for (let i=0;i<5;i++) {
    if (i < full) s += '\u2605';
    else if (i === full && half) s += '\u2605';
    else s += '\u2606';
  }
  return `<span class="stars" style="font-size:${size||14}px">${s}</span>`;
}

function priceHTML(level) {
  if (!level) return '';
  return `<span class="price">${'$'.repeat(level)}</span>`;
}

function statusBadge(p) {
  if (p.business_status === 'CLOSED_TEMPORARILY' || p.business_status === 'CLOSED_PERMANENTLY')
    return '<span class="badge-closed">Closed</span>';
  if (p.open_now === true) return '<span class="badge-open">Open</span>';
  if (p.open_now === false) return '<span class="badge-closed">Closed</span>';
  return '';
}

// Enrich places
PLACES.forEach(p => {
  p._cat = getCategory(p.types || []);
  p._group = getCatGroup(p.types || []);
});

// State
let filters = { search:'', group:'All', sort:'reviews', minRating:0 };
let view = 'grid';

function getFiltered() {
  let list = PLACES.filter(p => {
    if (filters.search && !p.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.group !== 'All' && p._group !== filters.group) return false;
    if (filters.minRating && (p.rating||0) < filters.minRating) return false;
    return true;
  });
  if (filters.sort === 'reviews') list.sort((a,b) => (b.user_ratings_total||0)-(a.user_ratings_total||0));
  else if (filters.sort === 'rating') list.sort((a,b) => (b.rating||0)-(a.rating||0));
  else if (filters.sort === 'alpha') list.sort((a,b) => a.name.localeCompare(b.name));
  return list;
}

function renderStats() {
  const el = document.getElementById('stats');
  const totalReviews = PLACES.reduce((s,p) => s+(p.user_ratings_total||0), 0);
  const avgRating = (PLACES.reduce((s,p) => s+(p.rating||0), 0)/PLACES.length).toFixed(1);
  const groups = {};
  PLACES.forEach(p => { groups[p._group] = (groups[p._group]||0)+1; });
  el.innerHTML = `
    <div class="stat"><div class="val">${PLACES.length}</div><div class="label">Places</div></div>
    <div class="stat"><div class="val">${avgRating}</div><div class="label">Avg Rating</div></div>
    <div class="stat"><div class="val">${(totalReviews/1000).toFixed(0)}K</div><div class="label">Total Reviews</div></div>
  `;
  const pills = document.getElementById('cat-pills');
  pills.innerHTML = Object.entries(groups).sort((a,b)=>b[1]-a[1])
    .map(([g,c])=>`<span class="cat-pill">${g} (${c})</span>`).join('');
}

function renderGrid() {
  const list = getFiltered();
  const container = document.getElementById('grid');
  document.getElementById('count-label').textContent = `Showing ${list.length} places`;
  if (!list.length) { container.innerHTML = '<div class="no-results">No places found.</div>'; return; }
  container.innerHTML = list.map((p,i) => `
    <div class="card" onclick="openModal(${i})" data-idx="${i}">
      <div class="card-img" style="background:${gradient(p)}">${p.name[0]}</div>
      <div class="card-body">
        <div class="card-name">${esc(p.name)}${statusBadge(p)}</div>
        <span class="card-cat">${p._cat}</span>
        <div class="card-rating">${starsHTML(p.rating||0)} <b>${p.rating||'N/A'}</b> <span style="color:var(--muted)">(${(p.user_ratings_total||0).toLocaleString()})</span> ${priceHTML(p.price_level)}</div>
        <div class="card-addr">${esc(p.address||'')}</div>
      </div>
    </div>
  `).join('');
  // Store filtered list for modal
  window._filtered = list;
}

function esc(s) { const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }

function openModal(idx) {
  const p = window._filtered[idx];
  const m = document.getElementById('modal');
  const overlay = document.getElementById('modal-overlay');

  // Rating breakdown from embedded reviews
  const breakdown = [0,0,0,0,0];
  (p.reviews||[]).forEach(r => { if(r.rating>=1&&r.rating<=5) breakdown[r.rating-1]++; });
  const maxB = Math.max(...breakdown,1);

  let html = `<div class="modal-header" style="position:relative">
    <h2>${esc(p.name)}</h2>
    <button class="modal-close" onclick="closeModal()">&times;</button>
    <div style="margin-top:6px">${starsHTML(p.rating||0,18)} <b>${p.rating||'N/A'}</b> &middot; ${(p.user_ratings_total||0).toLocaleString()} reviews &middot; <span class="card-cat">${p._cat}</span> ${priceHTML(p.price_level)}</div>
  </div><div class="modal-body">`;

  if (p.editorial_summary) html += `<div class="editorial">${esc(p.editorial_summary)}</div>`;

  if (p.formatted_address) html += `<div class="info-row"><span class="icon">📍</span>${esc(p.formatted_address)}</div>`;
  if (p.phone) html += `<div class="info-row"><span class="icon">📞</span><a href="tel:${p.phone}">${esc(p.phone)}</a></div>`;
  if (p.website) html += `<div class="info-row"><span class="icon">🔗</span><a href="${esc(p.website)}" target="_blank">${esc(p.website)}</a></div>`;
  if (p.google_url) html += `<div class="info-row"><span class="icon">🗺</span><a href="${esc(p.google_url)}" target="_blank">View on Google Maps</a></div>`;

  if (p.opening_hours && p.opening_hours.length) {
    html += `<div class="hours-list"><b>Hours:</b><br>${p.opening_hours.map(h=>esc(h)).join('<br>')}</div>`;
  }

  if (breakdown.some(v=>v>0)) {
    html += '<div class="rating-breakdown"><b>Rating Breakdown</b>';
    for (let i=4;i>=0;i--) {
      const pct = (breakdown[i]/maxB*100).toFixed(0);
      html += `<div class="rating-bar"><span>${i+1}★</span><div class="bar-bg"><div class="bar-fill" style="width:${pct}%"></div></div><span>${breakdown[i]}</span></div>`;
    }
    html += '</div>';
  }

  if (p.reviews && p.reviews.length) {
    html += '<div class="review-list"><b>Reviews</b>';
    p.reviews.forEach(r => {
      html += `<div class="review-item"><div class="review-author">${esc(r.author)}</div>
        <div class="review-meta">${starsHTML(r.rating||0)} &middot; ${esc(r.time||'')}</div>
        <div class="review-text">${esc(r.text||'')}</div></div>`;
    });
    html += '</div>';
  }

  html += '</div>';
  m.innerHTML = html;
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

// Map
function renderMap() {
  const list = getFiltered();
  const container = document.getElementById('map-area');
  if (!list.length) { container.innerHTML = '<div class="no-results">No places to map.</div>'; return; }
  const lats = list.map(p=>p.lat), lngs = list.map(p=>p.lng);
  const minLat=Math.min(...lats), maxLat=Math.max(...lats), minLng=Math.min(...lngs), maxLng=Math.max(...lngs);
  const pad=0.001, W=800, H=500;
  const sx=v=>(v-minLng+pad)/(maxLng-minLng+2*pad)*W;
  const sy=v=>H-(v-minLat+pad)/(maxLat-minLat+2*pad)*H;
  const color=r=>r>=4.5?'#16a34a':r>=4?'#65a30d':r>=3?'#eab308':r>=2?'#f97316':'#dc2626';

  let svg = `<svg class="map-svg" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`;
  list.forEach((p,i) => {
    svg += `<circle class="map-dot" cx="${sx(p.lng)}" cy="${sy(p.lat)}" r="4" fill="${color(p.rating||0)}" data-idx="${i}" opacity="0.8"/>`;
  });
  svg += '</svg>';
  container.innerHTML = svg;

  // Tooltips
  const tooltip = document.getElementById('map-tooltip');
  container.querySelectorAll('.map-dot').forEach(dot => {
    dot.addEventListener('mouseenter', e => {
      const p = list[+dot.dataset.idx];
      tooltip.textContent = `${p.name} (${p.rating}★)`;
      tooltip.style.display = 'block';
    });
    dot.addEventListener('mousemove', e => {
      tooltip.style.left = e.pageX+10+'px';
      tooltip.style.top = e.pageY-30+'px';
    });
    dot.addEventListener('mouseleave', () => { tooltip.style.display='none'; });
    dot.addEventListener('click', () => { openModal(+dot.dataset.idx); });
  });
}

function setView(v) {
  view = v;
  document.querySelectorAll('.view-btn').forEach(b => b.classList.toggle('active', b.dataset.view===v));
  document.getElementById('grid').style.display = v==='grid' ? '' : 'none';
  document.getElementById('map-wrap').classList.toggle('visible', v==='map');
  if (v==='map') renderMap();
}

function update() {
  renderGrid();
  if (view==='map') renderMap();
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  renderStats();
  update();

  document.getElementById('search').addEventListener('input', e => { filters.search=e.target.value; update(); });
  document.querySelectorAll('.cat-chip').forEach(c => {
    c.addEventListener('click', () => {
      document.querySelectorAll('.cat-chip').forEach(x=>x.classList.remove('active'));
      c.classList.add('active');
      filters.group = c.dataset.group;
      update();
    });
  });
  document.getElementById('sort-select').addEventListener('change', e => { filters.sort=e.target.value; update(); });
  document.getElementById('rating-select').addEventListener('change', e => { filters.minRating=+e.target.value; update(); });

  document.getElementById('modal-overlay').addEventListener('click', e => { if(e.target===e.currentTarget) closeModal(); });
  document.addEventListener('keydown', e => { if(e.key==='Escape') closeModal(); });
});
