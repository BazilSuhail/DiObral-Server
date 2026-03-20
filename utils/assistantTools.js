// assistantTools.js - Groq native function definitions for the shopping assistant.
// 10 tools total. Pure-navigation tools merged into `answer` with a `page` enum.
const TOOLS = [
  {
    type: "function",
    function: {
      name: "search_products",
      description:
        "Search for products by query, category, or price range. Returns matching products.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Free text search words" },
          category: { type: "string", description: "Category slug or name" },
          maxPrice: { type: "number", description: "Maximum price" },
          minPrice: { type: "number", description: "Minimum price" },
          sort: {
            type: "string",
            enum: ["price_asc", "price_desc", "rating", "newest", "popular"],
            description: "Sort order",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "open_product",
      description: "Open a specific product page by product ID.",
      parameters: {
        type: "object",
        properties: {
          productId: { type: "string", description: "MongoDB product ID" },
        },
        required: ["productId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "browse_category",
      description: "Browse a product category page.",
      parameters: {
        type: "object",
        properties: {
          category: { type: "string", description: "Category slug or name" },
        },
        required: ["category"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_to_cart",
      description: "Add a product to the user's cart.",
      parameters: {
        type: "object",
        properties: {
          productId: { type: "string", description: "MongoDB product ID" },
          size: { type: "string", description: "Product size" },
          quantity: { type: "number", description: "Quantity to add", default: 1 },
        },
        required: ["productId", "size"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "place_order",
      description:
        "Place the current order and proceed to checkout. Requires items in cart and user to be signed in.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "track_orders",
      description: "Show the user's order tracking page.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "show_wishlist",
      description: "Show the user's wishlist page.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "show_stores",
      description: "Show all stores page.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "show_bundles",
      description: "Show all bundles/deals page.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "answer",
      description:
        "Use for greetings, FAQ, or anything that does not require a store action. Also use for page navigation: home, profile, cart, checkout, deals.",
      parameters: {
        type: "object",
        properties: {
          page: {
            type: "string",
            enum: ["home", "profile", "cart", "checkout", "deals"],
            description: "Optional page to navigate to",
          },
        },
      },
    },
  },
];

module.exports = { TOOLS };
