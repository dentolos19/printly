using EnterpriseServer.Auth;
using Microsoft.EntityFrameworkCore;

namespace EnterpriseServer.Extensions;

public static class ServiceExtensions
{

    /// <summary>
    /// Lets the backend server know that the custom roles exist
    /// </summary>
    public static IServiceCollection AddAuthPolicies(this IServiceCollection services) {
        services.AddAuthorization(options =>
        {
            // Role-based policies
            options.AddPolicy(Policies.AdminOnly, policy =>
                policy.RequireRole(Roles.Admin));

            options.AddPolicy(Policies.LoggedIn, policy =>
                policy.RequireRole(Roles.Admin, Roles.User));
        });

        return services;
    }

    public static IServiceCollection AddDb(this IServiceCollection services, IWebHostEnvironment builderEnvironment)
    {
        if (builderEnvironment.IsProduction())
        {
            // Dennise do your thing here i guess
        }

        services.AddDbContext<AppDbContext>(options => options.UseSqlite("Data Source=data.db"));

        return services;
    }

    static string ConvertPostgresUrlToConnectionString(string url)
    {
        var uri = new Uri(url);
        var userInfo = uri.UserInfo.Split(':');
        return
            $"Host={uri.Host};Database={uri.AbsolutePath.TrimStart('/')};Username={userInfo[0]};Password={userInfo[1]};Ssl Mode=Require;Trust Server Certificate=true;";
    }
}