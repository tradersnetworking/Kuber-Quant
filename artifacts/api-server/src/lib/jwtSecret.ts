/** Single source of truth for JWT signing — must match between sign & verify. */
import { getSessionSecret } from "./env";

export const JWT_SECRET = getSessionSecret();
