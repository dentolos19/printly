using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace PrintlyServer.Extensions;

public static class UtilityExtensions
{
    public static string? GetUserId(this ClaimsPrincipal user)
    {
        return user.FindFirst("sub")?.Value ?? user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    }

    public static DbContextOptionsBuilder UseDatabase(this DbContextOptionsBuilder options)
    {
        var databaseUrl =
            Environment.GetEnvironmentVariable("DATABASE_URL")
            ?? throw new InvalidOperationException("DATABASE_URL environment variable is required.");

        databaseUrl = databaseUrl.TrimStart('"').TrimEnd('"');

        var connectionInfo = new Uri(databaseUrl);
        var userInfo = connectionInfo.UserInfo.Split(':');

        options.UseNpgsql(
            new NpgsqlConnectionStringBuilder
            {
                Host = connectionInfo.Host,
                Port = connectionInfo.Port > 0 ? connectionInfo.Port : 5432,
                Username = userInfo[0],
                Password = userInfo[1],
                Database = connectionInfo.AbsolutePath.TrimStart('/'),
                SslMode = SslMode.Require,
            }.ConnectionString
        );

        return options;
    }
}
