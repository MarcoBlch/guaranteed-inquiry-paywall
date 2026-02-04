/**
 * Invitation Email Template Generator
 *
 * Generates HTML and plain text email templates for sending invitation codes
 * to waitlist users. Matches existing FASTPASS email branding.
 */

export interface InvitationEmailData {
  recipientEmail: string;
  inviteCode: string;
  signupUrl: string; // Full URL with pre-filled code
}

/**
 * Generates HTML email template for invitation code distribution
 */
export function generateInvitationEmailTemplate(data: InvitationEmailData): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to FastPass Beta!</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4;">
        <tr>
            <td align="center" style="padding: 20px;">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">

                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">FASTPASS</h1>
                            <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 14px;">You're Invited to Join Beta</p>
                        </td>
                    </tr>

                    <!-- Welcome Banner -->
                    <tr>
                        <td style="background-color: #e8f5e8; padding: 15px; text-align: center; border-left: 4px solid #28a745;">
                            <p style="margin: 0; color: #155724; font-weight: bold;">
                                🎉 Welcome to FastPass Beta - Your Invitation is Ready!
                            </p>
                        </td>
                    </tr>

                    <!-- Main Content -->
                    <tr>
                        <td style="padding: 30px;">
                            <h2 style="color: #333; margin: 0 0 20px 0; font-size: 20px;">Welcome to the Future of Email</h2>

                            <p style="margin: 0 0 20px 0; color: #555; font-size: 16px;">
                                Thanks for your interest in FastPass! We're excited to invite you to join our beta as a <strong>Founder member</strong>.
                            </p>

                            <!-- Invitation Code Box -->
                            <div style="background-color: #f8f9fa; padding: 25px; border-radius: 8px; border: 2px solid #667eea; margin: 25px 0; text-align: center;">
                                <p style="margin: 0 0 10px 0; font-weight: bold; color: #666; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Your Invitation Code</p>
                                <div style="background-color: #667eea; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 15px 25px; border-radius: 6px; display: inline-block; margin: 10px 0;">
                                    <p style="margin: 0; color: #ffffff !important; font-size: 24px; font-weight: bold; letter-spacing: 3px; font-family: 'Courier New', monospace;">
                                        ${data.inviteCode}
                                    </p>
                                </div>
                                <p style="margin: 10px 0 0 0; font-size: 12px; color: #999;">Copy this code or use the button below</p>
                            </div>

                            <!-- CTA Button -->
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="${data.signupUrl}" target="_blank" style="background-color: #667eea; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff !important; text-decoration: none; padding: 15px 40px; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
                                    Get Started Now →
                                </a>
                            </div>

                            <!-- What's Next Section -->
                            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; border-left: 4px solid #667eea; margin: 25px 0;">
                                <h3 style="color: #333; margin: 0 0 15px 0; font-size: 18px;">What's Next:</h3>
                                <ul style="margin: 0; padding: 0 0 0 20px; color: #555;">
                                    <li style="margin: 8px 0;">Create your profile and set your response rate</li>
                                    <li style="margin: 8px 0;">Start monetizing your inbox attention</li>
                                    <li style="margin: 8px 0;">Enjoy Founder benefits: Priority support and exclusive features</li>
                                </ul>
                            </div>

                            <!-- Founder Perks -->
                            <div style="margin: 25px 0;">
                                <h3 style="color: #333; margin: 0 0 15px 0; font-size: 18px;">🌟 Founder Member Benefits:</h3>
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td style="padding: 10px 0; vertical-align: top; width: 40px;">
                                            <span style="color: #28a745; font-size: 20px;">✓</span>
                                        </td>
                                        <td style="padding: 10px 0; color: #555;">
                                            Early access to new features
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 10px 0; vertical-align: top;">
                                            <span style="color: #28a745; font-size: 20px;">✓</span>
                                        </td>
                                        <td style="padding: 10px 0; color: #555;">
                                            Lifetime preferential rates
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 10px 0; vertical-align: top;">
                                            <span style="color: #28a745; font-size: 20px;">✓</span>
                                        </td>
                                        <td style="padding: 10px 0; color: #555;">
                                            Direct influence on product roadmap
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 10px 0; vertical-align: top;">
                                            <span style="color: #28a745; font-size: 20px;">✓</span>
                                        </td>
                                        <td style="padding: 10px 0; color: #555;">
                                            Exclusive Founder badge and recognition
                                        </td>
                                    </tr>
                                </table>
                            </div>

                            <!-- Help Text -->
                            <div style="margin: 25px 0; padding: 15px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
                                <p style="margin: 0; color: #856404; font-size: 14px;">
                                    <strong>Questions?</strong> Simply reply to this email and we'll get back to you quickly.
                                </p>
                            </div>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e9ecef;">
                            <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">
                                This invitation was sent to <strong>${data.recipientEmail}</strong>
                            </p>
                            <p style="margin: 0; color: #999; font-size: 12px;">
                                © 2026 FASTPASS. All rights reserved.
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
  `.trim();
}

/**
 * Generates plain text email for invitation code distribution
 */
export function generateInvitationEmailPlainText(data: InvitationEmailData): string {
  return `
FASTPASS - You're Invited to Join Beta!

🎉 Welcome to FastPass Beta - Your Invitation is Ready!

Hi there!

Thanks for your interest in FastPass! We're excited to invite you to join our beta as a Founder member.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR INVITATION CODE:

${data.inviteCode}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GET STARTED:
Click here to create your account with this code pre-filled:
${data.signupUrl}

Or visit: https://fastpass.email/auth
And enter your invitation code: ${data.inviteCode}

WHAT'S NEXT:
• Create your profile and set your response rate
• Start monetizing your inbox attention
• Enjoy Founder benefits: Priority support and exclusive features

🌟 FOUNDER MEMBER BENEFITS:
✓ Early access to new features
✓ Lifetime preferential rates
✓ Direct influence on product roadmap
✓ Exclusive Founder badge and recognition

QUESTIONS?
Simply reply to this email and we'll get back to you quickly.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This invitation was sent to: ${data.recipientEmail}

© 2026 FASTPASS. All rights reserved.
  `.trim();
}

/**
 * Helper function to generate complete email data with signup URL
 */
export function prepareInvitationEmailData(
  recipientEmail: string,
  inviteCode: string,
  baseUrl: string = 'https://fastpass.email'
): InvitationEmailData {
  const signupUrl = `${baseUrl}/auth?invite_code=${encodeURIComponent(inviteCode)}`;

  return {
    recipientEmail,
    inviteCode,
    signupUrl
  };
}
