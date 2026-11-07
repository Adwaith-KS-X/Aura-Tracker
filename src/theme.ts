import { Platform, type ViewStyle } from 'react-native';

// Native continuous curves on iOS. Browsers with corner-shape support get a
// superellipse; other browsers and Android keep the same soft radius as fallback.
function rounded(radius: number): ViewStyle {
  return {
    borderRadius: radius,
    ...(Platform.OS === 'ios' ? { borderCurve: 'continuous' as const } : {}),
    ...(Platform.OS === 'web' ? { cornerShape: 'superellipse(1.5)' } : {}),
  };
}
export const corners = {
  card: rounded(28), input: rounded(14), button: rounded(16),
  segment: rounded(13), segmentItem: rounded(10), inset: rounded(18),
  modal: rounded(28), notice: rounded(16),
};
