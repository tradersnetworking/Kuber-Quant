import { useState } from "react";
import { useGetKyc } from "@workspace/api-client-react";
import { getStoredToken } from "@/lib/token-store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Circle, ShieldCheck, User, CreditCard, Building2, FileText, AlertCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CardFooter } from "@/components/ui/card";
import { PhoneCountryCodeSelect } from "@/components/forms/PhoneCountryCodeSelect";
import { DEFAULT_DIAL_CODE } from "@/lib/country-codes";
import { KycDocumentsList } from "@/components/kyc/KycDocumentsList";

export default function KycPage() {
  const [submitting, setSubmitting] = useState(false);
  const [idDoc, setIdDoc] = useState<File | null>(null);
  const [addressProof, setAddressProof] = useState<File | null>(null);
  const [passportPhoto, setPassportPhoto] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);

  const { data: kyc, isLoading, refetch } = useGetKyc();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    fullName: "",
    address: "",
    country: "",
    phone: "",
    idType: "Aadhaar" as "Passport" | "Aadhaar" | "PAN" | "Driver's License",
    idNumber: "",
    panCard: "",
    aadhaarNumber: "",
    bankAccount: "",
    ifscCode: "",
    bankName: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("fullName", formData.fullName);
      fd.append("address", formData.address);
      fd.append("country", formData.country);
      fd.append("idType", formData.idType);
      fd.append("idNumber", formData.idNumber);
      fd.append("bankAccountNumber", formData.bankAccount);
      fd.append("bankName", formData.bankName);
      fd.append("ifscCode", formData.ifscCode);
      if (formData.panCard) fd.append("panCard", formData.panCard);
      if (formData.aadhaarNumber) fd.append("aadhaarNumber", formData.aadhaarNumber);
      if (idDoc) fd.append("idDocument", idDoc);
      if (addressProof) fd.append("addressProof", addressProof);
      if (passportPhoto) fd.append("passportPhoto", passportPhoto);
      if (selfie) fd.append("selfie", selfie);

      const token = getStoredToken();
      const res = await fetch("/api/kyc", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");

      toast({ title: "KYC Submitted", description: "Our team will review your application within 24-48 hours." });
      refetch();
    } catch (err: any) {
      toast({ title: "Submission Failed", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const steps = [
    { n: 1, title: "Personal", icon: User },
    { n: 2, title: "Identity", icon: CreditCard },
    { n: 3, title: "Banking", icon: Building2 },
    { n: 4, title: "Review", icon: FileText },
  ];

  if (isLoading) return (
    <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
);

  if (kyc && kyc.status !== 'rejected') {
    return (
      <div className="max-w-2xl mx-auto py-12">
          <Card className="bg-white/5 backdrop-blur-sm border-white/10 text-center py-12">
            <CardContent className="space-y-6">
              <div className="flex justify-center">
                {kyc.status === 'verified' ? (
                  <div className="h-20 w-20 rounded-full bg-green-500/20 flex items-center justify-center border-2 border-green-500/50">
                    <ShieldCheck className="h-10 w-10 text-green-500" />
                  </div>
                ) : (
                  <div className="h-20 w-20 rounded-full bg-amber-500/20 flex items-center justify-center border-2 border-amber-500/50 animate-pulse">
                    <Clock className="h-10 w-10 text-amber-500" />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">KYC Status: <span className="capitalize text-amber-500">{kyc.status}</span></h2>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  {kyc.status === 'verified' 
                    ? "Your account is fully verified. You can now enjoy all platform features with no limits." 
                    : "We have received your KYC application and it is currently under review by our compliance team."}
                </p>
              </div>
              <div className="pt-4 grid grid-cols-2 gap-4 max-w-md mx-auto">
                 <div className="p-3 bg-white/5 rounded-lg border border-white/10 text-left">
                    <p className="text-[10px] text-muted-foreground uppercase">Reference ID</p>
                    <p className="text-sm font-mono truncate">{kyc.id}</p>
                 </div>
                 <div className="p-3 bg-white/5 rounded-lg border border-white/10 text-left">
                    <p className="text-[10px] text-muted-foreground uppercase">Submitted On</p>
                    <p className="text-sm">{new Date(kyc.createdAt).toLocaleDateString()}</p>
                 </div>
              </div>
              <div className="pt-6 max-w-lg mx-auto text-left">
                <h3 className="text-sm font-semibold mb-3 text-center">Your Uploaded Documents</h3>
                <KycDocumentsList kyc={kyc as any} />
              </div>
            </CardContent>
          </Card>
        </div>
);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent">Identity Verification</h1>
          <p className="text-muted-foreground mt-2">Complete your KYC to unlock full trading and withdrawal capabilities.</p>
        </div>

        {kyc?.status === 'rejected' && (
          <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
             <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
             <div className="space-y-1">
               <p className="text-sm font-bold text-red-400">Application Rejected</p>
               <p className="text-xs text-red-200/60">Reason: {kyc.rejectionReason || "Documents provided were not clear. Please resubmit."}</p>
             </div>
          </div>
        )}

        {/* Stepper */}
        <div className="flex justify-between relative px-2">
          <div className="absolute top-5 left-0 w-full h-[2px] bg-white/10 -z-10" />
          {steps.map((s) => (
            <div key={s.n} className="flex flex-col items-center gap-2">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all ${
                step >= s.n ? 'bg-amber-500 border-amber-500 text-black' : 'bg-[#050A14] border-white/20 text-muted-foreground'
              }`}>
                {step > s.n ? <CheckCircle2 className="h-6 w-6" /> : <s.icon className="h-5 w-5" />}
              </div>
              <span className={`text-[10px] uppercase font-bold tracking-wider ${step >= s.n ? 'text-amber-500' : 'text-muted-foreground'}`}>{s.title}</span>
            </div>
          ))}
        </div>

        <Card className="bg-white/5 backdrop-blur-sm border-white/10">
          <form onSubmit={handleSubmit}>
            <CardContent className="pt-6 space-y-4">
              {step === 1 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                  <div className="space-y-2">
                    <Label>Full Legal Name</Label>
                    <Input name="fullName" placeholder="As per ID document" value={formData.fullName} onChange={handleInputChange} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone Number</Label>
                    <div className="flex gap-2">
                      <PhoneCountryCodeSelect
                        value={formData.phone.match(/^\+\d+/)?.[0] || DEFAULT_DIAL_CODE}
                        onChange={code => {
                          const num = formData.phone.replace(/^\+\d+\s*/, "");
                          setFormData(prev => ({ ...prev, phone: `${code} ${num}` }));
                        }}
                      />
                      <Input
                        placeholder="9876543210"
                        value={formData.phone.replace(/^\+\d+\s*/, "")}
                        onChange={e => {
                          const code = formData.phone.match(/^\+\d+/)?.[0] || DEFAULT_DIAL_CODE;
                          setFormData(prev => ({ ...prev, phone: `${code} ${e.target.value}` }));
                        }}
                        required
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Country</Label>
                      <Input name="country" placeholder="United States" value={formData.country} onChange={handleInputChange} required />
                    </div>
                    <div className="space-y-2">
                      <Label>City / State</Label>
                      <Input name="address" placeholder="New York, NY" value={formData.address} onChange={handleInputChange} required />
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                  <div className="space-y-2">
                    <Label>Identification Type</Label>
                    <Select value={formData.idType} onValueChange={(v) => setFormData({...formData, idType: v as any})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Passport">Passport</SelectItem>
                        <SelectItem value="Aadhaar">Aadhaar Card</SelectItem>
                        <SelectItem value="PAN">PAN Card</SelectItem>
                        <SelectItem value="Driver's License">Driver's License</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>ID Document Number</Label>
                    <Input name="idNumber" placeholder="Enter ID number" value={formData.idNumber} onChange={handleInputChange} required />
                  </div>
                  <div className="space-y-3">
                    <div className="p-4 border border-dashed border-white/10 rounded-xl bg-white/5">
                      <Label className="text-xs text-muted-foreground">Passport Size Photo</Label>
                      <p className="text-[10px] text-muted-foreground mt-0.5 mb-2">Recent colour photo, white background, face clearly visible (35×45 mm style)</p>
                      <Input type="file" accept="image/*" className="mt-1 bg-white/5 border-white/10" required
                        onChange={e => setPassportPhoto(e.target.files?.[0] || null)} />
                    </div>
                    <div className="p-4 border border-dashed border-white/10 rounded-xl bg-white/5">
                      <Label className="text-xs text-muted-foreground">ID Document</Label>
                      <Input type="file" accept="image/*,.pdf" className="mt-1 bg-white/5 border-white/10"
                        onChange={e => setIdDoc(e.target.files?.[0] || null)} />
                    </div>
                    <div className="p-4 border border-dashed border-white/10 rounded-xl bg-white/5">
                      <Label className="text-xs text-muted-foreground">Address Proof</Label>
                      <Input type="file" accept="image/*,.pdf" className="mt-1 bg-white/5 border-white/10"
                        onChange={e => setAddressProof(e.target.files?.[0] || null)} />
                    </div>
                    <div className="p-4 border border-dashed border-white/10 rounded-xl bg-white/5">
                      <Label className="text-xs text-muted-foreground">Selfie (holding ID beside face)</Label>
                      <Input type="file" accept="image/*" className="mt-1 bg-white/5 border-white/10"
                        onChange={e => setSelfie(e.target.files?.[0] || null)} />
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                  <div className="space-y-2">
                    <Label>Bank Name</Label>
                    <Input name="bankName" placeholder="Global Chase Bank" value={formData.bankName} onChange={handleInputChange} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Account Number</Label>
                    <Input name="bankAccount" placeholder="0000 0000 0000" value={formData.bankAccount} onChange={handleInputChange} required />
                  </div>
                  <div className="space-y-2">
                    <Label>IFSC / SWIFT Code</Label>
                    <Input name="ifscCode" placeholder="GCHB000123" value={formData.ifscCode} onChange={handleInputChange} required />
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                  <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
                    <div>
                      <p className="text-muted-foreground">Full Name</p>
                      <p className="font-medium">{formData.fullName}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">ID Type</p>
                      <p className="font-medium">{formData.idType}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">ID Number</p>
                      <p className="font-medium">{formData.idNumber}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Bank Name</p>
                      <p className="font-medium">{formData.bankName}</p>
                    </div>
                  </div>
                  <div className="p-4 bg-amber-500/5 rounded-lg border border-amber-500/20">
                    <p className="text-xs text-amber-200/60 leading-relaxed">
                      By clicking submit, I confirm that all information provided is accurate and belongs to me. I understand that falsification of documents is a legal offense.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between border-t border-white/5 pt-6">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setStep(s => s - 1)} 
                disabled={step === 1}
              >
                Back
              </Button>
              {step < 4 ? (
                <Button type="button" className="bg-amber-500 text-black font-bold" onClick={() => setStep(s => s + 1)}>
                  Next Step
                </Button>
              ) : (
                <Button type="submit" className="bg-amber-500 text-black font-bold" disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit Application"}
                </Button>
              )}
            </CardFooter>
          </form>
        </Card>
      </div>
);
}
