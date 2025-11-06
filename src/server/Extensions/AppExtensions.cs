using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using MocklyServer.Auth;
using MocklyServer.Middlewares;

namespace MocklyServer.Extensions;

public static class AppExtensions
{
    /// <summary>
    /// Setup middlewares for logging, etc.
    /// </summary>
    public static WebApplication SetupMiddlewares(this WebApplication app)
    {
        app.UseMiddleware<LoggingMiddleware>();
        return app;
    }

    /// <summary>
    /// Setup Cross-Origin Resource Sharing (CORS) to allow our app to access this server
    /// </summary>
    public static WebApplication SetupCors(this WebApplication app)
    {
        app.UseCors("AllowAll");
        return app;
    }

    /// <summary>
    /// Setup authentication and authorization using JWT and Identity
    /// </summary>
    public static WebApplication SetupAuth(this WebApplication app)
    {
        app.UseAuthentication();
        app.UseAuthorization();
        return app;
    }

    /// <summary>
    /// Setup Swagger documentation for the API
    /// </summary>
    public static WebApplication SetupDocumentation(this WebApplication app)
    {
        app.UseSwagger();
        app.UseSwaggerUI();
        return app;
    }

    /// <summary>
    /// Setup development environment configurations
    /// </summary>
    public static async Task<WebApplication> SetupDevelopmentAsync(this WebApplication app)
    {
        using var scope = app.Services.CreateScope();

        // Use the developer exception page for detailed error information during development
        app.UseDeveloperExceptionPage();

        // Ensure database is created during development
        var database = scope.ServiceProvider.GetRequiredService<AppDatabase>().Database;
        await database.EnsureCreatedAsync();

        return app;
    }

    /// <summary>
    /// Setup default roles and claims in the identity system
    /// </summary>
    public static async Task<WebApplication> SetupRolesAsync(this WebApplication app)
    {
        using var scope = app.Services.CreateScope();

        var db = scope.ServiceProvider.GetRequiredService<AppDatabase>();
        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();

        foreach (string name in Roles.GetRoles())
        {
            if (!await roleManager.RoleExistsAsync(name))
            {
                var role = new IdentityRole(name);
                var createResult = await roleManager.CreateAsync(role);

                if (createResult.Succeeded)
                {
                    List<Claim> claims = Roles.GetClaimsForRole(name);
                    foreach (Claim claim in claims.Where(c => c.Type != ClaimTypes.Role))
                    {
                        await roleManager.AddClaimAsync(role, claim);
                    }
                }
            }
        }

        return app;
    }
}