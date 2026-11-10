export function getTabBarStyle(bottomInset: number) {
  const safeBottom = Math.max(0, bottomInset);

  return {
    height: 66 + safeBottom,
    paddingTop: 8,
    paddingBottom: 8 + safeBottom,
  };
}
