### Textleath (E-commerce Web Application)
Texleath, an e-commerce platform developed for high-quality clothing sales. This platform's web application offers a sleek and elegant design, reflecting the premium nature of our products. With a focus on user experience, our site provides a seamless and engaging shopping experience, complemented by advanced features and interactive elements.


[![Open Source Love svg1](https://badges.frapsoft.com/os/v1/open-source.svg?v=103)](#)
[![contributions welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg?style=flat&label=Contributions&colorA=red&colorB=black	)](#)

---

## Project Description:

Texleath is a full-featured e-commerce web application designed for the sale of premium clothing and wearable products. Built using the MERN stack (MongoDB, Express.js, React.js, Node.js), the platform offers a seamless, scalable, and visually refined shopping experience for both retail customers and business stakeholders.

The backend of Texleath is developed using Node.js and Express.js, providing a robust and scalable API for handling product data, user authentication, order processing, and more. MongoDB serves as the primary database, efficiently managing product inventories, user information, and order history.


With an elegant and responsive interface powered by React.js, Texleath is optimized for user engagement and conversion. It integrates essential e-commerce functionalities, including a dynamic product catalog, cart and checkout system, user account management, and customer reviews. 

---

### 🤖 Tech Stack 
 <a href="#"> 
  <img alt="JavaScript" src="https://img.shields.io/badge/javascript%20-%23323330.svg?&style=for-the-badge&logo=javascript&logoColor=%23F7DF1E"/>  
<img alt="Node js" src="https://img.shields.io/badge/Node.js-%23339933.svg?&style=for-the-badge&logo=node.js&logoColor=white"/> 
<img alt="Express js" src="https://img.shields.io/badge/Express.js-%23000000.svg?&style=for-the-badge&logo=express&logoColor=white"/>   
<img alt="MongoDB" src ="https://img.shields.io/badge/MongoDB-%234ea94b.svg?&style=for-the-badge&logo=mongodb&logoColor=white"/> 
<img alt="JWT" src="https://img.shields.io/badge/JWT-000000.svg?&style=for-the-badge&logo=jsonwebtokens&logoColor=white"/>

 </a>


 ---
- Check out the latest demo of Project [Texleath](https://texleath.netlify.app/). 
- Find the Server's Repository of this Project Here [Texleath-Backend-Server](https://github.com/BazilSuhail/Texleath-Online-Marketplace). 

---


### Run Locally
Clone the project using the following command:
```bash
   git clone https://github.com/BazilSuhail/Texleath-Backend.git
```
Go to the project directory
```bash
   cd Texleath-Backend
```
Then **Run** this command in your terminal to install all required dependancies:
```bash
   npm install
```
In the project directory, you can run:
```bash
   npm run dev
``` 
Runs the app in the development mode.
Open [http://localhost:5173](http://localhost:5173) to view it in your browser.

---


## Features Implemented

#### Product Catalog System
- Comprehensive clothing and wearables platform with full backend and frontend control.
- Admin panel for creating, updating, and deleting product listings.
- Structured categorization for efficient inventory management.

#### Product Discovery Interface
- Dynamic grid and list view toggle for browsing.
- Advanced filtering options including price range, category, size, and availability.
- Sorting options such as newest, lowest price, highest rating, etc.
- Real-time search functionality with debounced keyword handling.

#### Review Platform
- Consumer reviews with star ratings and written feedback.
- Backend moderation for review approval to maintain content quality.
- Aggregated review metrics per product (average rating, total reviews).

#### Filtering Engine
- Advanced multi-criteria filtering engine using query parameters.
- Real-time updates with URL-synced filters for bookmarking and shareable states.
- Backend-optimized filtering logic for scalability and performance.

#### Community Engagement
- User-generated rating system displayed across catalog and detail pages.
- Authenticated review submissions only.
- Admin interface for flagging and managing inappropriate reviews.

#### Product Detail Portal
- Detailed product pages with:
  - High-resolution image gallery with zoom and lightbox features.
  - Complete product descriptions, specifications, and stock status.
  - Dynamic pricing including sales, discounts, and original pricing display.

#### Shopping Cart System
- Interactive shopping cart accessible across the site.
- Real-time quantity adjustments with automatic subtotal calculations.
- Cart persistence using local storage and optional server sync for logged-in users.

#### Checkout Workflow
- Multi-step, secure checkout interface:
  - Shipping address entry.
  - Order summary and confirmation.
- Backend order creation and storage without third-party payment gateway integration.

#### User Authentication
- Secure registration and login system using JWT and bcrypt.
- Encrypted credential storage with hashed passwords.
- Session persistence via HTTP-only cookies or local storage.

#### Purchase History
- Authenticated users can view past orders.
- Order status updates (e.g., pending, shipped, delivered) shown per order.
- Ability to reorder from past purchases.

#### Adaptive Interface
- Fully responsive layout using mobile-first design principles.
- Optimized for various screen sizes including mobile, tablet, and desktop.
- Consistent experience across devices with adaptive UI components.

---

## Implementation of Functionalities

#### Data Infrastructure
- Supabase used as the backend database platform for user accounts and product inventory.
- Structured tables for products, users, orders, and reviews.

#### Authentication Framework
- Supabase Auth for initial prototyping; transitioned to custom JWT-based auth.
- Middleware-based route protection for authenticated endpoints.
- Token expiration and refresh logic implemented.

#### UI Component Library
- Tailwind CSS applied for atomic, utility-first styling.
- Custom themes and components built on Tailwind’s responsive framework.

#### Motion Design System
- Framer Motion integration for animations such as:
  - Page transitions.
  - Button interactions.
  - Modal dialogs.

#### State Management
- React Query used for data fetching, caching, and background updates.
- Optimistic updates for user actions (e.g., adding to cart, submitting reviews).

#### Search Algorithm
- Keyword-based search with fuzzy matching on product titles and descriptions.
- Backend search indexing for performance.
- Debounced frontend search input for user experience optimization.

#### User Engagement Tools
- Bookmark/favorites system with persistent storage tied to user account.
- Ability to save products across sessions and devices.

#### Cart Management Engine
- Hybrid cart system:
  - Local storage for unauthenticated users.
  - API-synced cart for logged-in users.
- Real-time subtotal and tax calculations on frontend.

#### Payment Processing
- Simulated checkout with order summary and confirmation screen.
- Order stored in database with unique ID and metadata.
- Receipts generated post-checkout with downloadable PDF (optional).

#### Session Management
- JWT-based session handling with token expiration strategy.
- Automatic token validation and route guarding.
- Logout clears token and resets user context.

#### Responsive Framework
- Tailwind CSS with custom breakpoints.
- Mobile-first approach ensuring clean layouts on all devices.
- Flexbox and grid systems for structured UI alignment.
