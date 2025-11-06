using DotNetEnv;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace MocklyServer.Extensions;

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
            var connectionInfo = new Uri(databaseUrl);
            var userInfo = connectionInfo.UserInfo.Split(':');

            // Use a remote PostgreSQL database for production
            options.UseNpgsql(
                new NpgsqlConnectionStringBuilder
                {
                    Host = connectionInfo.Host,
                    Port = connectionInfo.Port,
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