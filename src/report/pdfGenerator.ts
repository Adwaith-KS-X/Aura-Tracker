import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import type { Profile } from '../account/profile';
import type { TrackerData } from '../domain';
import { generateReportHtml, type ReportRange } from './pdfTemplate';

export async function exportReportPdf(
  profile: Profile,
  data: TrackerData,
  range: ReportRange
): Promise<{ success: boolean; uri?: string; error?: string }> {
  try {
    const html = generateReportHtml(profile, data, range);

    if (Platform.OS === 'web') {
      // In web browser, print dialog triggers Save as PDF
      await Print.printAsync({ html });
      return { success: true };
    }

    // On native mobile (Android / iOS)
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
        dialogTitle: `Aura Tracker - ${range} Report (${profile.name})`,
      });
    }

    return { success: true, uri };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error generating PDF';
    console.error('PDF generation failed:', message);
    return { success: false, error: message };
  }
}
