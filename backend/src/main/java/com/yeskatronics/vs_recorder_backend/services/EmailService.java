package com.yeskatronics.vs_recorder_backend.services;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.ses.SesClient;
import software.amazon.awssdk.services.ses.model.*;

/**
 * Service class for sending emails via AWS SES.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final SesClient sesClient;

    @Value("${app.email.from:noreply@vsrecorder.app}")
    private String fromEmail;

    @Value("${app.email.from-name:VS Recorder}")
    private String fromName;

    @Value("${app.name:VS Recorder}")
    private String appName;

    /**
     * Send password reset email with reset link.
     */
    public void sendPasswordResetEmail(String toEmail, String username, String resetUrl) {
        String subject = appName + " - Password Reset Request";

        String htmlBody = buildPasswordResetHtmlEmail(username, resetUrl);
        String textBody = buildPasswordResetTextEmail(username, resetUrl);

        sendEmail(toEmail, subject, htmlBody, textBody);
        log.info("Password reset email sent to: {}***", maskEmail(toEmail));
    }

    /**
     * Send confirmation that password was changed.
     */
    public void sendPasswordChangedConfirmation(String toEmail, String username) {
        String subject = appName + " - Password Changed";

        String htmlBody = buildPasswordChangedHtmlEmail(username);
        String textBody = buildPasswordChangedTextEmail(username);

        sendEmail(toEmail, subject, htmlBody, textBody);
        log.info("Password changed confirmation sent to: {}***", maskEmail(toEmail));
    }

    private void sendEmail(String toEmail, String subject, String htmlBody, String textBody) {
        try {
            SendEmailRequest request = SendEmailRequest.builder()
                .source(fromName + " <" + fromEmail + ">")
                .destination(Destination.builder()
                    .toAddresses(toEmail)
                    .build())
                .message(Message.builder()
                    .subject(Content.builder()
                        .charset("UTF-8")
                        .data(subject)
                        .build())
                    .body(Body.builder()
                        .html(Content.builder()
                            .charset("UTF-8")
                            .data(htmlBody)
                            .build())
                        .text(Content.builder()
                            .charset("UTF-8")
                            .data(textBody)
                            .build())
                        .build())
                    .build())
                .build();

            sesClient.sendEmail(request);
        } catch (SesException e) {
            log.error("Failed to send email via SES: {}", e.getMessage());
            throw new RuntimeException("Failed to send email", e);
        }
    }

    private String maskEmail(String email) {
        if (email == null || email.length() < 3) {
            return "***";
        }
        return email.substring(0, Math.min(3, email.indexOf('@')));
    }

    private String buildPasswordResetHtmlEmail(String username, String resetUrl) {
        return """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;\s
                         line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%);\s
                            padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">VS Recorder</h1>
                </div>
                <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0;\s
                            border-top: none; border-radius: 0 0 10px 10px;">
                    <h2 style="color: #333; margin-top: 0;">Password Reset Request</h2>
                    <p>Hi %s,</p>
                    <p>We received a request to reset your password for your VS Recorder account.\s
                       Click the button below to set a new password:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="%s"\s
                           style="background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%);\s
                                  color: white; padding: 14px 30px; text-decoration: none;\s
                                  border-radius: 5px; font-weight: bold; display: inline-block;">
                            Reset Password
                        </a>
                    </div>
                    <p style="color: #666; font-size: 14px;">
                        This link will expire in <strong>1 hour</strong>.
                    </p>
                    <p style="color: #666; font-size: 14px;">
                        If you didn't request this password reset, you can safely ignore this email.\s
                        Your password will remain unchanged.
                    </p>
                    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
                    <p style="color: #999; font-size: 12px; text-align: center;">
                        If the button doesn't work, copy and paste this link into your browser:<br>
                        <a href="%s" style="color: #667eea; word-break: break-all;">%s</a>
                    </p>
                </div>
                <p style="color: #999; font-size: 12px; text-align: center; margin-top: 20px;">
                    VS Recorder - Pokemon VGC Replay Analysis
                </p>
            </body>
            </html>
            """.formatted(username, resetUrl, resetUrl, resetUrl);
    }

    private String buildPasswordResetTextEmail(String username, String resetUrl) {
        return """
            VS Recorder - Password Reset Request
           \s
            Hi %s,
           \s
            We received a request to reset your password for your VS Recorder account.
           \s
            Click the link below to set a new password:
            %s
           \s
            This link will expire in 1 hour.
           \s
            If you didn't request this password reset, you can safely ignore this email.\s
            Your password will remain unchanged.
           \s
            ---
            VS Recorder - Pokemon VGC Replay Analysis
            """.formatted(username, resetUrl);
    }

    private String buildPasswordChangedHtmlEmail(String username) {
        return """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;\s
                         line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%);\s
                            padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                    <h1 style="color: white; margin: 0;">VS Recorder</h1>
                </div>
                <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0;\s
                            border-top: none; border-radius: 0 0 10px 10px;">
                    <h2 style="color: #333;">Password Changed Successfully</h2>
                    <p>Hi %s,</p>
                    <p>Your VS Recorder password has been successfully changed.</p>
                    <p style="color: #666;">
                        If you did not make this change, please contact us immediately and\s
                        consider resetting your password again.
                    </p>
                </div>
            </body>
            </html>
            """.formatted(username);
    }

    private String buildPasswordChangedTextEmail(String username) {
        return """
            VS Recorder - Password Changed Successfully
           \s
            Hi %s,
           \s
            Your VS Recorder password has been successfully changed.
           \s
            If you did not make this change, please contact us immediately\s
            and consider resetting your password again.
           \s
            ---
            VS Recorder - Pokemon VGC Replay Analysis
            """.formatted(username);
    }
}
