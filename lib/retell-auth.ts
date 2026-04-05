export function verifyRetellSecret(request: Request): boolean {
  const secret = request.headers.get('x-retell-secret');
  return secret === process.env.RETELL_SECRET;
}
