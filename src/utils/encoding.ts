export function encodePasswordLikeKubeNova(password: string): string {
  return btoa(
    encodeURIComponent(password).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(Number.parseInt(p1, 16))
    )
  );
}
