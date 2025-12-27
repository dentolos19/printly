using System.Security.Claims;
using Microsoft.AspNetCore.SignalR;

namespace PrintlyServer.Providers;

/// <summary>
/// Custom user ID provider for SignalR that reads the "sub" claim from JWT.
/// With MapInboundClaims = false, the "sub" claim stays as "sub" (not mapped to URI).
/// </summary>
public class CustomUserIdProvider : IUserIdProvider
{
    public string? GetUserId(HubConnectionContext connection)
    {
        // With MapInboundClaims = false, "sub" stays as "sub"
        return connection.User?.FindFirst("sub")?.Value
            ?? connection.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    }
}
