import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { authFetchJson, apiPath } from "@/lib/token-store";
import { useUserAvatar } from "@/hooks/use-user-avatar";
import { Camera, Save, User, Loader2 } from "lucide-react";

type ProfileData = {
  user: {
    id: number;
    email: string;
    fullName: string;
    phone: string | null;
    role: string;
    kycStatus: string;
    avatarUrl: string | null;
    referralCode: string | null;
    investorId?: string | null;
  };
  profile: {
    username: string | null;
    dateOfBirth: string | null;
    gender: string | null;
    nationality: string | null;
    country: string | null;
    state: string | null;
    city: string | null;
    address: string | null;
    postalCode: string | null;
    occupation: string | null;
    investorId: string | null;
  } | null;
};

export function AccountProfilePanel() {
  const { toast } = useToast();
  const { user, login } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["/api/auth/profile"],
    queryFn: () => authFetchJson<ProfileData>("/auth/profile"),
  });

  const { data: kycData } = useQuery({
    queryKey: ["/api/kyc"],
    queryFn: () => authFetchJson<{ passportPhotoUrl?: string | null; status?: string }>("/kyc"),
  });

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    username: "",
    dateOfBirth: "",
    gender: "",
    nationality: "",
    country: "",
    state: "",
    city: "",
    address: "",
    postalCode: "",
    occupation: "",
  });

  useEffect(() => {
    if (!data) return;
    setForm({
      fullName: data.user.fullName || "",
      phone: data.user.phone || "",
      username: data.profile?.username || "",
      dateOfBirth: data.profile?.dateOfBirth || "",
      gender: data.profile?.gender || "",
      nationality: data.profile?.nationality || "",
      country: data.profile?.country || "",
      state: data.profile?.state || "",
      city: data.profile?.city || "",
      address: data.profile?.address || "",
      postalCode: data.profile?.postalCode || "",
      occupation: data.profile?.occupation || "",
    });
  }, [data]);

  useEffect(() => {
    if (data?.user.avatarUrl) {
      setProfilePhotoUrl(data.user.avatarUrl);
    }
  }, [data?.user.avatarUrl]);

  const avatarSrc = useUserAvatar(profilePhotoUrl || data?.user.avatarUrl || user?.avatarUrl, kycData?.passportPhotoUrl);
  const passportPhotoOnFile = !!kycData?.passportPhotoUrl;
  const hasPublicAvatar = !!(profilePhotoUrl || data?.user.avatarUrl || user?.avatarUrl);
  const investorId = data?.profile?.investorId;
  const initials = (data?.user.fullName || user?.fullName || "?").charAt(0).toUpperCase();

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await authFetchJson<ProfileData>("/auth/profile", {
        method: "PATCH",
        body: JSON.stringify(form),
      });
      qc.setQueryData(["/api/auth/profile"], updated);
      if (user && updated.user) {
        const token = localStorage.getItem("token") || "";
        login(token, { ...user, ...updated.user } as any);
      }
      toast({ title: "Profile saved", description: "Your account details have been updated." });
      refetch();
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const uploadAvatar = async (file: File) => {
    setUploading(true);
    try {
      const token = localStorage.getItem("token");
      const fd = new FormData();
      fd.append("avatar", file);
      const res = await fetch(apiPath("/auth/profile/avatar"), {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      const updated = await res.json();
      if (!res.ok) throw new Error(updated.error || "Upload failed");
      const nextAvatarUrl = updated.user?.avatarUrl || null;
      setProfilePhotoUrl(nextAvatarUrl);
      qc.setQueryData(["/api/auth/profile"], updated);
      qc.invalidateQueries({ queryKey: ["/api/kyc"] });
      if (user && updated.user) {
        login(token || "", { ...user, avatarUrl: nextAvatarUrl, ...updated.user } as any);
      }
      toast({ title: "Profile photo updated", description: "Your profile photo has been saved." });
      refetch();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const useKycPassportAsAvatar = async () => {
    setUploading(true);
    try {
      const updated = await authFetchJson<ProfileData>("/auth/profile/avatar/from-kyc", { method: "POST" });
      const nextAvatarUrl = updated.user?.avatarUrl || null;
      setProfilePhotoUrl(nextAvatarUrl);
      qc.setQueryData(["/api/auth/profile"], updated);
      if (user && updated.user) {
        const token = localStorage.getItem("token") || "";
        login(token, { ...user, ...updated.user } as any);
      }
      toast({ title: "Profile photo updated", description: "Your KYC passport photo is now your profile picture." });
      refetch();
    } catch (err: any) {
      toast({ title: "Could not use KYC photo", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10">
        <CardContent className="py-12 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-amber-600 dark:text-amber-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={saveProfile} className="space-y-6">
      <Card className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-amber-600 dark:text-amber-400" /> Profile & Identity
          </CardTitle>
          <CardDescription>
            Upload a profile photo from your camera or gallery, or use your KYC passport-size photo on file.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <div className="relative">
              <Avatar className="h-20 w-20 border-2 border-amber-500/30">
                {avatarSrc ? <AvatarImage src={avatarSrc} alt={form.fullName} key={avatarSrc} /> : null}
                <AvatarFallback className="bg-amber-500/10 text-amber-600 dark:text-amber-400 text-2xl font-bold">{initials}</AvatarFallback>
              </Avatar>
              <Button type="button" size="icon" variant="secondary"
                className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}>
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
              </Button>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); e.target.value = ""; }} />
            </div>
            <div className="flex-1 space-y-2">
              <p className="font-semibold text-lg">{form.fullName || data?.user.fullName}</p>
              <p className="text-sm text-muted-foreground">{data?.user.email}</p>
              <div className="flex flex-wrap gap-2">
                <Badge className="capitalize bg-muted dark:bg-white/10 border-border dark:border-white/10">{data?.user.role}</Badge>
                <Badge className="capitalize bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">{data?.user.kycStatus}</Badge>
                <Badge variant={passportPhotoOnFile ? "default" : "outline"} className="text-xs">
                  KYC passport photo: {passportPhotoOnFile ? "On file" : "Not submitted"}
                </Badge>
                {investorId && <Badge variant="outline" className="font-mono text-xs">ID: {investorId}</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">
                Click the camera icon to upload a new photo, or use your verified KYC passport photo below.
              </p>
              {passportPhotoOnFile && !hasPublicAvatar && (
                <Button type="button" size="sm" variant="outline" disabled={uploading} onClick={() => void useKycPassportAsAvatar()}>
                  Use KYC passport photo
                </Button>
              )}
              {passportPhotoOnFile && hasPublicAvatar && (
                <Button type="button" size="sm" variant="ghost" disabled={uploading} onClick={() => void useKycPassportAsAvatar()}>
                  Reset to KYC passport photo
                </Button>
              )}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Full Name</Label>
              <Input value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Phone</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" placeholder="+91..." />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Username</Label>
              <Input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value.toLowerCase() }))}
                className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" placeholder="optional" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Date of Birth</Label>
              <Input type="date" value={form.dateOfBirth} onChange={e => setForm(f => ({ ...f, dateOfBirth: e.target.value }))}
                className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Gender</Label>
              <Select value={form.gender || "unset"} onValueChange={v => setForm(f => ({ ...f, gender: v === "unset" ? "" : v }))}>
                <SelectTrigger className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unset">Not specified</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Occupation</Label>
              <Input value={form.occupation} onChange={e => setForm(f => ({ ...f, occupation: e.target.value }))}
                className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" />
            </div>
          </div>

          <div className="border-t border-border dark:border-white/10 pt-4">
            <p className="text-sm font-medium mb-3">Address</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs text-muted-foreground">Street Address</Label>
                <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">City</Label>
                <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                  className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">State / Province</Label>
                <Input value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
                  className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Country</Label>
                <Input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                  className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Postal Code</Label>
                <Input value={form.postalCode} onChange={e => setForm(f => ({ ...f, postalCode: e.target.value }))}
                  className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" />
              </div>
            </div>
          </div>

          <Button type="submit" disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-black font-bold">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Profile
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
