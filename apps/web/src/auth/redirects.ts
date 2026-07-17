export function frontendUrl(path: string): string {
  return new URL(path, window.location.origin).toString();
}

export function platformAuthPath(
  endpoint: 'login' | 'register' | 'google',
  returnTo: string,
): string {
  const url = new URL(`/api/auth/${endpoint}`, window.location.origin);
  url.searchParams.set('return_to', returnTo);

  return `${url.pathname}${url.search}`;
}

export function redirectToPlatformAuth(
  endpoint: 'login' | 'register' | 'google',
  returnTo: string,
) {
  window.location.assign(platformAuthPath(endpoint, returnTo));
}
