const BASE = 'http://localhost:3000/assistant';

const PID = '6a69374b077576cd0856ee3a';

const CASES = [
  { label: 'pants under 300', body: { message: 'Show me pants under 300', context: { path: '/', cartCount: 0, isAuthenticated: false } } },
  { label: 'shirts 1500-2000', body: { message: 'bring me all shirt under 1500 to 2000 range', context: { path: '/', cartCount: 0, isAuthenticated: false } } },
  { label: 'trousers in stock', body: { message: 'show me trousers', context: { path: '/', cartCount: 0, isAuthenticated: false } } },
  { label: 'hi', body: { message: 'hi', context: { path: '/', cartCount: 0, isAuthenticated: false } } },
  { label: 'add bare (no ctx)', body: { message: 'add this to cart', context: { path: '/', cartCount: 1, isAuthenticated: true } } },
  {
    label: 'add with product ctx',
    body: {
      message: 'add this to cart',
      context: {
        path: '/',
        cartCount: 1,
        isAuthenticated: true,
        lastProductId: PID,
        visibleProducts: [{ _id: PID, name: 'Black 380 HEAVY GSM Pro Series Hoodie', price: 2250, size: ['S', 'M', 'L'] }],
      },
    },
  },
  { label: 'finalize', body: { message: 'finalize it', context: { path: '/cart', cartCount: 2, isAuthenticated: true } } },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

for (const c of CASES) {
  try {
    const res = await fetch(BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(c.body),
    });
    const j = await res.json().catch(() => ({}));
    console.log(`\n[${c.label}] http=${res.status} intent=${j.meta?.intent ?? '-'}`);
    console.log(`  reply: ${j.reply ?? j.error ?? JSON.stringify(j)}`);
    const acts = (j.actions || []).map((a) => {
      const bits = [a.type];
      if (a.route) bits.push('->' + a.route);
      if (a.pageUrl) bits.push('->' + a.pageUrl);
      if (a.productId) bits.push('pid=' + String(a.productId).slice(0, 8) + (a.size ? ' size=' + a.size : ''));
      if (a.size) bits.push('size=' + a.size);
      return bits.join(' ');
    });
    console.log(`  actions: ${acts.join(' , ')}`);
    console.log(`  products: ${(j.products || []).length}${(j.products || []).length ? ' first=' + j.products[0].name + ' @' + j.products[0].price : ''}`);
  } catch (e) {
    console.log(`\n[${c.label}] ERROR ${e.message}`);
  }
  await sleep(9000);
}
