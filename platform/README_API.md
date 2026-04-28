# Stockbud API Documentation (Simulation)

This document outlines the JSON request and response formats used in the Stockbud ecosystem. It simulates the contract between the React Client (Frontend) and the Server (Backend).

## Base URL
`https://api.stockbud.com/v1`

---

## 1. Authentication

### Login User
**Endpoint:** `POST /auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response (Success - 200 OK):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR...",
  "user": {
    "id": "u_12345",
    "name": "Nabil Abubakar",
    "email": "user@example.com",
    "role": "admin"
  }
}
```

---

## 2. Dashboard

### Get Dashboard Statistics
**Endpoint:** `GET /dashboard/stats`

**Response:**
```json
{
  "revenue": {
    "current": 40256.92,
    "change": 2.94,
    "trend": "up"
  },
  "visitors": {
    "current": 12500,
    "change": -1.2,
    "trend": "down"
  },
  "graphData": {
     "revenue_history": [
        {"day": "Mon", "value": 4000},
        {"day": "Tue", "value": 5200},
        {"day": "Wed", "value": 4800},
        {"day": "Thu", "value": 6100},
        {"day": "Fri", "value": 7500}
     ],
     "source_breakdown": [
        {"source": "Direct", "value": 45},
        {"source": "Social", "value": 30},
        {"source": "Organic", "value": 15},
        {"source": "Referral", "value": 10}
     ]
  }
}
```

### Get Detailed Sales Heatmap
**Endpoint:** `GET /dashboard/heatmap?period=year`

**Response:**
```json
{
  "heatmap_id": "hm_2025",
  "points": [
      { "date": "2025-01-01", "level": 1 },
      { "date": "2025-01-02", "level": 3 },
      { "date": "2025-01-03", "level": 0 },
      { "date": "2025-01-04", "level": 4 },
      // ... more days
  ]
}
```

---

## 3. Products

### Lists All Products
**Endpoint:** `GET /products`
**Query Params:** `?page=1&limit=10&category=electronics&search=headphone`

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Premium Headphones",
      "category": "Electronics",
      "price": 299.99,
      "stock": 45,
      "revenue": 24500,
      "rating": 4.5,
      "status": "active",
      "image": "https://api.stockbud.com/images/p1.jpg"
    },
    {
      "id": 2,
      "name": "Wireless Mouse",
      "category": "Electronics",
      "price": 49.99,
      "stock": 120,
      "revenue": 18400,
      "rating": 4.3,
      "status": "active",
      "image": "https://api.stockbud.com/images/p2.jpg"
    }
  ],
  "pagination": {
      "total": 156,
      "page": 1,
      "limit": 10
  }
}
```

### Add New Product
**Endpoint:** `POST /products`

**Request Body:**
```json
{
  "name": "Mechanical Keyboard",
  "category": "Electronics",
  "price": 129.99,
  "stock": 50,
  "description": "High quality mechanical keyboard with RGB."
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "product_id": 105,
  "message": "Product created successfully"
}
```

---

## 4. Users

### Get Users List
**Endpoint:** `GET /users`
**Query Params:** `?plan=premium&status=active`

**Response:**
```json
{
  "users": [
    {
      "id": 1,
      "name": "Alex Johnson",
      "email": "alex@example.com",
      "plan": "Premium",
      "status": "active",
      "joined_at": "2024-01-15T10:00:00Z"
    },
    {
      "id": 2,
      "name": "Sarah Wilson",
      "email": "sarah@example.com",
      "plan": "Pro",
      "status": "active",
      "joined_at": "2024-01-10T14:30:00Z"
    }
  ],
  "stats": {
      "total_users": 15284,
      "active_users": 8920
  }
}
```

---

## 5. Chat & AI Bot

### Get Chat History (Sidebar)
**Endpoint:** `GET /chat/sessions`

**Response:**
```json
[
  {
    "id": "chat_001",
    "title": "Revenue Analysis",
    "last_message": "Last week's revenue was $40k...",
    "updated_at": "2025-12-21T09:00:00Z"
  },
  {
    "id": "chat_002",
    "title": "Customer Support",
    "last_message": "You can customize the bot...",
    "updated_at": "2025-12-20T16:45:00Z"
  }
]
```

### Send Message
**Endpoint:** `POST /chat/message`

**Request Body:**
```json
{
  "session_id": "chat_001",
  "message": "What is the best selling product?"
}
```

**Response:**
```json
{
  "reply": "Based on the latest data, your best selling product is 'Premium Headphones' with 500 units sold this week.",
  "data_points": {
      "product_id": 1,
      "sales": 500
  },
  "timestamp": "2025-12-21T10:05:01Z"
}
```

---

## 6. Bot Customization

### Get Bot Settings
**Endpoint:** `GET /bot/config`

**Response:**
```json
{
  "name": "Analytics Assistant",
  "personality": "Professional",
  "response_speed": "Medium",
  "theme": "Blue",
  "language": "English",
  "notifications_enabled": true,
  "voice_enabled": false
}
```

### Update Bot Settings
**Endpoint:** `PUT /bot/config`

**Request Body:**
```json
{
  "name": "Stocky",
  "personality": "Friendly",
  "theme": "Purple"
}
```

**Response:**
```json
{
  "success": true,
  "updated_config": {
    "name": "Stocky",
    "personality": "Friendly",
    "theme": "Purple",
    "response_speed": "Medium",
    // ... other unchanged values
  }
}
```

---

## Error Responses
The API uses standard HTTP status codes.

**401 Unauthorized:**
```json
{
  "error": "Unauthorized",
  "message": "Invalid API token provided."
}
```

**400 Bad Request:**
```json
{
  "error": "Bad Request",
  "message": "Missing required field: 'email'."
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal Server Error",
  "message": "Something went wrong on our end. Please try again later."
}
```
