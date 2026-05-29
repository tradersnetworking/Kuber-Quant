import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { authFetchJson } from "@/lib/token-store";
import { PERMISSION_LABELS, type PermissionKey } from "@/lib/staff-permissions";
import { Shield } from "lucide-react";

type RbacMatrix = {
  permissions: Array<{ key: string; name: string; category: string }>;
  roles: Record<string, PermissionKey[]>;
};

const EDITABLE_ROLES = ["admin", "support", "manager"] as const;

export function RbacManagementPanel() {
  const { toast } = useToast();
  const [matrix, setMatrix] = useState<RbacMatrix | null>(null);
  const [draft, setDraft] = useState<Record<string, Set<PermissionKey>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await authFetchJson<RbacMatrix>("/rbac");
      setMatrix(data);
      const next: Record<string, Set<PermissionKey>> = {};
      for (const role of EDITABLE_ROLES) {
        next[role] = new Set(data.roles[role] || []);
      }
      setDraft(next);
    } catch (err: any) {
      toast({ title: "Failed to load RBAC", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  const toggle = (role: string, key: PermissionKey) => {
    setDraft(prev => {
      const set = new Set(prev[role] || []);
      if (set.has(key)) set.delete(key);
      else set.add(key);
      return { ...prev, [role]: set };
    });
  };

  const saveRole = async (role: string) => {
    setSaving(role);
    try {
      await authFetchJson(`/rbac/${role}`, {
        method: "PUT",
        body: JSON.stringify({ permissions: [...(draft[role] || [])] }),
      });
      toast({ title: `${role} permissions updated` });
      await load();
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  const permissionKeys = (matrix?.permissions.map(p => p.key as PermissionKey) || Object.keys(PERMISSION_LABELS) as PermissionKey[]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-600" />
          Role Permissions (RBAC)
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Dynamic per-role permissions stored in the database. Super admin permissions are fixed.
        </p>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading permissions…</p>}

      {!loading && EDITABLE_ROLES.map(role => (
        <Card key={role}>
          <CardHeader>
            <CardTitle className="text-base capitalize">{role}</CardTitle>
            <CardDescription>Toggle permissions for the {role} role.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {permissionKeys.map(key => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={draft[role]?.has(key) ?? false}
                    onCheckedChange={() => toggle(role, key)}
                  />
                  {PERMISSION_LABELS[key] || key}
                </label>
              ))}
            </div>
            <Button size="sm" onClick={() => void saveRole(role)} disabled={saving === role}>
              Save {role}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
