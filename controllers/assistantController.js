// assistantController.js - Stateless NLP -> API router.
// Groq never touches data: it only picks API "steps" from the knowledge block
// below. The server validates each step and executes it against Mongo / our
// existing route logic, then returns actions + results. Nothing is persisted.

const { groqStructured, GroqError } = require('../utils/groqAdapter');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Store = require('../models/Store');

const GROUNDING_TTL = 5 * 60 * 1000; // 5 min catalogue cache (not user data)
const MAX_RESULTS = 8;
const MAX_STEPS = 3;

const TOOLS = [
  'search_products', 'open_product', 'browse_category', 'add_to_cart',
  'open_cart', 'go_checkout', 'place_order', 'track_orders',
  'show_wishlist', 'show_stores', 'show_bundles', 'show_deals',
  'show_home', 'show_profile', 'answer',
];

const URL_SORT = {
  price_asc: 'price-low',
  price_desc: 'price-high',
  rating: 'rating',
  newest: 'newest',
  popular: 'popular',
};

const MONGO_SORT = {
  price_asc: { price: 1 },
  price_desc: { price: -1 },
  rating: { rating: -1 },
  newest: { createdAt: -1 },
  popular: { favCount: -1 },
};

let groundingCache = { at: 0, data: null };

/* ---------------------------------------------------------- knowledge (grounding) */

async function buildGrounding() {
  if (groundingCache.data && Date.now() - groundingCache.at < GROUNDING_TTL) {
    return groundingCache.data;
  }

  const [categories, stores, products, range] = await Promise.all([
    Category.find().select('name slug').lean(),
    Store.find().select('storeName slug').sort({ followerCount: -1 }).limit(20).lean(),
    Product.find({ isActive: true })
      .sort({ favCount: -1 })
        .limit(18)
      .select('name price sale size store')
      .populate('store', 'slug')
      .lean(),
    Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, min: { $min: '$price' }, max: { $max: '$price' } } },
    ]),
  ]);

  const data = {
    categories: categories.map((c) => ({ name: c.name, slug: c.slug })),
    stores: stores.map((s) => ({ name: s.storeName, slug: s.slug })),
    products: products.map((p) => ({
      id: String(p._id),
      name: p.name,
      price: p.price,
      sale: p.sale || 0,
      sizes: p.size || [],
      store: p.store?.slug || '',
    })),
    priceRange: range[0] ? { min: range[0].min, max: range[0].max } : { min: 0, max: 10000 },
  };

  groundingCache = { at: Date.now(), data };
  return data;
}

function buildSystemPrompt(g, context) {
  const visible = (context.visibleProducts || [])
    .map((p) => `${p._id} | ${p.name} | ${p.price} | sizes: ${(p.size || []).join('/') || '-'}`)
    .join('\n');

  return `You are the DiObral store API router. The customer writes natural language; you decide which API steps to call and in what order. You never search yourself, you only emit tool calls.

Respond ONLY with valid json (the word json - no markdown, no code fences):
{
  "reply": "<max 2 plain sentences shown to the customer, no json inside>",
  "steps": [ {"tool":"<tool name>","params":{...}}, {"tool":"...","params":{...}} ]
}

API STEPS you may call (params exactly as listed):
1. search_products  {"query":"free text words","category":"slug optional","minPrice":number optional,"maxPrice":number optional,"sort":"price_asc|price_desc|rating|newest|popular" optional}
   -> server runs the real product search and returns matching products.
2. open_product     {"productId":"<id from catalogue>"}   (only for a named/pointed-at product)
3. browse_category  {"category":"<slug from categories>"} -> opens that category page
4. add_to_cart      {"productId":"<id>","size":"<size>","quantity":number}
5. open_cart        {}
6. go_checkout      {}
7. place_order      {}   (finalizes the order - the checkout page submits it)
8. track_orders     {}
9. show_wishlist    {}
10. show_stores     {}
11. show_bundles    {}
12. show_deals      {}
13. show_home       {}
14. show_profile    {}
15. answer          {}   (greetings, FAQ, anything with no store action)

RULES:
- Always return json with a "steps" array. Use "answer" with empty steps for chat.
- Price phrases: "under 300" -> {"maxPrice":300}; "above X" -> {"minPrice":X}; "1500 to 2000" -> {"minPrice":1500,"maxPrice":2000}. Numbers are plain store-currency numbers.
- For ANY shopping request (find/browse/show me) always call search_products or browse_category - never reply with an empty steps array just because you doubt results exist. The server has the real data.
- "add X to cart" -> add_to_cart. If the customer did not say a size, pass the first size listed for that product. Never ask for the size.
- Vague references ("add this", "add it") with NO matching id in VISIBLE PRODUCTS -> call search_products (use any product words from the message, or empty params to show top products) and reply asking the customer to pick one. NEVER return empty steps for a shopping request - the server always has products to show.
- "add it then finalize/checkout" -> steps in order: add_to_cart, place_order.
- place_order / go_checkout / track_orders / show_profile: only if signedIn is yes AND (for place_order) cartCount > 0. Otherwise call "answer" and say plainly: cart is empty -> suggest showing products; not signed in -> say please sign in.
- Only use productIds and category slugs from the CATALOGUE below. Never invent ids.
- "this"/"it"/"the first one" -> resolve from VISIBLE PRODUCTS below.

STORE KNOWLEDGE:
Currency: store currency, plain numbers. Price range: ${g.priceRange.min} - ${g.priceRange.max}
CATEGORIES (name / slug): ${g.categories.map((c) => `${c.name} / ${c.slug}`).join(', ') || 'none'}
STORES (name / slug): ${g.stores.map((s) => `${s.name} / ${s.slug}`).join(', ') || 'none'}
CATALOGUE (id | name | price | sale% | sizes | store):
${g.products.map((p) => `${p.id} | ${p.name} | ${p.price} | ${p.sale} | ${(p.sizes || []).join('/') || '-'} | ${p.store}`).join('\n') || 'none'}

VISIBLE PRODUCTS in the customer's assistant panel (id | name | price | sizes):
${visible || '(none)'}

CUSTOMER CONTEXT: page=${context.path || '/'} | cartCount=${context.cartCount || 0} | signedIn=${context.isAuthenticated ? 'yes' : 'no'}`;
}

async function parseSteps(message, context, grounding) {
  return groqStructured({
    prompt: message,
    systemPrompt: buildSystemPrompt(grounding, context),
    timeoutMs: 9000,
  });
}

/* ---------------------------------------------------------- helpers */

function sanitizeContext(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const visibleProducts = Array.isArray(src.visibleProducts)
    ? src.visibleProducts
        .slice(0, 10)
        .filter((p) => p && p._id && typeof p.name === 'string')
        .map((p) => ({
          _id: String(p._id),
          name: String(p.name).slice(0, 120),
          price: Number(p.price) || 0,
          size: Array.isArray(p.size) ? p.size.slice(0, 10).map(String) : [],
        }))
    : [];

  return {
    path: typeof src.path === 'string' ? src.path.slice(0, 200) : '/',
    cartCount: Math.max(0, parseInt(src.cartCount, 10) || 0),
    isAuthenticated: !!src.isAuthenticated,
    lastProductId: typeof src.lastProductId === 'string' ? src.lastProductId : null,
    visibleProducts,
  };
}

const isValidId = (id) => typeof id === 'string' && /^[a-fA-F0-9]{24}$/.test(id);

const productIdFromPath = (path) => {
  const m = /^\/products\/([a-fA-F0-9]{24})/.exec(path || '');
  return m ? m[1] : null;
};

const normalizeSort = (sort) => {
  if (!sort) return '';
  const s = String(sort);
  if (URL_SORT[s]) return s;
  const found = Object.entries(URL_SORT).find(([, urlVal]) => urlVal === s);
  return found ? found[0] : '';
};

function buildPageUrl(filters = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.minPrice) params.set('minPrice', String(filters.minPrice));
  if (filters.maxPrice) params.set('maxPrice', String(filters.maxPrice));
  if (filters.category) params.set('category', String(filters.category));
  const sort = normalizeSort(filters.sort);
  if (sort) params.set('sort', URL_SORT[sort]);
  const qs = params.toString();
  return `/productlist/all${qs ? `?${qs}` : ''}`;
}

function cleanFilters(raw) {
  const f = raw && typeof raw === 'object' ? raw : {};
  const filters = {};
  if (typeof f.query === 'string' && f.query.trim()) filters.search = f.query.trim().slice(0, 120);
  if (typeof f.search === 'string' && f.search.trim()) filters.search = f.search.trim().slice(0, 120);
  const min = Number(f.minPrice);
  const max = Number(f.maxPrice);
  if (Number.isFinite(min) && min > 0) filters.minPrice = min;
  if (Number.isFinite(max) && max > 0) filters.maxPrice = max;
  const sort = normalizeSort(f.sort);
  if (sort) filters.sort = sort;
  if (typeof f.category === 'string' && f.category) filters.category = f.category.slice(0, 120);
  return filters;
}

/* ---------------------------------------------------------- data execution */

// Customers say "pants", the catalogue says "Bottoms"/"Trousers".
// Expand common apparel words so word mismatch never returns zero.
const SYNONYMS = {
  pants: ['pant', 'trouser', 'bottom'],
  pant: ['pants', 'trouser', 'bottom'],
  trousers: ['trouser', 'pant', 'bottom'],
  trouser: ['trousers', 'pant', 'bottom'],
  jeans: ['jean', 'trouser', 'bottom'],
  shorts: ['short', 'bottom'],
  shirt: ['t-shirt', 'tee'],
  shirts: ['t-shirt', 'tee', 'shirt'],
  tees: ['tee', 't-shirt'],
  teeshirts: ['t-shirt', 'tee'],
  sneakers: ['sneaker', 'shoe'],
  shoes: ['shoe', 'sneaker'],
  hoodies: ['hoodie'],
  tanks: ['tank'],
};

function expandQuery(query) {
  const terms = [query];
  const words = String(query).toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  for (const w of words) {
    for (const s of SYNONYMS[w] || []) {
      if (!terms.includes(s)) terms.push(s);
    }
  }
  return terms;
}

async function runSearch(filters = {}) {
  const filter = { isActive: true };

  const search = String(filters.search || '').trim();
  if (search) {
    const or = [];
    for (const term of expandQuery(search)) {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      or.push(
        { name: { $regex: escaped, $options: 'i' } },
        { description: { $regex: escaped, $options: 'i' } },
        { tags: { $regex: escaped, $options: 'i' } }
      );
    }
    filter.$or = or;
  }

  if (filters.minPrice || filters.maxPrice) {
    filter.price = {};
    if (filters.minPrice) filter.price.$gte = Number(filters.minPrice);
    if (filters.maxPrice) filter.price.$lte = Number(filters.maxPrice);
  }

  if (filters.category) {
    let categoryId = filters.category;
    if (!isValidId(categoryId)) {
      const cat = await Category.findOne({ slug: String(categoryId).toLowerCase() }).select('_id').lean();
      categoryId = cat ? cat._id : null;
    }
    if (categoryId) filter.category = categoryId;
  }

  const sortOption = MONGO_SORT[normalizeSort(filters.sort)] || { createdAt: -1 };

  const projection = {
    name: 1, price: 1, sale: 1, image: 1, rating: 1,
    reviewCount: 1, stock: 1, size: 1, store: 1, category: 1, createdAt: 1,
  };

  return Product.find(filter, projection)
    .sort(sortOption)
    .limit(MAX_RESULTS)
    .populate('store', 'storeName slug')
    .populate('category', 'name slug')
    .lean();
}

async function findProduct(id) {
  if (!isValidId(id)) return null;
  try {
    return await Product.findOne({ _id: id, isActive: true })
      .select('name price size stock isActive')
      .lean();
  } catch {
    return null;
  }
}

async function findProductByName(name) {
  const term = String(name || '').trim();
  if (!term) return null;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const list = await Product.find({ isActive: true, name: { $regex: escaped, $options: 'i' } })
    .select('name price size stock')
    .limit(1)
    .lean();
  return list[0] || null;
}

/* ---------------------------------------------------------- step execution */

async function runStep(step, context, grounding) {
  const tool = step && typeof step.tool === 'string' ? step.tool : '';
  const params = step && step.params && typeof step.params === 'object' ? step.params : {};

  switch (tool) {
    case 'search_products': {
      const filters = cleanFilters(params);
      // pageUrl needs a category ObjectId - resolve slugs before building it
      if (filters.category && !isValidId(filters.category)) {
        const found = grounding.categories.find(
          (c) => c.slug === filters.category.toLowerCase() || c.name.toLowerCase() === filters.category.toLowerCase()
        );
        filters.category = found ? found.slug : null;
      }
      if (!filters.category) delete filters.category;

      // Progressive fallback: exact -> drop price -> drop words -> cheapest.
      // A shopping request must never come back empty while stock exists.
      let products = await runSearch(filters);
      let note = null;
      let shown = { ...filters };

      if (!products.length && (filters.minPrice || filters.maxPrice)) {
        const { minPrice, maxPrice, ...rest } = filters;
        products = await runSearch({ ...rest, sort: 'price_asc' });
        if (products.length) { note = 'price'; shown = { ...rest, sort: 'price_asc' }; }
      }

      if (!products.length && filters.search) {
        const { search, ...rest } = filters;
        products = await runSearch({ ...rest, sort: 'price_asc' });
        if (products.length) { note = 'query'; shown = { ...rest, sort: 'price_asc' }; }
      }

      if (!products.length) {
        products = await runSearch({ sort: 'price_asc' });
        if (products.length) { note = 'any'; shown = { sort: 'price_asc' }; }
      }

      // "shirts" search inside the Shirts category matches no product names
      if (!products.length && filters.search && filters.category) {
        delete shown.search;
        products = await runSearch(shown);
        if (products.length) note = 'query';
      }

      // Client-side page search has no synonym table: if we relaxed only the
      // price filter, "View all" would open a search page that shows nothing.
      // Point it at the category the matches actually belong to instead.
      if (note === 'price' && shown.search && products.length) {
        const cat = products[0].category;
        shown = cat && cat.slug ? { category: cat.slug, sort: 'price_asc' } : { sort: 'price_asc' };
      }

      const pageFilters = { ...shown };
      if (pageFilters.category && !isValidId(pageFilters.category)) {
        const cat = await Category.findOne({ slug: pageFilters.category }).select('_id').lean();
        if (cat) pageFilters.category = String(cat._id);
        else delete pageFilters.category;
      }

      return {
        actions: [{ type: 'render_products', filters: pageFilters, pageUrl: buildPageUrl(pageFilters) }],
        products,
        empty: products.length === 0,
        note,
        query: filters.search || '',
        requested: { minPrice: filters.minPrice, maxPrice: filters.maxPrice },
      };
    }

    case 'open_product': {
      let product = await findProduct(params.productId);
      if (!product) product = await findProduct(productIdFromPath(context.path));
      if (!product) product = await findProduct(context.lastProductId);
      if (!product && params.name) product = await findProductByName(params.name);
      if (!product) {
        return { actions: [], empty: true, miss: 'product' };
      }
      return { actions: [{ type: 'navigate', route: `/products/${product._id}` }] };
    }

    case 'browse_category': {
      const slug = String(params.category || '').toLowerCase();
      const found = grounding.categories.find((c) => c.slug === slug || c.name.toLowerCase() === slug);
      if (!found) return { actions: [], empty: true, miss: 'category' };
      return { actions: [{ type: 'navigate', route: `/productlist/${found.slug}` }] };
    }

    case 'add_to_cart': {
      if (!context.isAuthenticated) return { actions: [{ type: 'require_auth' }] };

      let product = await findProduct(params.productId);
      if (!product) product = await findProductByName(params.name);
      if (!product) product = await findProduct(productIdFromPath(context.path));
      if (!product) product = await findProduct(context.lastProductId);
      if (!product) return { actions: [], empty: true, miss: 'product' };

      const sizes = Array.isArray(product.size) ? product.size.map(String) : [];
      if (!sizes.length) {
        // cart API requires a size - open the product page instead
        return { actions: [{ type: 'navigate', route: `/products/${product._id}` }] };
      }
      let size = typeof params.size === 'string' ? params.size : '';
      if (!size || !sizes.includes(size)) size = sizes[0];

      const stock = product.stock > 0 ? product.stock : 1;
      const quantity = Math.max(1, Math.min(stock, parseInt(params.quantity, 10) || 1));

      return { actions: [{ type: 'add_to_cart', productId: String(product._id), size, quantity }] };
    }

    case 'open_cart':
      return { actions: [{ type: 'navigate', route: '/cart' }] };

    case 'go_checkout':
      if (!context.isAuthenticated) return { actions: [{ type: 'require_auth' }] };
      return { actions: [{ type: 'navigate', route: '/checkout' }] };

    case 'place_order':
      if (!context.isAuthenticated) return { actions: [{ type: 'require_auth' }] };
      if (context.cartCount < 1) return { actions: [], empty: true, miss: 'cart' };
      return { actions: [{ type: 'place_order', route: '/checkout' }] };

    case 'track_orders':
      return { actions: [{ type: 'navigate', route: '/orders-tracking' }] };

    case 'show_wishlist':
      return { actions: [{ type: 'navigate', route: '/wishlist' }] };

    case 'show_stores':
      return { actions: [{ type: 'navigate', route: '/stores' }] };

    case 'show_bundles':
      return { actions: [{ type: 'navigate', route: '/bundles' }] };

    case 'show_deals':
      return { actions: [{ type: 'navigate', route: '/productlist/all?sort=price-low' }] };

    case 'show_home':
      return { actions: [{ type: 'navigate', route: '/' }] };

    case 'show_profile':
      return { actions: [{ type: 'navigate', route: '/profile' }] };

    case 'answer':
      return { actions: [] };

    default:
      return { actions: [], empty: true, miss: 'tool' };
  }
}

const MISS_REPLIES = {
  category: 'I could not find that category.',
  cart: 'Your cart is empty. Want me to show you some products first?',
  tool: 'I could not do that yet - try rephrasing?',
};

// When a vague reference ("this", "it") cannot be resolved to a real product,
// never dead-end: fall back to showing products so the customer can pick one.
const PRODUCT_MISS_REPLY =
  'Which one did you mean? Pick a product below, then say "add it to cart".';

async function suggestProducts() {
  try {
    return await runSearch({ sort: 'popular' });
  } catch {
    return [];
  }
}

async function executeSteps(parsed, context, grounding) {
  const steps = (Array.isArray(parsed.steps) ? parsed.steps : [])
    .filter((s) => s && typeof s === 'object' && TOOLS.includes(s.tool))
    .slice(0, MAX_STEPS);

  const actions = [];
  let products = [];
  let replyOverride = null;
  let searched = false;

  if (!steps.length) {
    // Shopping request that arrived with no usable steps - show products anyway
    const suggestions = await suggestProducts();
    if (suggestions.length) {
      return {
        actions: [{ type: 'render_products', filters: {}, pageUrl: '/productlist/all' }],
        products: suggestions,
        replyOverride: PRODUCT_MISS_REPLY,
        tool: 'search_products',
        searched: true,
      };
    }
    return { actions: [{ type: 'none' }], products, replyOverride: null, tool: 'answer' };
  }

  for (const step of steps) {
    const result = await runStep(step, context, grounding);

    if (result.miss === 'product') {
      const suggestions = await suggestProducts();
      if (suggestions.length) {
        products = suggestions;
        actions.push({ type: 'render_products', filters: {}, pageUrl: '/productlist/all' });
        replyOverride = PRODUCT_MISS_REPLY;
      } else {
        actions.push({ type: 'none' });
        replyOverride = 'I could not find that product. Try searching by name?';
      }
      break;
    }

    if (result.miss) {
      replyOverride = MISS_REPLIES[result.miss] || MISS_REPLIES.tool;
      actions.push({ type: 'none' });
      break;
    }

    if (step.tool === 'search_products') {
      searched = true;
      products = result.products;
      if (result.empty) {
        replyOverride = 'I could not find anything matching that. Try different words?';
      } else if (result.note === 'price') {
        const cheapest = Math.min(...products.map((p) => p.price));
        const asked = result.requested.maxPrice
          ? `under ${result.requested.maxPrice}`
          : `above ${result.requested.minPrice}`;
        replyOverride = `Nothing in our stock is ${asked} (cheapest starts at ${cheapest}). Showing the closest matches instead.`;
      } else if (result.note === 'query') {
        replyOverride = `No exact match for "${result.query}" - showing what we do have instead.`;
      } else if (result.note === 'any') {
        replyOverride = `No match for that - here is what we do have:`;
      } else if (!replyOverride) {
        replyOverride = `Found ${products.length} match${products.length === 1 ? '' : 'es'} for you.`;
      }
    }

    actions.push(...result.actions);
    if (actions.length >= MAX_STEPS) break;
  }

  if (!actions.length) actions.push({ type: 'none' });

  return { actions: actions.slice(0, MAX_STEPS), products, replyOverride, tool: steps[0].tool, searched };
}

/* ---------------------------------------------------------- entry point */

exports.handleMessage = async (req, res) => {
  try {
    const body = req.body || {};
    const message = typeof body.message === 'string' ? body.message.trim().slice(0, 1000) : '';
    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }

    const context = sanitizeContext(body.context);
    if (req.user && req.user.id) context.isAuthenticated = true;
    const grounding = await buildGrounding();
    const parsed = await parseSteps(message, context, grounding);

    const executed = await executeSteps(parsed, context, grounding);

    // guards win over the model's reply
    let reply = executed.replyOverride || parsed.reply || '';
    if (executed.actions[0].type === 'require_auth') reply = 'Please sign in first to do that.';
    if (!reply) reply = 'Done.';

    return res.status(200).json({
      reply,
      actions: executed.actions,
      products: executed.products,
      meta: { intent: executed.tool },
    });
  } catch (err) {
    if (err instanceof GroqError) {
      return res.status(err.status).json({
        reply: err.message,
        actions: [{ type: 'none' }],
        products: [],
        meta: { intent: 'fallback' },
      });
    }
    console.error('[assistant]', err);
    return res.status(500).json({ error: err.message });
  }
};
