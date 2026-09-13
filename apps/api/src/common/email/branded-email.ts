const LOGO_URL =
  'https://www.aiit.network/assets/brand/azraa-institute-of-information-technology-official-logo-black.png';

export interface BrandedEmailInput {
  heading: string;
  intro: string;
  ctaLabel: string;
  ctaUrl: string;
  footerNote: string;
}

/**
 * Shared table-based layout for AIIT's branded transactional emails --
 * matches the Supabase Auth email templates pasted into the dashboard
 * (Authentication -> Emails -> Templates). Inline styles throughout,
 * deliberately: Outlook and many corporate mail clients strip <style>
 * blocks and don't support flexbox/grid, so this stays compatible
 * everywhere rather than looking right only in Gmail/Apple Mail.
 */
export function brandedEmailHtml({ heading, intro, ctaLabel, ctaUrl, footerNote }: BrandedEmailInput): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4efe7;padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border:1px solid rgba(20,17,15,0.12);border-radius:8px;">
            <tr>
              <td style="padding:36px 40px 24px;text-align:center;">
                <img
                  src="${LOGO_URL}"
                  alt="AIIT — Azraa Institute of Information Technology"
                  width="160"
                  style="display:block;margin:0 auto;border:0;max-width:160px;height:auto;"
                />
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px;">
                <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:22px;line-height:1.3;color:#14110f;font-weight:normal;text-align:center;">
                  ${heading}
                </h1>
                <p style="margin:0 0 24px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#14110f;text-align:center;">
                  ${intro}
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 32px;text-align:center;">
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                  <tr>
                    <td style="border-radius:6px;background-color:#9a7b4f;">
                      <a
                        href="${ctaUrl}"
                        style="display:inline-block;padding:13px 32px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#f4efe7;text-decoration:none;border-radius:6px;"
                      >
                        ${ctaLabel}
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 36px;">
                <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;line-height:1.6;color:#55504a;text-align:center;">
                  Button not working? Paste this link into your browser:
                </p>
                <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;line-height:1.6;color:#9a7b4f;text-align:center;word-break:break-all;">
                  <a href="${ctaUrl}" style="color:#9a7b4f;">${ctaUrl}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 40px;border-top:1px solid rgba(20,17,15,0.1);">
                <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11.5px;line-height:1.6;color:#8a837a;text-align:center;">
                  ${footerNote}
                </p>
              </td>
            </tr>
          </table>
          <p style="margin:20px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#8a837a;">
            AIIT — Azraa Institute of Information Technology · aiit.network
          </p>
        </td>
      </tr>
    </table>
  `;
}
