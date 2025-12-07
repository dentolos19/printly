using DotNetEnv;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace PrintlyServer.Extensions;

public static class UtilityExtensions
{
    public static DbContextOptionsBuilder UseDatabase(this DbContextOptionsBuilder options)
    {
        // Load environment variables
        var databaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL");

        if (string.IsNullOrEmpty(databaseUrl))
        {
            // Use a local SQLite database for development
            options.UseSqlite("Data Source=data.db");
        }
        else
        {
            // Removes surrounding quotes if present
            databaseUrl = databaseUrl.TrimStart('"').TrimEnd('"');

            // Break down the connection string
            var connectionInfo = new Uri(databaseUrl);
            var userInfo = connectionInfo.UserInfo.Split(':');

            // Use a remote PostgreSQL database for production
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
        }

        return options;
    }
}