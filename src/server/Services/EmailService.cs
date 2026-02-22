using Resend;

namespace PrintlyServer.Services;

public interface IEmailService
{
    Task SendUnreadDigestAsync(string toEmail, string userName, int unreadCount);
}

public class EmailService : IEmailService
{
    private readonly IResend _resend;
    private readonly ILogger<EmailService> _logger;
    private readonly string _fromEmail;

    public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
    {
        var apiKey =
            configuration["RESEND_API_KEY"] ?? throw new InvalidOperationException("RESEND_API_KEY not configured");

        _fromEmail = configuration["RESEND_FROM_EMAIL"] ?? "notifications@printly.app";
        _resend = ResendClient.Create(new ResendClientOptions { ApiToken = apiKey });
        _logger = logger;
    }

    public async Task SendUnreadDigestAsync(string toEmail, string userName, int unreadCount)
    {
        try
        {
            var displayName = string.IsNullOrWhiteSpace(userName) ? "there" : userName;

            var message = new EmailMessage
            {
                From = $"Printly <{_fromEmail}>",
                Subject = $"You have {unreadCount} unread notifications on Printly",
                HtmlBody =
                    $@"
                    <div style=""font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;"">
                        <div style=""text-align: center; margin-bottom: 32px;"">
                            <h1 style=""font-size: 24px; font-weight: 700; color: #111827; margin: 0;"">Printly</h1>
                        </div>

                        <p style=""font-size: 16px; color: #374151; margin-bottom: 16px;"">
                            Hey {displayName},
                        </p>

                        <p style=""font-size: 16px; color: #374151; margin-bottom: 24px;"">
                            You have <strong>{unreadCount} unread notifications</strong> waiting for you on Printly.
                            There might be messages, updates, or support replies that need your attention.
                        </p>

                        <div style=""text-align: center; margin: 32px 0;"">
                            <a href=""https://printly.app""
                               style=""display: inline-block; background-color: #2563eb; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 12px 32px; border-radius: 8px;"">
                                View Notifications
                            </a>
                        </div>

                        <hr style=""border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;"" />

                        <p style=""font-size: 12px; color: #9ca3af; text-align: center;"">
                            You received this email because you have unread notifications on Printly.
                            This is an automated digest and won't be sent again until you check your notifications.
                        </p>
                    </div>",
            };

            message.To.Add(toEmail);

            await _resend.EmailSendAsync(message);

            _logger.LogInformation(
                "[EmailService] Sent unread digest to {Email}, count: {Count}",
                toEmail,
                unreadCount
            );
        }
        catch (Exception ex)
        {
            // Don't let email failures break the notification flow
            _logger.LogError(ex, "[EmailService] Failed to send digest to {Email}", toEmail);
        }
    }
}
