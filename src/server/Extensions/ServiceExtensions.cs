using EnterpriseServer.Auth;

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
}