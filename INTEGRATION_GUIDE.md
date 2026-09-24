# Ghothys Store - Full Stack Integration

## Project Structure

```
ghothys-store/
├── index.html (Frontend)
├── js/
│   ├── api.js (NEW - Frontend API Client)
│   ├── app.js (Updated - uses new handler)
│   ├── topup.js (Updated - Backend integration)
│   ├── notification.js (Legacy - preserved)
│   └── ... (other files)
├── data/
├── css/
├── backend/
│   ├── server.js (Express Server)
│   ├── package.json
│   ├── .env
│   ├── config/
│   │   └── config.js
│   ├── routes/
│   │   ├── order.routes.js
│   │   └── notification.routes.js
│   ├── controllers/
│   │   ├── order.controller.js
│   │   └── notification.controller.js
│   ├── services/
│   │   ├── fonnte.service.js
│   │   └── discord.service.js
│   ├── middleware/
│   │   ├── errorHandler.js
│   │   └── not-found.js
│   └── utils/
│       ├── logger.js
│       └── response.js
```

## Frontend Integration

### New Files

- **js/api.js** - Centralized API client for backend communication
  - `API.createOrder(orderData)` - Create new order
  - `API.getOrders()` - Get all orders
  - `API.getOrderById(orderId)` - Get specific order
  - `API.sendWhatsAppNotification(phone, message)` - Send WhatsApp
  - `API.sendDiscordNotification(message, embed)` - Send Discord
  - `API.healthCheck()` - Server health check

### Updated Files

- **js/topup.js**
  - `handleTopUpWithBackend()` - New handler that calls backend API
  - Replaces old notification-based handler
  - Full validation with console logs
  - Loading state on button
  - Error handling

- **js/app.js**
  - Updated form listener to use `handleTopUpWithBackend`
  - No duplicate listeners

- **index.html**
  - Added `<script src="js/api.js"></script>` before app.js

## Backend Setup

### Requirements
- Node.js >= 14
- npm

### Installation

```bash
cd backend
npm install
```

### Environment Variables (.env)

```
PORT=3000
NODE_ENV=development
FONNTE_TOKEN=5UyLU4EZ2kLnH4PX4PLd
FONNTE_ENDPOINT=https://api.fonnte.com/send
DISCORD_WEBHOOK=
OWNER_PHONE=6282137499434
```

### Running the Server

**Development (with auto-reload):**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

Server will run on `http://localhost:3000`

## API Endpoints

### Health Check
```
GET /api/health
Response: { status: 'online', version: '1.0.0' }
```

### Create Order
```
POST /api/order
Body: {
  customerName: string,
  game: string,
  uid: string,
  server: string,
  product: string,
  price: number,
  payment: string
}
Response: { success: true, orderId: 'INV-xxxx' }
```

### Get Orders
```
GET /api/order
Response: Array of orders
```

### Get Order by ID
```
GET /api/order/:orderId
Response: Order object
```

## Frontend Testing

### How It Works

1. **User clicks "BAYAR" button**
   - Triggered by `handleTopUpWithBackend` in topup.js
   - Event listener attached in app.js

2. **Form Validation**
   - Validates: customerName, game, uid, server, product, price, payment
   - Console logs: `[FRONTEND] [VALIDATION_OK]`

3. **Send to Backend**
   - Uses `window.API.createOrder(orderData)`
   - Button shows "Mengirim..." and is disabled
   - Console logs: `[FRONTEND] [SENDING_TO_BACKEND]`

4. **Response Handling**
   - Success: Shows toast with Order ID, updates transactions
   - Error: Shows error toast
   - Console logs: `[FRONTEND] [RESPONSE_RECEIVED]`

### Console Logs

All logs start with `[FRONTEND]` tag for easy filtering:

- `[FRONTEND] [VALIDATION_OK]` - Form validation passed
- `[FRONTEND] [SENDING_TO_BACKEND]` - Request sent
- `[FRONTEND] [RESPONSE_RECEIVED]` - Response received
- `[FRONTEND] [ORDER_SUCCESS]` - Order created successfully
- `[FRONTEND] [ORDER_FAILED]` - Order creation failed
- `[FRONTEND] [API_ERROR]` - API error occurred

### Quick Start Guide

1. **Start Backend**
   ```bash
   cd backend
   npm install
   npm run dev
   ```

2. **Start Frontend**
   - Open Live Server on `http://127.0.0.1:5500/index.html`

3. **Test Order Creation**
   - Login to the store
   - Select a game and package
   - Fill in User ID, Server ID, select payment method
   - Click "Bayar" button
   - Check DevTools Console for logs
   - Watch Network tab to see POST to `http://localhost:3000/api/order`

4. **Verify Success**
   - Toast message appears with Order ID
   - Transaction saved to local storage
   - Console shows `[FRONTEND] [ORDER_SUCCESS]`
   - Network shows status 201 (Created)

## Features

### Phase 1 (Current)
✔ Frontend API client (`js/api.js`)
✔ Backend Express server with routes
✔ In-memory order storage
✔ Full validation
✔ Loading states
✔ Error handling
✔ Console logging
✔ No UI changes

### Phase 2 (Planned)
- [ ] Implement Fonnte WhatsApp API
- [ ] Implement Discord Webhooks
- [ ] Database integration (MongoDB/PostgreSQL)
- [ ] Payment gateway (Midtrans)
- [ ] Order status tracking
- [ ] Admin dashboard

## Important Notes

- ✔ **No UI changes** - Frontend looks exactly the same
- ✔ **Clean code** - Separated concerns (API client, handlers, backend)
- ✔ **No duplicates** - Form listener only attached once
- ✔ **CORS enabled** - Backend accepts requests from localhost:5500
- ✔ **Production ready structure** - Modular and scalable

## Troubleshooting

### Backend won't start
- Ensure Node.js is installed: `node --version`
- Check PORT 3000 is not in use
- Make sure .env file exists

### Frontend can't reach backend
- Verify backend is running on `http://localhost:3000`
- Check browser console for CORS errors
- Ensure CORS is enabled in backend (`config.js`)

### Order not creating
- Check DevTools Console for `[FRONTEND]` logs
- Check Network tab - POST request should go to `http://localhost:3000/api/order`
- Check backend console for `[ORDER_RECEIVED]` logs
- Verify all form fields are filled

## Development Tips

- Use `[FRONTEND]` tag in console for easy filtering
- Check Network tab in DevTools to inspect API calls
- Backend logs show request/response flow
- Use `npm run dev` for development with auto-reload
- All endpoints tested with Postman/Insomnia compatible

---

**Version**: 1.0.0  
**Status**: Phase 1 Complete - Ready for Phase 2 Integration  
**Last Updated**: July 17, 2026
