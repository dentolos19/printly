using DotNetEnv;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace MocklyServer.Extensions;

public static class UtilityExtensions
{
    public static DbContextOptionsBuilder UseDatabase(this DbContextOptionsBuilder options)
    {
        // Load environment variables
        var databaseUrl = Env.GetString("DATABASE_URL");

        if (string.IsNullOrEmpty(databaseUrl))
        {
            // Use a local SQLite database for development
            options.UseNpgsql("Data Source=data.db");
        }
        else
        {
            // Use a remote PostgreSQL database for production
            var connectionInfo = new Uri(databaseUrl);
            var userInfo = connectionInfo.UserInfo.Split(':');

            options.UseNpgsql(
                new NpgsqlConnectionStringBuilder
                {
                    Host = connectionInfo.Host,
                    Port = connectionInfo.Port,
                    Username = userInfo[0],
                    Password = userInfo[1],
                    Database = connectionInfo.AbsolutePath.TrimStart('/'),
                    SslMode = SslMode.Require,
                    TrustServerCertificate = true,
                }.ConnectionString
            );
        }

        return options;
    }
}