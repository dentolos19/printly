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

            // Permission-based policies
            options.AddPolicy(Policies.CanManageUsers, policy =>
                policy.RequireClaim("permission", Claims.ManageUsers));

            options.AddPolicy(Policies.CanManageRoles, policy =>
                policy.RequireClaim("permission", Claims.ManageRoles));

            options.AddPolicy(Policies.CanEditProfile, policy =>
                policy.RequireClaim("permission", Claims.EditProfile));
        });

        return services;
    }
}