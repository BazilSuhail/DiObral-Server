// assistantController.js - Agentic shopping assistant using Groq native function calling.
// Multi-turn tool loop: LLM calls tools, server executes them, LLM sees results,
// then calls more tools or replies. Up to MAX_STEPS iterations.

const { runAssistantWithRetry, GroqError } = require('../utils/groqAdapter');
const { TOOLS } = require('../utils/assistantTools');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Store = require('../models/Store');

const GROUNDING_TTL = 5 * 60 * 1000;
const MAX_RESULTS = 8;
const MAX_STEPS = 3;

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

  return `You are the DiObral shopping assistant. You help customers search products, manage their cart, and navigate the store.

RULES:
- If you want to say something to the user without calling a tool, use the "answer" tool with no page parameter.
- If the user asks for something you cannot do (e.g., delete account, change password, update personal information, cancel orders, process refunds, remove products, delete reviews), use the "answer" tool and say exactly: "I can't do that. Would you like help with something else?"
- If the user refers to "it", "this", or "that" and you are unsure which product they mean, use "answer" and ask them to pick a product from the list.
- Only use product IDs and category slugs from the CATALOGUE below. Never invent IDs.
- "this"/"it"/"the first one" -> resolve from VISIBLE PRODUCTS below.
- You can only help with: searching products, browsing categories, adding items to cart, checking out, viewing orders, wishlist, stores, bundles, and general store questions. For anything else, politely refuse using the exact refusal message above.

STORE KNOWLEDGE:
Currency: plain numbers. Price range: ${g.priceRange.min} - ${g.priceRange.max}
CATEGORIES (name / slug): ${g.categories.map((c) => `${c.name} / ${c.slug}`).join(', ') || 'none'}
CATALOGUE (id | name | price | sale% | sizes | store):
${g.products.map((p) => `${p.id} | ${p.name} | ${p.price} | ${p.sale} | ${(p.sizes || []).join('/') || '-'} | ${p.store}`).join('\n') || 'none'}

VISIBLE PRODUCTS in the customer's assistant panel (id | name | price | sizes):
${visible || '(none)'}

CUSTOMER CONTEXT: page=${context.path || '/'} | cartCount=${context.cartCount || 0} | signedIn=${context.isAuthenticated ? 'yes' : 'no'}`;
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

/* ---------------------------------------------------------- search */

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

/* ---------------------------------------------------------- tool execution */

const ANSWER_ROUTES = {
  home: '/',
  profile: '/profile',
  cart: '/cart',
  checkout: '/checkout',
  deals: '/productlist/all?sort=price-low',
};

const MISS_REPLIES = {
  category: 'I could not find that category.',
  cart: 'Your cart is empty. Want me to show you some products first?',
  product: 'I could not find that product. Try searching by name?',
  tool: "I can't do that. Would you like help with something else?",
};

const PRODUCT_MISS_REPLY =
  'Which one did you mean? Pick a product below, then say "add it to cart".';

async function suggestProducts() {
  try {
    return await runSearch({ sort: 'popular' });
  } catch {
    return [];
  }
}

async function executeTool(name, args, context, grounding) {
  switch (name) {
    case 'search_products': {
      const filters = cleanFilters(args);
      if (filters.category && !isValidId(filters.category)) {
        const found = grounding.categories.find(
          (c) => c.slug === filters.category.toLowerCase() || c.name.toLowerCase() === filters.category.toLowerCase()
        );
        filters.category = found ? found.slug : null;
      }
      if (!filters.category) delete filters.category;

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

      if (!products.length && filters.search && filters.category) {
        delete shown.search;
        products = await runSearch(shown);
        if (products.length) note = 'query';
      }

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

      const reply = products.length
        ? `Found ${products.length} match${products.length === 1 ? '' : 'es'} for you.`
        : 'I could not find anything matching that. Try different words?';

      return {
        reply,
        actions: [{ type: 'render_products', filters: pageFilters, pageUrl: buildPageUrl(pageFilters) }],
        products,
      };
    }

    case 'open_product': {
      let product = await findProduct(args.productId);
      if (!product) product = await findProduct(productIdFromPath(context.path));
      if (!product) product = await findProduct(context.lastProductId);
      if (!product && args.name) product = await findProductByName(args.name);
      if (!product) {
        return { reply: 'I could not find that product. Try searching by name?', actions: [], products: [] };
      }
      return {
        reply: `Opening ${product.name}.`,
        actions: [{ type: 'navigate', route: `/products/${product._id}` }],
        products: [],
      };
    }

    case 'browse_category': {
      const slug = String(args.category || '').toLowerCase();
      const found = grounding.categories.find((c) => c.slug === slug || c.name.toLowerCase() === slug);
      if (!found) {
        return { reply: MISS_REPLIES.category, actions: [], products: [] };
      }
      return {
        reply: `Showing ${found.name}.`,
        actions: [{ type: 'navigate', route: `/productlist/${found.slug}` }],
        products: [],
      };
    }

    case 'add_to_cart': {
      if (!context.isAuthenticated) {
        return { reply: 'Please sign in first to do that.', actions: [{ type: 'require_auth' }], products: [] };
      }

      let product = await findProduct(args.productId);
      if (!product) product = await findProductByName(args.name);
      if (!product) product = await findProduct(productIdFromPath(context.path));
      if (!product) product = await findProduct(context.lastProductId);
      if (!product) {
        return { reply: MISS_REPLIES.product, actions: [], products: [] };
      }

      const sizes = Array.isArray(product.size) ? product.size.map(String) : [];
      if (!sizes.length) {
        return {
          reply: `This product needs a size. Opening ${product.name}.`,
          actions: [{ type: 'navigate', route: `/products/${product._id}` }],
          products: [],
        };
      }

      let size = typeof args.size === 'string' ? args.size : '';
      if (!size || !sizes.includes(size)) size = sizes[0];

      const stock = product.stock > 0 ? product.stock : 1;
      const quantity = Math.max(1, Math.min(stock, parseInt(args.quantity, 10) || 1));

      return {
        reply: `Added ${quantity}x ${product.name} (${size}) to cart.`,
        actions: [{ type: 'add_to_cart', productId: String(product._id), size, quantity }],
        products: [],
      };
    }

    case 'place_order': {
      if (!context.isAuthenticated) {
        return { reply: 'Please sign in first to do that.', actions: [{ type: 'require_auth' }], products: [] };
      }
      if (context.cartCount < 1) {
        return { reply: MISS_REPLIES.cart, actions: [], products: [] };
      }
      return {
        reply: 'Proceeding to checkout.',
        actions: [{ type: 'place_order', route: '/checkout' }],
        products: [],
      };
    }

    case 'track_orders': {
      return { reply: 'Showing your orders.', actions: [{ type: 'navigate', route: '/orders-tracking' }], products: [] };
    }

    case 'show_wishlist': {
      return { reply: 'Showing your wishlist.', actions: [{ type: 'navigate', route: '/wishlist' }], products: [] };
    }

    case 'show_stores': {
      return { reply: 'Showing all stores.', actions: [{ type: 'navigate', route: '/stores' }], products: [] };
    }

    case 'show_bundles': {
      return { reply: 'Showing bundles and deals.', actions: [{ type: 'navigate', route: '/bundles' }], products: [] };
    }

    case 'answer': {
      const page = typeof args.page === 'string' ? args.page : '';
      const route = ANSWER_ROUTES[page];
      if (route) {
        return {
          reply: `Taking you to ${page}.`,
          actions: [{ type: 'navigate', route }],
          products: [],
        };
      }
      // Plain text reply (question, refusal, greeting)
      return { reply: '', actions: [], products: [] };
    }

    default:
      return { reply: MISS_REPLIES.tool, actions: [], products: [] };
  }
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
    const systemPrompt = buildSystemPrompt(grounding, context);

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message },
    ];

    const toolExecutor = async (name, args) => {
      return executeTool(name, args, context, grounding);
    };

    const result = await runAssistantWithRetry({
      messages,
      tools: TOOLS,
      toolExecutor,
      timeoutMs: 9000,
      maxSteps: MAX_STEPS,
    });

    let reply = result.reply || '';
    if (reply === '') reply = 'Done.';
    if (result.actions[0] && result.actions[0].type === 'require_auth') {
      reply = 'Please sign in first to do that.';
    }

    return res.status(200).json({
      reply,
      actions: result.actions,
      products: result.products,
      meta: { toolCalls: result.meta.toolCalls, steps: result.meta.steps },
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
