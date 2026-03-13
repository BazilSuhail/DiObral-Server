# DiObral-Server — Full E-Commerce Schema & API Reference

## Tech Stack

- **Runtime:** Node.js (Express 5)
- **Database:** MongoDB (Mongoose 9)
- **Auth:** JWT + bcryptjs
- **File Upload:** Multer (disk storage → `uploads/`)
- **Validation:** express-validator
- **Environment:** dotenv (`MONGODB_URI`, `JWT_SECRET`, `PORT`)

---

## 1. Models (MongoDB Collections)

---

### 1.1 `Product`

| Field          | Type             | Required | Notes                                         |
|----------------|------------------|----------|-----------------------------------------------|
| `name`         | String           | ✅       | Trimmed                                       |
| `description`  | String           | ✅       | Trimmed                                       |
| `category`     | String           | ✅       | Foreign-key style (string, not ObjectId)      |
| `subcategory`  | String           | ✅       | Foreign-key style (string, not ObjectId)      |
| `rating`       | Number           | ✅       | Default `0`                                   |
| `size`         | [String]         | ❌       | e.g. `["S","M","L"]`                          |
| `stock`        | Number           | ✅       |                                                |
| `reviews`      | Number           | ✅       | Default `0` (count of reviews)                |
| `price`        | Number           | ✅       |                                                |
| `sale`         | Number           | ❌       | Default `0` (percentage off)                  |
| `image`        | String           | ✅       | Filename in `uploads/`                        |
| `otherImages`  | [String]         | ❌       | Up to 5 additional images                     |
| `timestamps`   | ✅ (auto)        | —        | `createdAt`, `updatedAt`                      |

**Controller:** `controllers/productController.js`  
**Route base:** `/products`

---

### 1.2 `Category`

| Field         | Type   | Required | Notes      |
|---------------|--------|----------|------------|
| `name`        | String | ✅       |            |
| `description` | String | ✅       |            |

**Controller:** `controllers/categoryController.js`  
**Route base:** `/category`

---

### 1.3 `Subcategory`

| Field         | Type   | Required | Notes                        |
|---------------|--------|----------|------------------------------|
| `name`        | String | ✅       |                              |
| `description` | String | ✅       |                              |
| `category`    | String | ✅       | Parent category name (string) |

**Controller:** `controllers/subcategoryController.js`  
**Route base:** `/subcategories`

---

### 1.4 `Profile` (User)

| Field       | Type              | Required | Notes                                    |
|-------------|-------------------|----------|------------------------------------------|
| `email`     | String            | ✅       | Unique, indexed                          |
| `password`  | String            | ✅       | bcrypt hashed (10 rounds)                |
| `fullName`  | String            | ❌       | Default `''`                             |
| `bio`       | String            | ❌       | Default `''`                             |
| `cartState` | Object            | ❌       | Default `{}` (legacy, unused by cart API)|
| `orders`    | [Object]          | ❌       | Default `[]` (legacy, unused)            |
| `address`   | Embedded Object   | ❌       | `{city, state, street, country}`         |
| `contact`   | String            | ❌       | Default `''` (phone number)              |

**Controller:** `controllers/authProfileController.js`  
**Route base:** `/auth`

---

### 1.5 `CartState`

| Field    | Type               | Required | Notes                          |
|----------|--------------------|----------|--------------------------------|
| `userId` | String             | ✅       | References Profile._id (string)|
| `items`  | [CartItem]         | ❌       | Array of embedded objects      |

**CartItem sub-schema:**

| Field      | Type   | Required | Notes                        |
|------------|--------|----------|------------------------------|
| `id`       | String | ✅       | Product ID                   |
| `quantity` | Number | ✅       |                              |
| `size`     | String | ✅       | Selected size                |
| `price`    | Number | ✅       | Price at time of add-to-cart |

**Controller:** `controllers/cartController.js`  
**Route base:** `/cartState`

---

### 1.6 `Order`

| Field    | Type              | Required | Notes                           |
|----------|-------------------|----------|---------------------------------|
| `userId` | String            | ✅       | References Profile._id          |
| `orders` | [IndividualOrder] | ❌       | Array of order sub-documents    |

**IndividualOrder sub-schema:**

| Field       | Type          | Required | Notes                            |
|-------------|---------------|----------|----------------------------------|
| `items`     | [OrderItem]   | ✅       |                                  |
| `orderDate` | Date          | ❌       | Default `Date.now`               |
| `total`     | Number        | ✅       |                                  |

**OrderItem sub-schema:**

| Field            | Type   | Required | Notes                    |
|------------------|--------|----------|--------------------------|
| `name`           | String | ✅       | Product name at order    |
| `image`          | String | ✅       | Product image filename   |
| `price`          | Number | ✅       | Original price           |
| `discountedPrice`| Number | ✅       | Price after sale         |
| `quantity`       | Number | ✅       |                          |
| `size`           | String | ✅       | Selected size            |

**Controller:** `controllers/orderController.js`  
**Route base:** `/place-order`

---

### 1.7 `CompletedOrder`

| Field             | Type              | Required | Notes                            |
|-------------------|-------------------|----------|----------------------------------|
| `userId`          | String            | ✅       | References Profile._id           |
| `completedOrders` | [IndividualOrder] | ❌       | Same sub-schema as `Order.orders` |

**Controller:** `controllers/adminStockController.js` (also used here)  
**Route base:** `/completeorder`

---

### 1.8 `ProductReview`

| Field       | Type         | Required | Notes                             |
|-------------|--------------|----------|-----------------------------------|
| `productId` | String       | ✅       | Unique. References Product._id    |
| `reviews`   | [Review]     | ❌       | Array of embedded review objects  |

**Review sub-schema:**

| Field         | Type   | Required | Notes                    |
|---------------|--------|----------|--------------------------|
| `name`        | String | ❌       | Reviewer name            |
| `email`       | String | ❌       |                          |
| `phone`       | String | ❌       |                          |
| `date`        | Date   | ❌       | Default `Date.now`       |
| `rating`      | Number | ❌       | Min 1, Max 5             |
| `description` | String | ❌       | Review text              |

**Route base:** `/product-reviews`

---

## 2. Complete API Route Table

| # | Method | Full Path | Auth | Controller | Description |
|---|--------|-----------|------|-----------|-------------|
| **Products** (`/products`) |
| 1 | POST | `/products/add` | — | `productController.addProduct` | Create product (multipart: mainImage + image1-5) |
| 2 | GET | `/products/` | — | `productController.getAllProducts` | List all products |
| 3 | GET | `/products/category?category=X` | — | `productController.getProductsByCategory` | Filter by category string |
| 4 | GET | `/products/:id` | — | `productController.getProductById` | Single product by MongoDB _id |
| 5 | PUT | `/products/:id` | — | `productController.updateProduct` | Update product + replace images (multipart) |
| 6 | DELETE | `/products/:id` | — | `productController.deleteProduct` | Delete product + remove uploaded images |
| **Categories** (`/category`) |
| 7 | POST | `/category/add-category` | — | `categoryController.addCategory` | Create category |
| 8 | GET | `/category/` | — | `categoryController.getCategories` | List all categories |
| 9 | GET | `/category/:id` | — | `categoryController.getCategoryById` | Single category |
| 10 | PUT | `/category/:id` | — | `categoryController.updateCategory` | Update category |
| 11 | DELETE | `/category/:id` | — | `categoryController.deleteCategory` | Delete category |
| **Subcategories** (`/subcategories`) |
| 12 | GET | `/subcategories/` | — | `subcategoryController.getAllSubcategories` | List all subcategories |
| 13 | POST | `/subcategories/` | — | `subcategoryController.createSubcategory` | Create subcategory |
| 14 | PUT | `/subcategories/:id` | — | `subcategoryController.updateSubcategory` | Update subcategory |
| 15 | DELETE | `/subcategories/:id` | — | `subcategoryController.deleteSubcategory` | Delete subcategory |
| **Public Fetch** (`/fetchproducts`) |
| 16 | GET | `/fetchproducts/products` | — | `productFetchController.getAllProducts` | List all products (public) |
| 17 | GET | `/fetchproducts/products/:id` | — | `productFetchController.getProductById` | Single product (public) |
| **Auth** (`/auth`) |
| 18 | POST | `/auth/register` | — | `authProfileController.register` | Register (email, password, fullName, bio, address, contact) |
| 19 | POST | `/auth/login` | — | `authProfileController.login` | Login → returns JWT token |
| 20 | GET | `/auth/profile` | ✅ JWT | `authProfileController.getProfile` | Get authenticated user's profile |
| 21 | PUT | `/auth/profile` | ✅ JWT | `authProfileController.updateProfile` | Update profile fields |
| 22 | POST | `/auth/add-to-cart` | ✅ JWT | Inline (dead code — references non-existent `User` model) | Legacy — broken |
| **Cart** (`/cartState`) |
| 23 | POST | `/cartState/cart/save` | — | `cartController.saveCart` | Save/replace cart (upsert by userId) |
| 24 | GET | `/cartState/cart/:userId` | — | `cartController.getCart` | Get cart by userId |
| **Orders** (`/place-order`) |
| 25 | POST | `/place-order/orders/:userId` | — | `orderController.saveOrder` | Place a new order (push to user's orders array) |
| 26 | GET | `/place-order/orders/:userId` | — | `orderController.getOrders` | Get active + completed orders (with savings calc) |
| **Admin / Stock** (`/completeorder`) |
| 27 | GET | `/completeorder/users-with-orders` | — | `adminStockController.getUsersWithOrders` | List all users who have orders (admin) |
| 28 | GET | `/completeorder/orders/:id` | — | `adminStockController.getOrderById` | Get order document by its MongoDB _id |
| 29 | GET | `/completeorder/order-detail/:orderId` | — | `adminStockController.getOrderDetails` | Get single order item by sub-document _id |
| 30 | POST | `/completeorder/:userId/:orderId` | — | `adminStockController.completeOrder` | Move an active order to CompletedOrder |
| **Product Reviews** (`/product-reviews`) |
| 31 | POST | `/product-reviews/reviews` | — | Inline | Submit review + update product rating average |
| 32 | GET | `/product-reviews/reviews/:productId` | — | Inline | Get all reviews for a product |
| 33 | GET | `/product-reviews/reviews/average/:productId` | — | Inline | Get average rating for a product |
| 34 | GET | `/product-reviews/reviews/count/:productId` | — | Inline | Get review count for a product |
| 35 | GET | `/product-reviews/product-images` | — | Inline | Utility: rename first 20 product images to `1.webp`-`20.webp` |
| 36 | GET | `/product-reviews/update-all-products` | — | Inline | Utility: update all product names/descriptions from hardcoded array |
| **Home Products** (`/homeproducts`) |
| 37 | GET | `/homeproducts/` | — | Inline | Fetch first 8 products (limit 8) |
| **Static Files** |
| 38 | GET | `/uploads/:filename` | — | Express static | Serve uploaded images from `uploads/` directory |

---

## 3. Auth Flow

1. **Register** → `POST /auth/register` → hashes password with bcrypt (10 salt rounds) → saves to `Profile`
2. **Login** → `POST /auth/login` → verifies credentials → returns JWT (`{token: "..."}`) signed with `JWT_SECRET`, expires in 1h
3. **Authenticated requests** → include header `Authorization: Bearer <token>` → `authMiddleware.js` decodes and attaches `req.user = {id: ...}`

---

## 4. File Upload Handling

- **Middleware:** Multer with disk storage → files saved to `uploads/`
- **Fields accepted:**
  - `mainImage` (single, required for creation)
  - `image1`–`image5` (single each, optional)
- **Filename format:** `{timestamp}{ext}` (e.g. `1712345678901.jpg`)

---

## 5. Database Relationships (Logical)

```
Profile (1) ──< CartState (1 per user, userId string)
Profile (1) ──< Order (1 doc per user, orders array)
Profile (1) ──< CompletedOrder (1 doc per user, completedOrders array)

Category (1) ──< Subcategory (many, category name string)
Category (1) ──< Product (many, category string)
Subcategory (1) ──< Product (many, subcategory string)

Product (1) ──< ProductReview (1 doc per product, reviews array)
```

> **Note:** All relations use **string-based foreign keys** (not MongoDB ObjectId references), except `Order.userId` / `CompletedOrder.userId` which store the Profile's `_id` string.

---

## 6. Key Business Logic

### 6.1 Order Savings Calculation
When fetching orders (`GET /place-order/orders/:userId`), each order item's savings is calculated as:
```
savings = (item.price - item.discountedPrice) * item.quantity
```
Results are sorted newest-first.

### 6.2 Review Submission & Rating Update
When a review is submitted (`POST /product-reviews/reviews`):
1. Review is pushed to `ProductReview.reviews[]`
2. Product's `rating` is recalculated:
   ```
   newAverage = ((oldRating * oldReviewCount) + newRating) / (oldReviewCount + 1)
   ```
3. Product's `reviews` (count) is incremented by 1

### 6.3 Order Completion Flow
1. Admin calls `POST /completeorder/:userId/:orderId`
2. Finds the active `Order` document
3. Splices the specific sub-order from `orders[]`
4. Pushes it into `CompletedOrder.completedOrders[]`
5. Saves both documents

---

## 7. Environment Variables (.env)

| Variable       | Description        | Default |
|----------------|--------------------|---------|
| `MONGODB_URI`  | MongoDB connection  | —       |
| `JWT_SECRET`   | JWT signing secret  | —       |
| `PORT`         | Server port         | `5000`  |
