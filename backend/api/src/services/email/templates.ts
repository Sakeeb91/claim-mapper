/**
 * Email Templates
 *
 * Branded HTML email templates with responsive design.
 * All templates include:
 * - Dark mode support
 * - Mobile-responsive layout
 * - Plain text fallback generation
 */

import {
  PasswordResetEmailData,
  InvitationEmailData,
  WelcomeEmailData,
  CollaborationEmailData,
} from './types';

// Brand colors
const COLORS = {
  primary: '#3B82F6', // Blue-500
  primaryDark: '#2563EB', // Blue-600
  background: '#F9FAFB', // Gray-50
  cardBg: '#FFFFFF',
  text: '#1F2937', // Gray-800
  textSecondary: '#6B7280', // Gray-500
  border: '#E5E7EB', // Gray-200
  success: '#10B981', // Emerald-500
  warning: '#F59E0B', // Amber-500
  error: '#EF4444', // Red-500
};

/**
 * Base email template wrapper
 */
const baseTemplate = (content: string, preheader?: string): string => `
<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
  <meta charset="utf-8">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no, url=no">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings xmlns:o="urn:schemas-microsoft-com:office:office">
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <style>
    td,th,div,p,a,h1,h2,h3,h4,h5,h6 {font-family: "Segoe UI", sans-serif; mso-line-height-rule: exactly;}
  </style>
  <![endif]-->
  <style>
    :root {
      color-scheme: light dark;
    }

    @media (prefers-color-scheme: dark) {
      .email-bg { background-color: #1F2937 !important; }
      .card-bg { background-color: #374151 !important; }
      .text-primary { color: #F9FAFB !important; }
      .text-secondary { color: #D1D5DB !important; }
    }

    @media screen and (max-width: 600px) {
      .email-container { width: 100% !important; padding: 16px !important; }
      .email-content { padding: 24px 16px !important; }
      .button { padding: 14px 24px !important; }
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      padding: 0;
      width: 100%;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }

    .button:hover {
      background-color: ${COLORS.primaryDark} !important;
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${COLORS.background};" class="email-bg">
  ${preheader ? `<div style="display: none; max-height: 0; overflow: hidden;">${preheader}</div>` : ''}
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: ${COLORS.background};" class="email-bg">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="email-container" style="max-width: 600px; width: 100%;">
          <!-- Logo Header -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 24px; font-weight: 700; color: ${COLORS.primary};">
                    Claim Mapper
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Card -->
          <tr>
            <td>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: ${COLORS.cardBg}; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);" class="card-bg">
                <tr>
                  <td class="email-content" style="padding: 40px;">
                    ${content}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top: 24px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 12px; color: ${COLORS.textSecondary}; text-align: center;" class="text-secondary">
                    <p style="margin: 0 0 8px 0;">
                      This email was sent by Claim Mapper
                    </p>
                    <p style="margin: 0;">
                      &copy; ${new Date().getFullYear()} Claim Mapper. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

/**
 * Render a primary CTA button
 */
const renderButton = (text: string, url: string): string => `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 24px 0;">
  <tr>
    <td>
      <a href="${url}"
         class="button"
         style="display: inline-block; background-color: ${COLORS.primary}; color: #FFFFFF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; text-align: center;">
        ${text}
      </a>
    </td>
  </tr>
</table>
`;

/**
 * Render a secondary/muted text block
 */
const renderSecondaryText = (text: string): string => `
<p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; color: ${COLORS.textSecondary}; margin: 16px 0; line-height: 1.6;" class="text-secondary">
  ${text}
</p>
`;

/**
 * Password Reset Email Template
 */
export const renderPasswordResetEmail = (data: PasswordResetEmailData): string => {
  const content = `
    <h1 style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 24px; font-weight: 700; color: ${COLORS.text}; margin: 0 0 16px 0;" class="text-primary">
      Password Reset Request
    </h1>

    <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 16px; color: ${COLORS.text}; margin: 0 0 16px 0; line-height: 1.6;" class="text-primary">
      Hi ${data.userName},
    </p>

    <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 16px; color: ${COLORS.text}; margin: 0 0 24px 0; line-height: 1.6;" class="text-primary">
      We received a request to reset your password for your Claim Mapper account. Click the button below to create a new password:
    </p>

    ${renderButton('Reset Password', data.resetUrl)}

    ${renderSecondaryText(`This link will expire in ${data.expiresIn}.`)}

    <hr style="border: none; border-top: 1px solid ${COLORS.border}; margin: 24px 0;">

    ${renderSecondaryText("If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.")}

    ${data.ipAddress ? renderSecondaryText(`Request details: IP ${data.ipAddress}${data.userAgent ? `, ${data.userAgent}` : ''}`) : ''}

    <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; color: ${COLORS.textSecondary}; margin: 16px 0 0 0; line-height: 1.6;" class="text-secondary">
      If the button doesn't work, copy and paste this URL into your browser:<br>
      <a href="${data.resetUrl}" style="color: ${COLORS.primary}; word-break: break-all;">${data.resetUrl}</a>
    </p>
  `;

  return baseTemplate(content, 'Reset your Claim Mapper password');
};

/**
 * Project Invitation Email Template
 */
export const renderInvitationEmail = (data: InvitationEmailData): string => {
  const roleLabel = data.role.charAt(0).toUpperCase() + data.role.slice(1);

  const content = `
    <h1 style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 24px; font-weight: 700; color: ${COLORS.text}; margin: 0 0 16px 0;" class="text-primary">
      You're Invited!
    </h1>

    <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 16px; color: ${COLORS.text}; margin: 0 0 24px 0; line-height: 1.6;" class="text-primary">
      <strong>${data.inviterName}</strong> has invited you to collaborate on <strong>"${data.projectName}"</strong> as a <strong>${roleLabel}</strong>.
    </p>

    ${data.message ? `
    <div style="background-color: ${COLORS.background}; border-left: 4px solid ${COLORS.primary}; padding: 16px; margin: 0 0 24px 0; border-radius: 0 8px 8px 0;">
      <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; color: ${COLORS.text}; margin: 0; font-style: italic; line-height: 1.6;" class="text-primary">
        "${data.message}"
      </p>
    </div>
    ` : ''}

    ${renderButton('Accept Invitation', data.inviteUrl)}

    ${data.expiresIn ? renderSecondaryText(`This invitation will expire in ${data.expiresIn}.`) : ''}

    <hr style="border: none; border-top: 1px solid ${COLORS.border}; margin: 24px 0;">

    <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; color: ${COLORS.textSecondary}; margin: 0; line-height: 1.6;" class="text-secondary">
      <strong>What you can do as ${roleLabel}:</strong>
    </p>
    <ul style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; color: ${COLORS.textSecondary}; margin: 8px 0 0 0; padding-left: 20px; line-height: 1.8;" class="text-secondary">
      ${data.role === 'viewer' ? '<li>View claims, evidence, and reasoning chains</li><li>Export project data</li>' : ''}
      ${data.role === 'editor' ? '<li>Create and edit claims and evidence</li><li>Build reasoning chains</li><li>Export project data</li>' : ''}
      ${data.role === 'admin' ? '<li>Full editing permissions</li><li>Invite and manage collaborators</li><li>Configure project settings</li>' : ''}
    </ul>

    <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; color: ${COLORS.textSecondary}; margin: 16px 0 0 0; line-height: 1.6;" class="text-secondary">
      If the button doesn't work, copy and paste this URL into your browser:<br>
      <a href="${data.inviteUrl}" style="color: ${COLORS.primary}; word-break: break-all;">${data.inviteUrl}</a>
    </p>
  `;

  return baseTemplate(content, `${data.inviterName} invited you to collaborate on "${data.projectName}"`);
};

/**
 * Welcome Email Template
 */
export const renderWelcomeEmail = (data: WelcomeEmailData): string => {
  const content = `
    <h1 style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 24px; font-weight: 700; color: ${COLORS.text}; margin: 0 0 16px 0;" class="text-primary">
      Welcome to Claim Mapper!
    </h1>

    <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 16px; color: ${COLORS.text}; margin: 0 0 16px 0; line-height: 1.6;" class="text-primary">
      Hi ${data.userName},
    </p>

    <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 16px; color: ${COLORS.text}; margin: 0 0 24px 0; line-height: 1.6;" class="text-primary">
      Thanks for joining Claim Mapper! We're excited to help you organize, analyze, and visualize your claims and evidence.
    </p>

    ${data.verifyUrl ? `
    <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 16px; color: ${COLORS.text}; margin: 0 0 24px 0; line-height: 1.6;" class="text-primary">
      Please verify your email address to get started:
    </p>
    ${renderButton('Verify Email', data.verifyUrl)}
    ` : renderButton('Get Started', data.loginUrl)}

    <hr style="border: none; border-top: 1px solid ${COLORS.border}; margin: 24px 0;">

    <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; color: ${COLORS.textSecondary}; margin: 0 0 12px 0; line-height: 1.6;" class="text-secondary">
      <strong>Here's what you can do with Claim Mapper:</strong>
    </p>
    <ul style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; color: ${COLORS.textSecondary}; margin: 0 0 16px 0; padding-left: 20px; line-height: 1.8;" class="text-secondary">
      <li>Create and organize claims with supporting evidence</li>
      <li>Build visual reasoning chains</li>
      <li>Collaborate with your team in real-time</li>
      <li>Analyze arguments with AI-powered insights</li>
    </ul>

    ${renderSecondaryText("If you have any questions, just reply to this email. We're here to help!")}
  `;

  return baseTemplate(content, 'Welcome to Claim Mapper - Get started with your first project');
};

/**
 * Collaboration Notification Email Template
 */
export const renderCollaborationEmail = (data: CollaborationEmailData): string => {
  const content = `
    <h1 style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 24px; font-weight: 700; color: ${COLORS.text}; margin: 0 0 16px 0;" class="text-primary">
      Project Update
    </h1>

    <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 16px; color: ${COLORS.text}; margin: 0 0 24px 0; line-height: 1.6;" class="text-primary">
      <strong>${data.actorName}</strong> ${data.action} a ${data.itemType}: <strong>"${data.itemName}"</strong> in <strong>${data.projectName}</strong>.
    </p>

    ${renderButton('View Project', data.projectUrl)}

    ${renderSecondaryText("You're receiving this because you're a collaborator on this project.")}
  `;

  return baseTemplate(content, `${data.actorName} ${data.action} in ${data.projectName}`);
};

/**
 * Unsubscribe confirmation email
 */
export const renderUnsubscribeEmail = (userName: string): string => {
  const content = `
    <h1 style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 24px; font-weight: 700; color: ${COLORS.text}; margin: 0 0 16px 0;" class="text-primary">
      Unsubscribed Successfully
    </h1>

    <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 16px; color: ${COLORS.text}; margin: 0 0 24px 0; line-height: 1.6;" class="text-primary">
      Hi ${userName},
    </p>

    <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 16px; color: ${COLORS.text}; margin: 0 0 24px 0; line-height: 1.6;" class="text-primary">
      You've been unsubscribed from Claim Mapper email notifications. You'll no longer receive collaboration updates or digests.
    </p>

    ${renderSecondaryText("You'll still receive essential account emails like password resets.")}
    ${renderSecondaryText("You can re-enable notifications anytime in your account settings.")}
  `;

  return baseTemplate(content, 'You have been unsubscribed from Claim Mapper notifications');
};
