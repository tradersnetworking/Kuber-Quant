export interface AgreementTemplateContent {
  type: string;
  title: string;
  sections: Array<{ heading: string; body: string }>;
}

const NO_GUARANTEED_RETURNS = `Kuber Quant does not provide guaranteed returns, fixed income assurances, or assured profit schemes. All returns, profits, and distributions depend upon actual business performance, market conditions, operational activities, and associated risks. Past performance is not indicative of future results.`;

const RISK_DISCLOSURES = `The Investor acknowledges the following risks:
(a) Market Risk: Financial markets are subject to volatility, and the value of investments may decline.
(b) Operational Risk: Technology failures, system outages, or human error may adversely affect operations.
(c) Liquidity Risk: Investments may not be readily liquidated, and delays in withdrawal may occur.
(d) Technology Risk: Platform infrastructure is subject to maintenance, upgrades, or failures.
(e) Cybersecurity Risk: Despite security measures, no system is immune to cyber threats or data breaches.
(f) Regulatory Risk: Changes in law, regulation, or government policy may affect platform operations.
(g) Crypto Market Volatility: Cryptocurrency values are highly volatile and may result in complete loss of capital.
(h) Business Risk: Kuber Quant's business performance depends on market conditions outside its control.
(i) Third-Party Risk: Kuber Quant relies on brokers, payment processors, and technology providers whose failures may affect services.`;

const CRYPTO_DISCLOSURE = `Cryptocurrency Payment Acknowledgement:
(a) Blockchain transactions are irreversible once confirmed on the network.
(b) Network congestion may cause delays in transaction confirmation.
(c) Gas fees, network fees, and miner fees may apply and are non-refundable.
(d) Transactions sent to incorrect wallet addresses are permanently non-recoverable.
(e) The Investor is solely responsible for selecting the correct blockchain network and wallet address.
(f) Kuber Quant accepts no liability for funds lost due to user error in wallet/network selection.`;

const AML_KYC_CLAUSE = `AML/KYC Compliance:
(a) The Investor confirms that all funds invested are from lawful sources and not proceeds of any illegal activity.
(b) The Platform reserves the right to reject, freeze, or reverse suspicious transactions without prior notice.
(c) KYC verification is mandatory before any financial activity on the platform.
(d) The Platform may request additional identity or source-of-funds documentation at any time.
(e) The Platform conducts ongoing AML monitoring in compliance with applicable financial regulations.
(f) False or misleading KYC information may result in immediate account suspension and reporting to authorities.`;

const DATA_PRIVACY = `Data Privacy & Security:
(a) All personal data is encrypted using AES-256 encryption at rest and TLS 1.3 in transit.
(b) User data is stored securely on private servers with strict access controls.
(c) Only authorised personnel with a documented business need may access user information.
(d) Kuber Quant will not sell, rent, or share personal data with third parties except as required by law.
(e) Users have the right to request data access, correction, or deletion subject to regulatory obligations.
(f) The Platform complies with applicable Indian data protection laws and international best practices.`;

const FORCE_MAJEURE = `Force Majeure:
Kuber Quant shall not be liable for any failure or delay in performance arising from circumstances beyond its reasonable control, including but not limited to: government orders or regulatory restrictions, cyber attacks or data breaches by third parties, internet or telecommunications outages, exchange downtime or suspension, banking system failures or restrictions, blockchain network congestion or hard forks, natural disasters, pandemics, or acts of God. In such events, the Platform will communicate with users as soon as reasonably practicable.`;

const LIMITATION_OF_LIABILITY = `Limitation of Liability:
(a) Kuber Quant's total liability to the Investor for any claim shall not exceed the actual amount invested by the Investor in the relevant plan.
(b) The Platform shall not be liable for any indirect, consequential, incidental, special, or punitive damages.
(c) No liability is accepted for losses arising from third-party service failures including brokers, payment gateways, or custodians.
(d) The Platform makes no warranty of fitness for a particular purpose or uninterrupted service availability.`;

const DISPUTE_RESOLUTION = `Dispute Resolution:
(a) Any dispute arising from this Agreement shall first be attempted to be resolved through good-faith negotiation between the parties.
(b) If unresolved within 30 days, disputes shall be referred to binding arbitration under the Arbitration and Conciliation Act, 1996 (India).
(c) This Agreement shall be governed by and construed in accordance with the laws of India.
(d) The courts of competent jurisdiction shall be those located in India.
(e) Online dispute resolution support may be available through the platform's designated support system.`;

const INVESTOR_DETAILS_SECTION = `Investor Details (Auto-filled):
Full Name: {{FULL_NAME}}
Father's Name: {{FATHER_NAME}}
PAN Number: {{PAN_NUMBER}}
Aadhaar Number: {{AADHAAR_NUMBER}}
Passport Number: {{PASSPORT_NUMBER}}
Residential Address: {{ADDRESS}}
Mobile Number: {{MOBILE}}
Email Address: {{EMAIL}}
Investor ID: {{INVESTOR_ID}}
KYC Status: {{KYC_STATUS}}`;

const AGREEMENT_META = `Agreement Reference: {{AGREEMENT_UID}}
Agreement Date: {{AGREEMENT_DATE}}
IP Address: {{IP_ADDRESS}}
Device: {{DEVICE_INFO}}
Verification Hash: {{PDF_HASH}}`;

export const DEFAULT_TEMPLATES: AgreementTemplateContent[] = [
  {
    type: "investment",
    title: "KUBER QUANT PRIVATE INVESTMENT & PROFIT SHARING AGREEMENT",
    sections: [
      {
        heading: "PARTIES TO THE AGREEMENT",
        body: `This Investment Agreement ("Agreement") is entered into as of {{AGREEMENT_DATE}}, by and between:\n\nService Provider: Kuber Quant (hereinafter referred to as the "Platform", "Fund Manager", or "Service Provider")\n\nInvestor:\n${INVESTOR_DETAILS_SECTION}`,
      },
      {
        heading: "INVESTMENT PLAN DETAILS",
        body: `Investment Plan: {{PLAN_NAME}}
Investment Amount: {{INVESTMENT_AMOUNT}} {{CURRENCY}}
ROI Rate: {{ROI_RATE}}% per period
Duration: {{DURATION}} days
Start Date: {{START_DATE}}
Maturity Date: {{MATURITY_DATE}}
Transaction ID: {{TRANSACTION_ID}}
Wallet / Payment Reference: {{WALLET_ADDRESS}}`,
      },
      {
        heading: "ROI STRUCTURE & PROFIT SHARING",
        body: `The Platform will endeavour to generate returns based on the selected investment plan. ${NO_GUARANTEED_RETURNS}\n\nProfit Distribution: Profits, if any, will be credited to the Investor's platform wallet upon plan maturity. Profit sharing is subject to actual profitability and market conditions. The Platform reserves the right to modify ROI structures with 30-day notice.`,
      },
      {
        heading: "RISK ACKNOWLEDGEMENT",
        body: RISK_DISCLOSURES,
      },
      {
        heading: "CRYPTOCURRENCY PAYMENT DISCLOSURE",
        body: CRYPTO_DISCLOSURE,
      },
      {
        heading: "AML/KYC COMPLIANCE",
        body: AML_KYC_CLAUSE,
      },
      {
        heading: "DATA PRIVACY & SECURITY",
        body: DATA_PRIVACY,
      },
      {
        heading: "FORCE MAJEURE",
        body: FORCE_MAJEURE,
      },
      {
        heading: "LIMITATION OF LIABILITY",
        body: LIMITATION_OF_LIABILITY,
      },
      {
        heading: "DISPUTE RESOLUTION & GOVERNING LAW",
        body: DISPUTE_RESOLUTION,
      },
      {
        heading: "AGREEMENT METADATA",
        body: AGREEMENT_META,
      },
    ],
  },
  {
    type: "ea_subscription",
    title: "KUBER QUANT EA STRATEGY SUBSCRIPTION AGREEMENT",
    sections: [
      {
        heading: "PARTIES & SUBSCRIPTION DETAILS",
        body: `This EA Subscription Agreement is entered into as of {{AGREEMENT_DATE}} between Kuber Quant (Service Provider) and:\n\n${INVESTOR_DETAILS_SECTION}\n\nSubscription Plan: {{EA_PLAN}}\nEA Strategy: {{EA_NAME}}\nLicense Key: {{LICENSE_KEY}}\nMT4/MT5 Account: {{MT_ACCOUNT}}\nPlatform: {{MT_PLATFORM}}\nBroker Server: {{BROKER_SERVER}}\nSubscription Period: {{SUBSCRIPTION_DAYS}} days\nExpiry Date: {{EXPIRY_DATE}}\nSubscription Fee: {{SUBSCRIPTION_FEE}} USD`,
      },
      {
        heading: "EA SOFTWARE DISCLAIMER",
        body: `(a) Expert Advisors (EAs) are automated software tools designed to execute trading strategies and do not constitute financial advice.
(b) Past backtested or live performance of any EA does not guarantee future results.
(c) Trading in financial markets involves substantial risk of loss and may not be suitable for all investors.
(d) The Subscriber is responsible for ensuring their broker's conditions (spread, slippage, execution) are suitable for the EA.
(e) VPS, network connectivity, or power outages may affect EA performance and execution. The Platform accepts no liability for such interruptions.
(f) The Platform is not liable for broker execution delays, requotes, or slippage that affect EA trading results.
(g) The license is bound to the MT4/MT5 account number specified above and cannot be transferred.`,
      },
      {
        heading: "LICENSE TERMS",
        body: `The EA license is:
- Bound to MT4/MT5 account: {{MT_ACCOUNT}}
- Valid for: {{SUBSCRIPTION_DAYS}} days from activation
- Non-transferable and non-refundable after download
- Subject to deactivation upon subscription expiry or terms breach
- Protected by digital license verification technology`,
      },
      {
        heading: "RISK ACKNOWLEDGEMENT",
        body: RISK_DISCLOSURES,
      },
      {
        heading: "AML/KYC COMPLIANCE",
        body: AML_KYC_CLAUSE,
      },
      {
        heading: "LIMITATION OF LIABILITY",
        body: LIMITATION_OF_LIABILITY,
      },
      {
        heading: "DISPUTE RESOLUTION",
        body: DISPUTE_RESOLUTION,
      },
      {
        heading: "AGREEMENT METADATA",
        body: AGREEMENT_META,
      },
    ],
  },
  {
    type: "copy_trading",
    title: "KUBER QUANT COPY TRADING AGREEMENT",
    sections: [
      {
        heading: "PARTIES & COPY TRADING DETAILS",
        body: `This Copy Trading Agreement is entered into as of {{AGREEMENT_DATE}} between Kuber Quant (Service Provider) and:\n\n${INVESTOR_DETAILS_SECTION}\n\nMaster Trader / Strategy: {{TRADER_NAME}}\nMT4/MT5 Slave Account: {{MT_ACCOUNT}}\nPlatform: {{MT_PLATFORM}}\nBroker: {{BROKER_SERVER}}\nAllocation: {{INVESTMENT_AMOUNT}} {{CURRENCY}}\nCopy Ratio: {{COPY_RATIO}}`,
      },
      {
        heading: "COPY TRADING DISCLAIMER",
        body: `(a) Past performance of the master trader is not indicative of future results under copy trading.
(b) Trade execution may vary between the master and slave accounts due to broker differences, liquidity, and execution speed.
(c) Slippage and spread differences between brokers may affect copied trade results.
(d) Interruptions to the copy trading service may occur due to technology, network, or broker issues.
(e) Third-party copy trading services (including trade copier software/API) are involved and Kuber Quant is not liable for their technical failures.
(f) The Subscriber acknowledges that copy trading does not guarantee profits and losses may occur.`,
      },
      {
        heading: "RISK ACKNOWLEDGEMENT",
        body: RISK_DISCLOSURES,
      },
      {
        heading: "AML/KYC COMPLIANCE",
        body: AML_KYC_CLAUSE,
      },
      {
        heading: "CRYPTOCURRENCY PAYMENT DISCLOSURE",
        body: CRYPTO_DISCLOSURE,
      },
      {
        heading: "FORCE MAJEURE",
        body: FORCE_MAJEURE,
      },
      {
        heading: "LIMITATION OF LIABILITY",
        body: LIMITATION_OF_LIABILITY,
      },
      {
        heading: "DISPUTE RESOLUTION",
        body: DISPUTE_RESOLUTION,
      },
      {
        heading: "AGREEMENT METADATA",
        body: AGREEMENT_META,
      },
    ],
  },
  {
    type: "account_handling",
    title: "KUBER QUANT ACCOUNT HANDLING & MANAGEMENT AGREEMENT",
    sections: [
      {
        heading: "PARTIES & ACCOUNT DETAILS",
        body: `This Account Handling Agreement is entered into as of {{AGREEMENT_DATE}} between Kuber Quant (Service Provider) and:\n\n${INVESTOR_DETAILS_SECTION}\n\nMT4/MT5 Account: {{MT_ACCOUNT}}\nBroker: {{BROKER_SERVER}}\nPlatform: {{MT_PLATFORM}}\nProfit Sharing: {{PROFIT_SHARING}}%`,
      },
      {
        heading: "ACCOUNT HANDLING DISCLAIMER",
        body: `(a) The Investor voluntarily provides MT4/MT5 account credentials (investor password) to Kuber Quant solely for the purpose of trade management.
(b) Kuber Quant acts only as a service provider and trading manager and does not take ownership of the account or funds.
(c) Market losses may occur despite the Fund Manager's best efforts, and the Investor acknowledges this risk.
(d) The Investor acknowledges all trading risks associated with leveraged financial markets.
(e) Profit sharing is subject to actual net profitability and calculated after deducting trading costs, commissions, and applicable fees.
(f) The Investor retains the right to withdraw funds from the broker account at any time.
(g) The Fund Manager may cease management upon 7 days written notice by either party.`,
      },
      {
        heading: "PROFIT SHARING STRUCTURE",
        body: `${NO_GUARANTEED_RETURNS}\n\nProfit Share Arrangement:\n- Fund Manager Share: {{PROFIT_SHARING}}% of net profits\n- Investor Share: {{INVESTOR_SHARE}}% of net profits\n- Calculation Period: Monthly\n- Payout Method: Platform wallet or direct broker withdrawal`,
      },
      {
        heading: "RISK ACKNOWLEDGEMENT",
        body: RISK_DISCLOSURES,
      },
      {
        heading: "AML/KYC COMPLIANCE",
        body: AML_KYC_CLAUSE,
      },
      {
        heading: "DATA PRIVACY & SECURITY",
        body: DATA_PRIVACY,
      },
      {
        heading: "FORCE MAJEURE",
        body: FORCE_MAJEURE,
      },
      {
        heading: "LIMITATION OF LIABILITY",
        body: LIMITATION_OF_LIABILITY,
      },
      {
        heading: "DISPUTE RESOLUTION",
        body: DISPUTE_RESOLUTION,
      },
      {
        heading: "AGREEMENT METADATA",
        body: AGREEMENT_META,
      },
    ],
  },
  {
    type: "risk_disclosure",
    title: "KUBER QUANT COMPREHENSIVE RISK DISCLOSURE DOCUMENT",
    sections: [
      {
        heading: "INVESTOR ACKNOWLEDGEMENT",
        body: `This Risk Disclosure Document is acknowledged by:\n\n${INVESTOR_DETAILS_SECTION}\n\nDate: {{AGREEMENT_DATE}}`,
      },
      {
        heading: "COMPREHENSIVE RISK DISCLOSURES",
        body: RISK_DISCLOSURES,
      },
      {
        heading: "NO GUARANTEED RETURNS",
        body: NO_GUARANTEED_RETURNS,
      },
      {
        heading: "CRYPTOCURRENCY RISKS",
        body: CRYPTO_DISCLOSURE,
      },
      {
        heading: "REGULATORY RISK NOTICE",
        body: `Trading in financial instruments and cryptocurrencies may be restricted or regulated differently across jurisdictions. It is the Investor's responsibility to ensure they are legally permitted to participate in such activities in their country of residence. Kuber Quant reserves the right to restrict services in jurisdictions where such activities are prohibited.`,
      },
      {
        heading: "AGREEMENT METADATA",
        body: AGREEMENT_META,
      },
    ],
  },
  {
    type: "aml_kyc",
    title: "KUBER QUANT AML/KYC COMPLIANCE DECLARATION",
    sections: [
      {
        heading: "DECLARANT DETAILS",
        body: `This AML/KYC Declaration is submitted by:\n\n${INVESTOR_DETAILS_SECTION}\n\nKYC Documents Provided: {{KYC_DOCUMENTS}}\nKYC Verification Date: {{KYC_DATE}}\nVerification Status: {{KYC_STATUS}}`,
      },
      {
        heading: "SOURCE OF FUNDS DECLARATION",
        body: `The Declarant hereby confirms that:\n(a) All funds deposited or to be deposited on the Kuber Quant platform are derived from lawful sources.\n(b) The Declarant is the beneficial owner of all funds and is not acting as an agent or nominee for any third party.\n(c) The funds are not connected with any money laundering, terrorist financing, or other illegal activities.\n(d) The Declarant will promptly notify Kuber Quant of any change in circumstances that may affect this declaration.`,
      },
      {
        heading: "AML/KYC COMPLIANCE",
        body: AML_KYC_CLAUSE,
      },
      {
        heading: "DATA PRIVACY",
        body: DATA_PRIVACY,
      },
      {
        heading: "AGREEMENT METADATA",
        body: AGREEMENT_META,
      },
    ],
  },
  {
    type: "privacy_policy",
    title: "KUBER QUANT PRIVACY POLICY ACCEPTANCE",
    sections: [
      {
        heading: "USER ACKNOWLEDGEMENT",
        body: `This Privacy Policy Acceptance is acknowledged by:\n\n${INVESTOR_DETAILS_SECTION}\n\nDate: {{AGREEMENT_DATE}}`,
      },
      {
        heading: "DATA COLLECTION & USE",
        body: `Kuber Quant collects and processes personal data including identity information, financial data, transaction records, device information, and usage data for the purposes of providing investment services, KYC compliance, AML monitoring, and platform improvement.`,
      },
      {
        heading: "DATA PRIVACY & SECURITY",
        body: DATA_PRIVACY,
      },
      {
        heading: "USER RIGHTS",
        body: `Users have the right to:\n(a) Access their personal data held by Kuber Quant\n(b) Request correction of inaccurate data\n(c) Request deletion of data subject to legal obligations\n(d) Withdraw consent for data processing (subject to service impact)\n(e) Lodge a complaint with the relevant data protection authority`,
      },
      {
        heading: "AGREEMENT METADATA",
        body: AGREEMENT_META,
      },
    ],
  },
  {
    type: "terms_conditions",
    title: "KUBER QUANT TERMS & CONDITIONS ACCEPTANCE",
    sections: [
      {
        heading: "USER ACKNOWLEDGEMENT",
        body: `These Terms & Conditions are accepted by:\n\n${INVESTOR_DETAILS_SECTION}\n\nDate: {{AGREEMENT_DATE}}`,
      },
      {
        heading: "PLATFORM USAGE",
        body: `By using the Kuber Quant platform, you agree to:\n(a) Provide accurate and truthful information\n(b) Comply with all applicable laws in your jurisdiction\n(c) Not use the platform for any illegal purpose\n(d) Not attempt to manipulate, hack, or exploit the platform\n(e) Accept that services may be suspended or terminated for violation of these terms`,
      },
      {
        heading: "NO GUARANTEED RETURNS",
        body: NO_GUARANTEED_RETURNS,
      },
      {
        heading: "AML/KYC COMPLIANCE",
        body: AML_KYC_CLAUSE,
      },
      {
        heading: "LIMITATION OF LIABILITY",
        body: LIMITATION_OF_LIABILITY,
      },
      {
        heading: "FORCE MAJEURE",
        body: FORCE_MAJEURE,
      },
      {
        heading: "DISPUTE RESOLUTION",
        body: DISPUTE_RESOLUTION,
      },
      {
        heading: "AGREEMENT METADATA",
        body: AGREEMENT_META,
      },
    ],
  },
  {
    type: "withdrawal_policy",
    title: "KUBER QUANT WITHDRAWAL POLICY ACCEPTANCE",
    sections: [
      {
        heading: "USER ACKNOWLEDGEMENT",
        body: `This Withdrawal Policy is acknowledged by:\n\n${INVESTOR_DETAILS_SECTION}\n\nDate: {{AGREEMENT_DATE}}`,
      },
      {
        heading: "WITHDRAWAL TERMS",
        body: `(a) Withdrawal requests are processed within 3–7 business days subject to KYC verification and AML checks.\n(b) Minimum withdrawal amount applies as communicated on the platform.\n(c) Withdrawal fees and network fees may apply for cryptocurrency withdrawals.\n(d) The Platform reserves the right to request source-of-funds documentation before processing large withdrawals.\n(e) Withdrawals may be delayed or suspended in cases of suspicious activity, regulatory requirements, or technical issues.\n(f) The Investor is solely responsible for providing correct withdrawal wallet addresses or bank details.`,
      },
      {
        heading: "CRYPTOCURRENCY PAYMENT DISCLOSURE",
        body: CRYPTO_DISCLOSURE,
      },
      {
        heading: "AML/KYC COMPLIANCE",
        body: AML_KYC_CLAUSE,
      },
      {
        heading: "FORCE MAJEURE",
        body: FORCE_MAJEURE,
      },
      {
        heading: "AGREEMENT METADATA",
        body: AGREEMENT_META,
      },
    ],
  },
  {
    type: "profit_sharing",
    title: "KUBER QUANT PROFIT SHARING AGREEMENT",
    sections: [
      {
        heading: "PARTIES & PROFIT SHARING DETAILS",
        body: `This Profit Sharing Agreement is entered into as of {{AGREEMENT_DATE}} between Kuber Quant (Fund Manager) and:\n\n${INVESTOR_DETAILS_SECTION}\n\nInvestment Amount: {{INVESTMENT_AMOUNT}} {{CURRENCY}}\nROI Plan: {{PLAN_NAME}}\nExpected ROI: {{ROI_RATE}}% per period\nProfit Share to Fund Manager: {{PROFIT_SHARING}}%\nProfit Share to Investor: {{INVESTOR_SHARE}}%`,
      },
      {
        heading: "PROFIT DISTRIBUTION",
        body: `${NO_GUARANTEED_RETURNS}\n\nProfit distributions, if any, shall be:\n(a) Calculated based on actual net returns after deducting all fees and costs\n(b) Credited to the Investor's platform wallet within 7 business days of plan maturity\n(c) Reported transparently through the platform dashboard\n(d) Subject to applicable tax obligations of the Investor's jurisdiction`,
      },
      {
        heading: "RISK ACKNOWLEDGEMENT",
        body: RISK_DISCLOSURES,
      },
      {
        heading: "AML/KYC COMPLIANCE",
        body: AML_KYC_CLAUSE,
      },
      {
        heading: "CRYPTOCURRENCY PAYMENT DISCLOSURE",
        body: CRYPTO_DISCLOSURE,
      },
      {
        heading: "LIMITATION OF LIABILITY",
        body: LIMITATION_OF_LIABILITY,
      },
      {
        heading: "DISPUTE RESOLUTION",
        body: DISPUTE_RESOLUTION,
      },
      {
        heading: "AGREEMENT METADATA",
        body: AGREEMENT_META,
      },
    ],
  },
];

export function getDefaultTemplate(type: string): AgreementTemplateContent | undefined {
  return DEFAULT_TEMPLATES.find(t => t.type === type);
}
