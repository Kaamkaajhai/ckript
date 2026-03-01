# Quick Setup Guide - Razorpay Integration

## Prerequisites

1. Razorpay Account (Sign up at https://razorpay.com)
2. Node.js and npm installed
3. MongoDB running
4. Backend and frontend servers configured

## Step 1: Get Razorpay Credentials

### For Testing (Recommended for Development)

1. Log in to your Razorpay Dashboard
2. Navigate to **Settings** → **API Keys**
3. Generate **Test API Keys**
4. Copy the **Key ID** and **Key Secret**

### For Production

1. Complete KYC verification on Razorpay
2. Activate your account
3. Generate **Live API Keys**

## Step 2: Configure Environment Variables

Add the following to your `server/.env` file:

```env
# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxx
```

**Important**: 
- For testing, use keys starting with `rzp_test_`
- For production, use keys starting with `rzp_live_`
- Never commit `.env` file to version control

## Step 3: Install Dependencies (Already Done)

The required Razorpay package is already installed:
```bash
cd server
npm install razorpay
```

## Step 4: Start the Servers

### Backend
```bash
cd server
npm start
# or
nodemon server.js
```

### Frontend
```bash
cd client
npm run dev
```

## Step 5: Test the Integration

### Test Script Purchase Flow

1. **Create/Login as Writer**:
   - Upload a script
   - Set it as premium
   - Set a price (e.g., ₹500)

2. **Login as Investor/Producer**:
   - Navigate to the script detail page
   - Click "Purchase Script" button
   - Razorpay checkout should open

3. **Test Payment (Test Mode)**:
   - Use test card: `4111 1111 1111 1111`
   - Any future expiry date
   - Any CVV
   - Any name
   - Complete payment

4. **Verify Success**:
   - Check if script shows "Purchased" badge
   - Verify creator's wallet balance increased
   - Check transactions in database

### Test Script Hold Flow

1. **As Investor/Producer/Director**:
   - Navigate to an available script
   - Click "Place Hold" button
   - Complete payment with test card

2. **Verify Success**:
   - Script status should show "Currently Held"
   - ScriptOption record created in database
   - Creator receives 90% of hold fee
   - Hold expires in 30 days

## Test Cards (Razorpay Test Mode)

### Successful Payments
- **Card Number**: 4111 1111 1111 1111
- **Expiry**: Any future date
- **CVV**: Any 3 digits
- **Name**: Any name

### Failed Payments (for testing error handling)
- **Card Number**: 4111 1111 1111 1112
- Will simulate a payment failure

### UPI (Test Mode)
- **UPI ID**: success@razorpay
- Will simulate successful payment

## Step 6: Verify Database Records

After a successful payment, check MongoDB for:

### Script Document
```javascript
{
  _id: "script_id",
  unlockedBy: ["buyer_user_id"], // For purchases
  holdStatus: "held",            // For holds
  heldBy: "holder_user_id",
  holdStartDate: Date,
  holdEndDate: Date
}
```

### Transaction Documents
```javascript
// Buyer's transaction
{
  user: "buyer_id",
  type: "payment",
  amount: -500, // negative
  paymentMethod: "razorpay",
  status: "completed"
}

// Creator's transaction
{
  user: "creator_id",
  type: "credit",
  amount: 450, // 90% of 500
  paymentMethod: "razorpay",
  status: "completed"
}
```

### User Wallet
```javascript
{
  _id: "creator_id",
  wallet: {
    balance: 450,
    totalEarnings: 450
  }
}
```

## Common Issues & Solutions

### Issue 1: "Payment system not configured"
**Solution**: Check that RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are set in `.env` file and server is restarted.

### Issue 2: Razorpay checkout not opening
**Solution**: Check browser console for errors. Ensure Razorpay script is loading:
```javascript
// Should see in Network tab
https://checkout.razorpay.com/v1/checkout.js
```

### Issue 3: Payment verification failed
**Solution**: 
- Verify RAZORPAY_KEY_SECRET is correct
- Check server logs for signature verification details
- Ensure you're using matching test/live keys

### Issue 4: Amount showing as 0
**Solution**: 
- Check script has `price` or `holdFee` set
- Amounts are in paise (multiply by 100)
- Verify script document in database

### Issue 5: Creator not receiving money
**Solution**:
- Check transaction records are created
- Verify wallet update logic in backend
- Check for any errors in server logs

## Monitoring Payments

### Razorpay Dashboard
1. Log in to Razorpay Dashboard
2. Navigate to **Transactions** → **Payments**
3. View all test/live payments
4. Check payment status, refunds, etc.

### Backend Logs
Monitor server console for payment events:
```
Script purchase verification: { razorpay_order_id, razorpay_payment_id, scriptId }
Script purchase completed: { scriptId, buyerId, amount }
```

### Database Queries

Check recent transactions:
```javascript
db.transactions.find().sort({ createdAt: -1 }).limit(10)
```

Check user wallet:
```javascript
db.users.findOne({ _id: "user_id" }, { wallet: 1 })
```

Check script holds:
```javascript
db.scriptoptions.find({ status: "active" })
```

## Production Deployment Checklist

Before going live:

- [ ] Switch to live Razorpay API keys
- [ ] Complete Razorpay KYC verification
- [ ] Activate live payment mode
- [ ] Test with real small amounts
- [ ] Set up webhook for payment events (optional)
- [ ] Implement proper error logging
- [ ] Set up payment failure notifications
- [ ] Test refund flow if implemented
- [ ] Review and adjust platform fees
- [ ] Set up automated hold expiry job
- [ ] Configure proper CORS for production domain
- [ ] Enable HTTPS (required for production)
- [ ] Test on multiple devices/browsers

## API Endpoints Reference

### Script Purchase
```
POST /api/scripts/purchase/create-order
Body: { scriptId: "script_id" }
Returns: { orderId, amount, currency, keyId, scriptDetails }

POST /api/scripts/purchase/verify-payment
Body: { 
  razorpay_order_id, 
  razorpay_payment_id, 
  razorpay_signature,
  scriptId 
}
Returns: { success: true, message, script, transaction }
```

### Script Hold
```
POST /api/scripts/hold/create-order
Body: { scriptId: "script_id" }
Returns: { orderId, amount, currency, keyId, scriptDetails }

POST /api/scripts/hold/verify-payment
Body: { 
  razorpay_order_id, 
  razorpay_payment_id, 
  razorpay_signature,
  scriptId 
}
Returns: { success: true, message, option, holdDetails, transaction }
```

## Support Resources

- **Razorpay Documentation**: https://razorpay.com/docs/
- **Test Cards**: https://razorpay.com/docs/payments/payments/test-card-details/
- **API Reference**: https://razorpay.com/docs/api/
- **Razorpay Status**: https://status.razorpay.com/

## Next Steps

1. Test the complete flow multiple times
2. Add proper error handling and user feedback
3. Implement refund functionality if needed
4. Set up webhook handlers for real-time updates
5. Add analytics for payment tracking
6. Implement automated hold expiry cleanup
7. Consider adding payment receipts/invoices

---

**Need Help?** Check server logs and browser console for detailed error messages.
