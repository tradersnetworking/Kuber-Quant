CREATE TYPE "public"."agreement_status" AS ENUM('pending_signature', 'signed', 'expired', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."agreement_type" AS ENUM('investment', 'profit_sharing', 'ea_subscription', 'copy_trading', 'account_handling', 'algo_trading', 'risk_disclosure', 'aml_kyc', 'privacy_policy', 'terms_conditions', 'withdrawal_policy');--> statement-breakpoint
CREATE TYPE "public"."signature_method" AS ENUM('draw', 'otp', 'checkbox');--> statement-breakpoint
CREATE TYPE "public"."algo_status" AS ENUM('active', 'paused');--> statement-breakpoint
CREATE TYPE "public"."risk_level" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."otp_purpose" AS ENUM('password_reset', 'email_verify', 'login', 'registration', 'mobile_verify', 'withdrawal_confirm');--> statement-breakpoint
CREATE TYPE "public"."copy_trader_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."ea_status" AS ENUM('active', 'inactive', 'backtesting');--> statement-breakpoint
CREATE TYPE "public"."ea_type" AS ENUM('scalping', 'swing', 'trend', 'grid', 'arbitrage');--> statement-breakpoint
CREATE TYPE "public"."ea_subscription_plan" AS ENUM('monthly', 'quarterly', 'biannual', 'annual');--> statement-breakpoint
CREATE TYPE "public"."ea_subscription_status" AS ENUM('active', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."exchange_order_status" AS ENUM('awaiting_deposit', 'deposit_submitted', 'processing', 'completed', 'cancelled', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."exchange_side" AS ENUM('buy', 'sell');--> statement-breakpoint
CREATE TYPE "public"."kyc_status" AS ENUM('pending', 'submitted', 'verified', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."promoter_commission_type" AS ENUM('cpa', 'revenue_share', 'hybrid', 'multi_level');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'manager', 'support', 'admin', 'superadmin');--> statement-breakpoint
CREATE TYPE "public"."investment_currency" AS ENUM('USD', 'EUR', 'INR', 'BTC', 'ETH', 'USDT');--> statement-breakpoint
CREATE TYPE "public"."investment_status" AS ENUM('active', 'completed', 'pending', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."investment_type" AS ENUM('algo', 'copy', 'ea', 'manual');--> statement-breakpoint
CREATE TYPE "public"."trade_status" AS ENUM('open', 'closed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."trade_type" AS ENUM('buy', 'sell');--> statement-breakpoint
CREATE TYPE "public"."transaction_currency" AS ENUM('USD', 'EUR', 'INR', 'BTC', 'ETH', 'USDT', 'TRX', 'BNB');--> statement-breakpoint
CREATE TYPE "public"."transaction_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('deposit', 'withdrawal');--> statement-breakpoint
CREATE TYPE "public"."capital_return" AS ENUM('yes', 'no', 'partial');--> statement-breakpoint
CREATE TYPE "public"."plan_category" AS ENUM('starter', 'growth', 'premium', 'elite');--> statement-breakpoint
CREATE TYPE "public"."plan_type" AS ENUM('weekly', 'monthly', 'quarterly', 'half_yearly', 'annual');--> statement-breakpoint
CREATE TYPE "public"."profit_frequency" AS ENUM('daily', 'weekly', 'monthly', 'at_maturity');--> statement-breakpoint
CREATE TYPE "public"."id_type" AS ENUM('passport', 'national_id', 'drivers_license');--> statement-breakpoint
CREATE TYPE "public"."kyc_submit_status" AS ENUM('pending', 'submitted', 'verified', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."mt5_account_status" AS ENUM('active', 'inactive', 'pending_review');--> statement-breakpoint
CREATE TYPE "public"."mt_platform" AS ENUM('mt4', 'mt5');--> statement-breakpoint
CREATE TYPE "public"."ticket_priority" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('open', 'in_progress', 'resolved', 'closed');--> statement-breakpoint
CREATE TYPE "public"."notification_category" AS ENUM('deposit', 'withdrawal', 'service', 'kyc', 'investment', 'support', 'system', 'promo', 'security');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('info', 'success', 'warning', 'error');--> statement-breakpoint
CREATE TYPE "public"."referral_status" AS ENUM('pending', 'paid');--> statement-breakpoint
CREATE TYPE "public"."mt5_request_status" AS ENUM('pending', 'forwarded', 'accepted', 'rejected', 'completed');--> statement-breakpoint
CREATE TYPE "public"."mt5_request_type" AS ENUM('copy_trading', 'account_handling');--> statement-breakpoint
CREATE TYPE "public"."roi_payout_status" AS ENUM('pending', 'processed', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."promo_applies" AS ENUM('deposit', 'investment', 'ea_subscription');--> statement-breakpoint
CREATE TYPE "public"."promo_type" AS ENUM('percentage', 'fixed');--> statement-breakpoint
CREATE TYPE "public"."ledger_type" AS ENUM('deposit', 'withdrawal', 'profit', 'referral', 'investment', 'bonus', 'adjustment', 'transfer');--> statement-breakpoint
CREATE TYPE "public"."ledger_wallet" AS ENUM('fiat', 'crypto');--> statement-breakpoint
CREATE TYPE "public"."payment_order_status" AS ENUM('created', 'pending', 'paid', 'failed', 'cancelled', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."payment_provider" AS ENUM('manual', 'razorpay', 'phonepe', 'paypal', 'payu', 'crypto');--> statement-breakpoint
CREATE TABLE "agreement_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"agreement_id" integer NOT NULL,
	"event" text NOT NULL,
	"user_id" integer,
	"ip_address" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agreement_signatures" (
	"id" serial PRIMARY KEY NOT NULL,
	"agreement_id" integer NOT NULL,
	"signature_data" text,
	"method" "signature_method" DEFAULT 'draw' NOT NULL,
	"signer_name" text,
	"ip_address" text,
	"user_agent" text,
	"verification_hash" text,
	"signed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agreement_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" "agreement_type" NOT NULL,
	"title" text NOT NULL,
	"version" text DEFAULT '1.0' NOT NULL,
	"content" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agreements" (
	"id" serial PRIMARY KEY NOT NULL,
	"agreement_uid" text NOT NULL,
	"user_id" integer NOT NULL,
	"template_id" integer,
	"type" "agreement_type" NOT NULL,
	"status" "agreement_status" DEFAULT 'pending_signature' NOT NULL,
	"filled_data" jsonb,
	"pdf_hash" text,
	"ip_address" text,
	"user_agent" text,
	"device_info" text,
	"agreement_date" text,
	"signed_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"trigger_event" text,
	"trigger_entity_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agreements_agreement_uid_unique" UNIQUE("agreement_uid")
);
--> statement-breakpoint
CREATE TABLE "algo_strategies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"roi" numeric(10, 4) DEFAULT '0' NOT NULL,
	"risk_level" "risk_level" DEFAULT 'medium' NOT NULL,
	"subscribers" integer DEFAULT 0 NOT NULL,
	"status" "algo_status" DEFAULT 'active' NOT NULL,
	"min_investment" numeric(18, 2) DEFAULT '100' NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"price_monthly" numeric(18, 2) DEFAULT '99' NOT NULL,
	"price_quarterly" numeric(18, 2) DEFAULT '249' NOT NULL,
	"price_biannual" numeric(18, 2) DEFAULT '449' NOT NULL,
	"price_annual" numeric(18, 2) DEFAULT '799' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "algo_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"strategy_id" integer NOT NULL,
	"amount" numeric(18, 8) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"plan" "ea_subscription_plan" DEFAULT 'monthly' NOT NULL,
	"expires_at" timestamp with time zone,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"role" text,
	"action" text NOT NULL,
	"entity" text,
	"entity_id" integer,
	"details" jsonb,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_otps" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"user_id" integer,
	"code_hash" text NOT NULL,
	"purpose" "otp_purpose" NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"ip_address" text,
	"user_agent" text,
	"device_label" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "refresh_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "copy_follows" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"trader_id" integer NOT NULL,
	"amount" numeric(18, 8) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"profit_sharing_percent" integer DEFAULT 20 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "copy_traders" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"avatar_url" text,
	"bio" text,
	"roi" numeric(10, 4) DEFAULT '0' NOT NULL,
	"monthly_roi" numeric(10, 4) DEFAULT '0' NOT NULL,
	"followers" integer DEFAULT 0 NOT NULL,
	"win_rate" numeric(10, 4) DEFAULT '0' NOT NULL,
	"total_trades" integer DEFAULT 0 NOT NULL,
	"status" "copy_trader_status" DEFAULT 'active' NOT NULL,
	"min_investment" numeric(18, 2) DEFAULT '100' NOT NULL,
	"risk_level" text DEFAULT 'medium' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_validations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"category" text NOT NULL,
	"reference_id" integer,
	"document_type" text NOT NULL,
	"document_url" text NOT NULL,
	"passed" boolean DEFAULT false NOT NULL,
	"risk_score" integer DEFAULT 0 NOT NULL,
	"flags" text DEFAULT '[]' NOT NULL,
	"summary" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ea_strategies" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"type" "ea_type" NOT NULL,
	"backtest_roi" numeric(10, 4),
	"win_rate" numeric(10, 4),
	"status" "ea_status" DEFAULT 'inactive' NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ea_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"strategy_id" integer NOT NULL,
	"mt_account_number" text NOT NULL,
	"mt_platform" text DEFAULT 'mt5' NOT NULL,
	"plan" "ea_subscription_plan" DEFAULT 'monthly' NOT NULL,
	"profit_sharing_percent" integer,
	"amount" numeric(18, 2),
	"currency" text DEFAULT 'USD',
	"license_key" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"download_count" integer DEFAULT 0 NOT NULL,
	"status" "ea_subscription_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exchange_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"side" "exchange_side" NOT NULL,
	"crypto_symbol" text NOT NULL,
	"crypto_network" text DEFAULT '' NOT NULL,
	"crypto_amount" numeric(18, 8) NOT NULL,
	"fiat_amount" numeric(18, 2) NOT NULL,
	"fiat_currency" text DEFAULT 'INR' NOT NULL,
	"rate_usd" numeric(18, 8) NOT NULL,
	"status" "exchange_order_status" DEFAULT 'awaiting_deposit' NOT NULL,
	"deposit_transaction_id" integer,
	"payout_transaction_id" integer,
	"payment_gateway_id" integer,
	"payment_account_id" integer,
	"receive_wallet_address" text,
	"deposit_method" text,
	"proof_url" text,
	"tx_hash" text,
	"utr_reference" text,
	"admin_notes" text,
	"reviewed_by_user_id" integer,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exchange_rates" (
	"id" serial PRIMARY KEY NOT NULL,
	"symbol" text NOT NULL,
	"network" text DEFAULT '' NOT NULL,
	"label" text NOT NULL,
	"buy_price_usd" numeric(18, 8) NOT NULL,
	"sell_price_usd" numeric(18, 8) NOT NULL,
	"buy_price_inr" numeric(18, 4),
	"sell_price_inr" numeric(18, 4),
	"min_buy_usd" numeric(18, 2) DEFAULT '10' NOT NULL,
	"min_sell_usd" numeric(18, 2) DEFAULT '10' NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"buy_enabled" boolean DEFAULT true NOT NULL,
	"sell_enabled" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"full_name" text NOT NULL,
	"phone" text,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"kyc_status" "kyc_status" DEFAULT 'pending' NOT NULL,
	"balance_fiat" numeric(18, 2) DEFAULT '0' NOT NULL,
	"balance_crypto" numeric(18, 8) DEFAULT '0' NOT NULL,
	"total_profit" numeric(18, 2) DEFAULT '0' NOT NULL,
	"avatar_url" text,
	"referral_code" text,
	"referral_count" integer DEFAULT 0 NOT NULL,
	"referral_earnings" numeric(18, 2) DEFAULT '0' NOT NULL,
	"referred_by" integer,
	"manager_id" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_promoter" boolean DEFAULT false NOT NULL,
	"promoter_commission_type" "promoter_commission_type",
	"promoter_enabled_at" timestamp with time zone,
	"suspend_reason" text,
	"withdrawals_enabled" boolean DEFAULT true NOT NULL,
	"withdrawal_block_message" text,
	"deposits_enabled" boolean DEFAULT true NOT NULL,
	"investments_enabled" boolean DEFAULT true NOT NULL,
	"algo_trading_enabled" boolean DEFAULT true NOT NULL,
	"copy_trading_enabled" boolean DEFAULT true NOT NULL,
	"ea_trading_enabled" boolean DEFAULT true NOT NULL,
	"mt5_enabled" boolean DEFAULT true NOT NULL,
	"two_factor_enabled" boolean DEFAULT false NOT NULL,
	"two_factor_secret" text,
	"two_factor_temp_secret" text,
	"two_factor_backup_codes" text,
	"login_alerts_enabled" boolean DEFAULT true NOT NULL,
	"last_login_ip" text,
	"last_login_device" text,
	"failed_login_attempts" integer DEFAULT 0 NOT NULL,
	"session_version" integer DEFAULT 1 NOT NULL,
	"password_changed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_referral_code_unique" UNIQUE("referral_code")
);
--> statement-breakpoint
CREATE TABLE "investments" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" "investment_type" NOT NULL,
	"plan_name" text,
	"amount" numeric(18, 8) NOT NULL,
	"currency" "investment_currency" DEFAULT 'USD' NOT NULL,
	"profit" numeric(18, 8) DEFAULT '0' NOT NULL,
	"profit_percent" numeric(10, 4) DEFAULT '0' NOT NULL,
	"status" "investment_status" DEFAULT 'pending' NOT NULL,
	"maturity_date" timestamp with time zone,
	"maturity_payout_destination" text,
	"maturity_payout_account_id" integer,
	"maturity_payout_method" text,
	"maturity_payout_consent_at" timestamp with time zone,
	"maturity_payout_acknowledged_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trades" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"symbol" text NOT NULL,
	"type" "trade_type" NOT NULL,
	"amount" numeric(18, 8) NOT NULL,
	"entry_price" numeric(18, 8) NOT NULL,
	"exit_price" numeric(18, 8),
	"profit_loss" numeric(18, 8),
	"status" "trade_status" DEFAULT 'open' NOT NULL,
	"strategy" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" "transaction_type" NOT NULL,
	"amount" numeric(18, 8) NOT NULL,
	"currency" "transaction_currency" DEFAULT 'USD' NOT NULL,
	"status" "transaction_status" DEFAULT 'pending' NOT NULL,
	"payment_method" text,
	"tx_hash" text,
	"notes" text,
	"proof_url" text,
	"utr_reference" text,
	"gateway_provider" text,
	"gateway_order_id" text,
	"gateway_payment_id" text,
	"payment_account_id" integer,
	"admin_notes" text,
	"reviewed_by_user_id" integer,
	"reviewed_at" timestamp with time zone,
	"first_reviewed_by_user_id" integer,
	"first_reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "investment_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"min_amount" numeric(18, 2) NOT NULL,
	"max_amount" numeric(18, 2) NOT NULL,
	"roi_percent" numeric(6, 2) NOT NULL,
	"duration_days" integer NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"total_investors" integer DEFAULT 0 NOT NULL,
	"category" "plan_category" DEFAULT 'starter' NOT NULL,
	"plan_type" "plan_type" DEFAULT 'monthly' NOT NULL,
	"profit_frequency" "profit_frequency" DEFAULT 'monthly' NOT NULL,
	"capital_return" "capital_return" DEFAULT 'yes' NOT NULL,
	"auto_renewal" boolean DEFAULT false NOT NULL,
	"early_withdrawal_penalty" numeric(5, 2) DEFAULT '0' NOT NULL,
	"features" text,
	"max_investors" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kyc_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"full_name" text,
	"address" text,
	"country" text,
	"id_type" "id_type",
	"id_number" text,
	"pan_card" text,
	"aadhaar_number" text,
	"bank_account_number" text,
	"bank_name" text,
	"ifsc_code" text,
	"id_document_url" text,
	"pan_document_url" text,
	"aadhaar_front_url" text,
	"aadhaar_back_url" text,
	"passport_document_url" text,
	"drivers_license_number" text,
	"drivers_license_document_url" text,
	"passport_photo_url" text,
	"address_proof_url" text,
	"selfie_url" text,
	"signature_url" text,
	"cancelled_cheque_url" text,
	"upi_id" text,
	"branch_name" text,
	"tax_id" text,
	"status" "kyc_submit_status" DEFAULT 'submitted' NOT NULL,
	"rejection_reason" text,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mt5_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"platform" "mt_platform" DEFAULT 'mt5' NOT NULL,
	"account_number" text NOT NULL,
	"broker" text NOT NULL,
	"server_name" text,
	"password_enc" text,
	"balance" numeric(18, 2),
	"equity" numeric(18, 2),
	"profit" numeric(18, 2),
	"status" "mt5_account_status" DEFAULT 'pending_review' NOT NULL,
	"manager_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket_replies" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"message" text NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"status" "ticket_status" DEFAULT 'open' NOT NULL,
	"priority" "ticket_priority" DEFAULT 'medium' NOT NULL,
	"category" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"type" "notification_type" DEFAULT 'info' NOT NULL,
	"category" "notification_category" DEFAULT 'system' NOT NULL,
	"action_url" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "referral_earnings" (
	"id" serial PRIMARY KEY NOT NULL,
	"referrer_id" integer NOT NULL,
	"referred_user_id" integer NOT NULL,
	"amount" numeric(18, 2) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"status" "referral_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_gateways" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"symbol" text,
	"network" text,
	"description" text,
	"wallet_address" text,
	"upi_id" text,
	"qr_code_url" text,
	"min_amount" numeric(18, 2) DEFAULT '10',
	"max_amount" numeric(18, 2),
	"is_enabled" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"extra_config" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text DEFAULT '' NOT NULL,
	"label" text NOT NULL,
	"category" text DEFAULT 'general' NOT NULL,
	"description" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mt5_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"mt5_account_id" integer,
	"type" "mt5_request_type" NOT NULL,
	"profit_sharing_percent" integer DEFAULT 30 NOT NULL,
	"details" text,
	"status" "mt5_request_status" DEFAULT 'pending' NOT NULL,
	"external_response" text,
	"forwarded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roi_payouts" (
	"id" serial PRIMARY KEY NOT NULL,
	"investment_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"amount" numeric(18, 8) NOT NULL,
	"roi_percent" numeric(10, 4) NOT NULL,
	"status" "roi_payout_status" DEFAULT 'pending' NOT NULL,
	"plan_name" text,
	"note" text,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "login_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"country" text,
	"device" text,
	"browser" text,
	"success" boolean DEFAULT true NOT NULL,
	"fail_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promo_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"description" text,
	"type" "promo_type" DEFAULT 'percentage' NOT NULL,
	"value" numeric(10, 2) NOT NULL,
	"applies_to" "promo_applies" DEFAULT 'deposit' NOT NULL,
	"max_uses" integer DEFAULT 100 NOT NULL,
	"used_count" integer DEFAULT 0 NOT NULL,
	"min_amount" numeric(18, 2),
	"is_active" boolean DEFAULT true NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "promo_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "promo_usages" (
	"id" serial PRIMARY KEY NOT NULL,
	"promo_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"discount_amount" numeric(18, 2) NOT NULL,
	"applied_to" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallet_ledger" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" "ledger_type" NOT NULL,
	"amount" numeric(18, 8) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"wallet_type" "ledger_wallet" NOT NULL,
	"balance_before" numeric(18, 8) NOT NULL,
	"balance_after" numeric(18, 8) NOT NULL,
	"reference_type" text,
	"reference_id" integer,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"provider" "payment_provider" NOT NULL,
	"order_id" text NOT NULL,
	"payment_id" text,
	"amount" numeric(18, 8) NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"status" "payment_order_status" DEFAULT 'created' NOT NULL,
	"transaction_id" integer,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text DEFAULT 'general' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "permissions_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role" text NOT NULL,
	"permission_id" integer NOT NULL,
	CONSTRAINT "role_permissions_role_permission_id_pk" PRIMARY KEY("role","permission_id")
);
--> statement-breakpoint
CREATE TABLE "onboarding_drafts" (
	"id" serial PRIMARY KEY NOT NULL,
	"draft_token" text NOT NULL,
	"email" text,
	"onboarding_type" text NOT NULL,
	"current_step" integer DEFAULT 1 NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "onboarding_drafts_draft_token_unique" UNIQUE("draft_token")
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"username" text,
	"date_of_birth" text,
	"gender" text,
	"nationality" text,
	"country" text,
	"state" text,
	"city" text,
	"address" text,
	"postal_code" text,
	"tax_id" text,
	"occupation" text,
	"annual_income_range" text,
	"investment_experience" text,
	"risk_appetite" text,
	"preferred_investment_type" text,
	"source_of_funds" text,
	"trading_interests" jsonb DEFAULT '[]'::jsonb,
	"crypto_wallets" jsonb DEFAULT '{}'::jsonb,
	"banking_details_enc" text,
	"security_settings" jsonb DEFAULT '{}'::jsonb,
	"agreements_accepted" jsonb DEFAULT '{}'::jsonb,
	"investor_id" text,
	"onboarding_completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_profiles_username_unique" UNIQUE("username"),
	CONSTRAINT "user_profiles_investor_id_unique" UNIQUE("investor_id")
);
--> statement-breakpoint
CREATE TABLE "manager_applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"applicant_email" text NOT NULL,
	"full_name" text NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reviewed_by" integer,
	"review_notes" text,
	"user_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promoter_applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"message" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"reviewed_by" integer,
	"review_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_payment_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"label" text NOT NULL,
	"account_type" text NOT NULL,
	"account_holder_name" text,
	"bank_name" text,
	"account_number" text,
	"ifsc_code" text,
	"branch_name" text,
	"upi_id" text,
	"crypto_symbol" text,
	"crypto_network" text,
	"wallet_address" text,
	"upi_qr_url" text,
	"wallet_qr_url" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_inbox" (
	"id" serial PRIMARY KEY NOT NULL,
	"external_message_id" text,
	"thread_id" text,
	"direction" text DEFAULT 'inbound' NOT NULL,
	"from_email" text NOT NULL,
	"from_name" text,
	"to_email" text NOT NULL,
	"subject" text NOT NULL,
	"body_text" text,
	"body_html" text,
	"category" text DEFAULT 'general' NOT NULL,
	"status" text DEFAULT 'unread' NOT NULL,
	"ticket_id" integer,
	"user_id" integer,
	"assigned_to_user_id" integer,
	"handled_by_user_id" integer,
	"priority" text DEFAULT 'medium' NOT NULL,
	"sla_due_at" timestamp with time zone,
	"first_response_at" timestamp with time zone,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "support_inbox_external_message_id_unique" UNIQUE("external_message_id")
);
--> statement-breakpoint
CREATE TABLE "support_mail_attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"message_id" integer,
	"uploaded_by_user_id" integer NOT NULL,
	"filename" text NOT NULL,
	"stored_filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_mail_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text DEFAULT 'general' NOT NULL,
	"subject" text,
	"body" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trusted_devices" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token_hash" text NOT NULL,
	"device_label" text NOT NULL,
	"browser" text,
	"ip_address" text,
	"user_agent" text,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"last_used_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trusted_devices_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "withdrawal_confirmations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token_hash" text NOT NULL,
	"payment_account_id" integer NOT NULL,
	"amount" text NOT NULL,
	"currency" text NOT NULL,
	"payment_method" text NOT NULL,
	"notes" text,
	"client_ip" text,
	"totp_verified_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "withdrawal_confirmations_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "partner_api_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"key_prefix" text NOT NULL,
	"key_hash" text NOT NULL,
	"scopes" text DEFAULT '[]' NOT NULL,
	"webhook_url" text,
	"webhook_secret" text,
	"webhook_events" text DEFAULT '[]',
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" integer,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "partner_api_keys_key_prefix_unique" UNIQUE("key_prefix")
);
--> statement-breakpoint
ALTER TABLE "agreement_events" ADD CONSTRAINT "agreement_events_agreement_id_agreements_id_fk" FOREIGN KEY ("agreement_id") REFERENCES "public"."agreements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agreement_events" ADD CONSTRAINT "agreement_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agreement_signatures" ADD CONSTRAINT "agreement_signatures_agreement_id_agreements_id_fk" FOREIGN KEY ("agreement_id") REFERENCES "public"."agreements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agreement_templates" ADD CONSTRAINT "agreement_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agreements" ADD CONSTRAINT "agreements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agreements" ADD CONSTRAINT "agreements_template_id_agreement_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."agreement_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_mail_attachments" ADD CONSTRAINT "support_mail_attachments_message_id_support_inbox_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."support_inbox"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "wallet_ledger_user_created_idx" ON "wallet_ledger" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "wallet_ledger_user_type_idx" ON "wallet_ledger" USING btree ("user_id","type");