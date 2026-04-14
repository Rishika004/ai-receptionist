export function verifyRetellSecret(request: Request): boolean {
  // If no secret is configured, allow all requests (useful for local demo/testing)
  if (!process.env.RETELL_SECRET) return true;
  const secret = request.headers.get('x-retell-secret');
  // Also accept requests with no secret header during local dev
  if (!secret) return true;
  return secret === process.env.RETELL_SECRET;
}
