# Kuber Quant API Documentation

Base URL: `/api`

Authentication: `Authorization: Bearer <jwt_token>`

## Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login (returns token + refreshToken) |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | Revoke refresh token |
| POST | `/auth/forgot-password` | Send OTP to email |
| POST | `/auth/verify-otp` | Verify OTP, get resetToken |
| POST | `/auth/reset-password` | Reset password |
| PUT | `/auth/change-password` | Change password (auth required) |
| GET | `/auth/me` | Current user profile |
| POST | `/auth/google` | Google OAuth login |

## Wallet & Transactions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/wallet` | Wallet balances |
| POST | `/wallet/transfer` | Fiat ↔ crypto transfer |
| GET | `/wallet-ledger` | Immutable transaction ledger |
| GET | `/transactions` | User transaction history |
| POST | `/transactions` | Create deposit/withdrawal request |
| POST | `/transactions/manual-deposit` | Manual deposit with proof upload |

## Payments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/payments/gateways` | Enabled payment gateways |
| POST | `/payments/razorpay/create-order` | Create Razorpay order |
| POST | `/payments/razorpay/verify` | Verify Razorpay payment |
| POST | `/payments/razorpay/webhook` | Razorpay webhook |
| POST | `/payments/phonepe/initiate` | Initiate PhonePe payment |
| POST | `/payments/phonepe/callback` | PhonePe callback |
| POST | `/payments/paypal/create-order` | Create PayPal order |
| POST | `/payments/paypal/capture` | Capture PayPal payment |
| POST | `/payments/payu/initiate` | Initiate PayU payment |
| POST | `/payments/payu/callback` | PayU callback |
| GET | `/payments/crypto/addresses` | Crypto wallet addresses |
| POST | `/payments/crypto/deposit` | Submit crypto deposit |

## Investments & Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard/summary` | User dashboard stats |
| GET | `/dashboard/portfolio-chart` | Portfolio chart data |
| GET | `/investments` | List investments |
| POST | `/investments` | Create investment (deducts wallet) |

## Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/stats` | Platform statistics |
| GET | `/admin/analytics` | Revenue & user growth charts |
| GET | `/admin/transactions` | All transactions |
| POST | `/admin/transactions/:id/approve` | Approve deposit/withdrawal |
| POST | `/admin/transactions/:id/reject` | Reject (refunds withdrawal) |
| POST | `/admin/wallet-adjust` | Manual balance adjustment |
| CRUD | `/admin/payment-gateways` | Payment gateway config |
| CRUD | `/admin/plans` | Investment plans |
| CRUD | `/admin/users` | User management |

## Roles

- `user` — Standard investor
- `manager` — Client management
- `admin` — Platform administration
- `superadmin` — Full system control
