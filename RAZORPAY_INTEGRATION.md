# Razorpay Payment Integration for Scripts

## Overview

This document describes the Razorpay payment integration for investors/producers to purchase scripts or place holds (options) on scripts in ScriptBridge.

## Features

### 1. Script Purchase
- Investors can purchase scripts outright for full access
- One-time payment gives permanent access to the script
- Creator receives 90% of the purchase price (10% platform fee)
- Transaction records are created for both buyer and seller

### 2. Script Hold/Option
- Industry professionals (investors, producers, directors) can place a 30-day exclusive hold on scripts
- Hold fee is configurable per script (default: ₹200)
- Creator receives 90% of the hold fee immediately
- Hold automatically expires after 30 days unless converted to a purchase

## Backend Implementation

### New Endpoints

#### Script Purchase
- **POST** `/api/scripts/purchase/create-order` - Creates Razorpay order for script purchase
- **POST** `/api/scripts/purchase/verify-payment` - Verifies payment and unlocks script

#### Script Hold
- **POST** `/api/scripts/hold/create-order` - Creates Razorpay order for placing hold
- **POST** `/api/scripts/hold/verify-payment` - Verifies payment and places hold

### Controllers (`server/controllers/scriptController.js`)

Four new controller functions have been added:

1. **`createScriptPurchaseOrder`**: 
   - Validates script availability
   - Checks if already purchased
   - Creates Razorpay order with script details
   - Returns order ID and payment info

2. **`verifyScriptPurchase`**:
   - Verifies Razorpay signature for security
   - Unlocks script for buyer
   - Credits creator's wallet (90% payout)
   - Creates transaction records
   - Sends notification to creator

3. **`createScriptHoldOrder`**:
   - Validates user role (must be investor/producer/director)
   - Checks if script is available for hold
   - Creates Razorpay order for hold fee

4. **`verifyScriptHold`**:
   - Verifies payment signature
   - Creates ScriptOption record
   - Updates script hold status
   - Credits creator's wallet
   - Sets 30-day expiration

### Models Updated

#### ScriptOption Model
- Added `orderId` field to store Razorpay order ID
- Already had `paymentId` field for payment reference

#### Transaction Model
- Already supports `razorpay` as payment method
- Stores payment IDs and metadata

## Frontend Implementation

### New Component: `RazorpayScriptPayment.jsx`

A reusable payment modal component that handles both purchase and hold payments.

**Props:**
- `isOpen` - Controls modal visibility
- `onClose` - Close handler
- `script` - Script object with title, price, etc.
- `type` - Either "purchase" or "hold"
- `onSuccess` - Callback after successful payment

**Features:**
- Loads Razorpay checkout script dynamically
- Creates order through backend API
- Opens Razorpay payment UI
- Verifies payment after completion
- Shows loading states and error messages
- Responsive and dark mode compatible

### Updated Page: `ScriptDetail.jsx`

**New Features:**
1. **Purchase Button**: Shows for non-owners when script is premium and not yet purchased
2. **Purchased Badge**: Shows when user has already purchased the script
3. **Updated Hold Button**: Now triggers Razorpay payment flow
4. **Payment Success Handler**: Refreshes script data after successful payment

**State Added:**
- `showPurchaseModal` - Controls purchase modal visibility
- `paymentType` - Tracks whether payment is for "purchase" or "hold"

**Handlers:**
- `handlePurchase()` - Opens purchase payment modal
- `handleHold()` - Opens hold payment modal  
- `handlePaymentSuccess()` - Refreshes data and shows success message

## Payment Flow

### Script Purchase Flow
```
1. User clicks "Purchase Script" button
2. Frontend calls POST /api/scripts/purchase/create-order
3. Backend creates Razorpay order and returns order details
4. Frontend opens Razorpay checkout UI
5. User completes payment via Razorpay
6. Razorpay calls success handler with payment details
7. Frontend calls POST /api/scripts/purchase/verify-payment
8. Backend verifies signature and processes transaction:
   - Adds user to script.unlockedBy array
   - Creates buyer transaction record (-price)
   - Credits creator wallet (+90% of price)
   - Creates creator transaction record (+earnings)
   - Sends notification to creator
9. Frontend refreshes script data and shows success message
```

### Script Hold Flow
```
1. User clicks "Place Hold" button
2. Frontend calls POST /api/scripts/hold/create-order
3. Backend validates user role and creates Razorpay order
4. Frontend opens Razorpay checkout UI
5. User completes payment via Razorpay
6. Razorpay calls success handler with payment details
7. Frontend calls POST /api/scripts/hold/verify-payment
8. Backend verifies signature and processes hold:
   - Creates ScriptOption record
   - Updates script hold status and dates
   - Creates holder transaction record (-fee)
   - Credits creator wallet (+90% of fee)
   - Creates creator transaction record (+earnings)
   - Sends notification to creator
9. Frontend refreshes script data and shows success message
```

## Security

### Payment Verification
- All payments are verified using HMAC SHA256 signature
- Signature is generated using: `razorpay_order_id | razorpay_payment_id`
- Verified against Razorpay secret key
- Prevents fraudulent payment confirmations

### Access Control
- Only authenticated users can initiate payments
- Only industry professionals can place holds
- Users cannot purchase their own scripts
- Double-checking of hold status before processing

## Configuration

### Environment Variables (.env)

Required in `server/.env`:
```
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

### Testing

For testing, use Razorpay Test Mode credentials:
- Test cards are available in Razorpay documentation
- No real money is charged in test mode
- All flows work identically to production

## Fee Structure

### Script Purchase
- **Total Amount**: Script price (set by creator)
- **Platform Fee**: 10%
- **Creator Receives**: 90%

### Script Hold
- **Total Amount**: Script hold fee (default ₹200, configurable)
- **Duration**: 30 days
- **Platform Fee**: 10%
- **Creator Receives**: 90%

## Transaction Records

All payments create dual transaction records:

1. **Buyer/Holder Transaction**:
   - Type: "payment"
   - Amount: Negative (money spent)
   - Status: "completed"
   - Includes payment IDs and metadata

2. **Creator Transaction**:
   - Type: "credit"
   - Amount: Positive (money earned)
   - Status: "completed"
   - Includes buyer ID and fee breakdown

## Notifications

Creators receive real-time notifications for:
- Script purchases (with earnings amount)
- Script holds placed (with hold details and earnings)

## Wallet System

Creators have a wallet that tracks:
- **balance**: Current available balance
- **totalEarnings**: Lifetime earnings
- Updated automatically on each transaction
- Can be withdrawn through bank transfer (separate feature)

## UI/UX Features

- **Secure Payment Badge**: Shows Razorpay security badge
- **Payment Methods Info**: Lists accepted payment methods (Cards, UPI, Net Banking)
- **Amount Breakdown**: Shows platform fee and creator payout
- **Loading States**: Shows processing states during payment
- **Error Handling**: Displays clear error messages if payment fails
- **Dark Mode**: Fully compatible with dark/light themes
- **Mobile Responsive**: Works on all screen sizes

## Future Enhancements

Potential improvements:
1. **Subscription Plans**: Monthly access to multiple scripts
2. **Partial Payments**: Installment options for high-value scripts
3. **Refund System**: Automated refunds for certain conditions
4. **Currency Support**: Multi-currency support
5. **Payment Analytics**: Dashboard for payment insights
6. **Hold Extensions**: Allow extending hold period
7. **Hold to Purchase Conversion**: Discount if converting hold to purchase

## Support

For issues or questions:
- Check Razorpay logs in backend console
- Verify environment variables are set
- Check network requests in browser DevTools
- Review transaction records in database

## Testing Checklist

- [ ] Can create purchase order successfully
- [ ] Can complete purchase payment flow
- [ ] Script is unlocked after purchase
- [ ] Creator receives payment in wallet
- [ ] Transaction records are created correctly
- [ ] Notification is sent to creator
- [ ] Can create hold order successfully
- [ ] Can complete hold payment flow
- [ ] Script status updates to "held"
- [ ] ScriptOption record is created
- [ ] Hold expires after 30 days (automated job required)
- [ ] Cannot purchase already purchased script
- [ ] Cannot purchase own script
- [ ] Only authorized roles can place holds
- [ ] Payment verification security works
- [ ] Error handling works properly
- [ ] UI shows correct states (loading, error, success)

## Dependencies

### Backend
- `razorpay` - Razorpay Node.js SDK (already installed)
- `crypto` - For signature verification (native Node.js)

### Frontend
- Razorpay Checkout Script (loaded dynamically)
- No additional npm packages required

## Code Locations

### Backend Files Modified/Created
- `server/controllers/scriptController.js` - Added payment functions
- `server/routes/scriptRoutes.js` - Added payment routes
- `server/models/ScriptOption.js` - Added orderId field

### Frontend Files Modified/Created
- `client/src/components/RazorpayScriptPayment.jsx` - New payment modal
- `client/src/pages/ScriptDetail.jsx` - Added payment integration

---

**Last Updated**: March 1, 2026
**Version**: 1.0.0
