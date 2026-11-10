import { getTabBarStyle } from '../src/theme/layout';

describe('getTabBarStyle', () => {
  it('keeps the tab bar above the Android navigation area', () => {
    expect(getTabBarStyle(24)).toMatchObject({
      height: 90,
      paddingTop: 8,
      paddingBottom: 32,
    });
  });

  it('preserves the base tab bar size when there is no bottom inset', () => {
    expect(getTabBarStyle(0)).toMatchObject({
      height: 66,
      paddingTop: 8,
      paddingBottom: 8,
    });
  });
});
