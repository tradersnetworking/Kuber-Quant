import { Router } from "express";
import { requireAuth, requireSuperAdmin } from "../middlewares/auth";
import {
  getRbacMatrix,
  setRolePermissions,
} from "../helpers/rbacService";
import type { PermissionKey } from "../helpers/roleHierarchy";

const router = Router();

router.use(requireAuth, requireSuperAdmin);

router.get("/", async (_req, res) => {
  res.json(await getRbacMatrix());
});

router.put("/:role", async (req, res) => {
  const role = String(req.params.role);
  const { permissions } = req.body as { permissions?: string[] };

  if (!Array.isArray(permissions)) {
    res.status(400).json({ error: "permissions array is required" });
    return;
  }

  try {
    await setRolePermissions(role, permissions as PermissionKey[]);
    const matrix = await getRbacMatrix();
    res.json({ role, permissions: matrix.roles[role] || [] });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to update permissions" });
  }
});

export default router;
