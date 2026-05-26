/** KYC document URL fields returned by the API (key → display label). */
export const KYC_DOCUMENT_FIELDS = [
  { key: "passportPhotoUrl", label: "Passport Size Photo" },
  { key: "idDocumentUrl", label: "ID Document" },
  { key: "passportDocumentUrl", label: "Passport Document" },
  { key: "panDocumentUrl", label: "PAN Document" },
  { key: "aadhaarFrontUrl", label: "Aadhaar Front" },
  { key: "aadhaarBackUrl", label: "Aadhaar Back" },
  { key: "addressProofUrl", label: "Address Proof" },
  { key: "selfieUrl", label: "Selfie Verification" },
  { key: "signatureUrl", label: "Signature" },
  { key: "cancelledChequeUrl", label: "Cancelled Cheque" },
] as const;

export type KycDocumentRecord = Partial<Record<(typeof KYC_DOCUMENT_FIELDS)[number]["key"], string | null>>;

export function listUploadedKycDocuments(kyc: KycDocumentRecord | null | undefined) {
  if (!kyc) return [];
  return KYC_DOCUMENT_FIELDS.filter(f => {
    const url = kyc[f.key as keyof KycDocumentRecord];
    return typeof url === "string" && url.length > 0;
  }).map(f => ({
    key: f.key,
    label: f.label,
    url: kyc[f.key as keyof KycDocumentRecord] as string,
  }));
}
