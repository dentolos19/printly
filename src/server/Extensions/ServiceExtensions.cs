using System.Security.Cryptography;
using System.Text;
using DotNetEnv;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using MocklyServer.Auth;
using MocklyServer.Models;

namespace MocklyServer.Extensions;

public static class ServiceExtensions
{
    /// <summary>
    /// Setup Cross-Origin Resource Sharing (CORS) to allow our app to access this server
    /// </summary>
    public static IServiceCollection SetupCors(this IServiceCollection services)
    {
        services.AddCors(options =>
        {
            options.AddPolicy(
                "AllowAll",
                policy =>
                {
                    policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
                }
            );
        });

        return services;
    }

    /// <summary>
    /// Setup authentication and authorization using JWT and Identity
    /// </summary>
    public static IServiceCollection SetupAuth(this IServiceCollection services)
    {
        // Load environment variables
        var secretKey = Environment.GetEnvironmentVariable("SECRET_KEY");
        var googleClientId = Environment.GetEnvironmentVariable("GOOGLE_CLIENT_ID")!;
        var googleClientSecret = Environment.GetEnvironmentVariable("GOOGLE_CLIENT_SECRET")!;

        services
            .AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultSignInScheme = IdentityConstants.ExternalScheme;
            })
            .AddCookie()
            .AddGoogle(options =>
            {
                options.ClientId = googleClientId;
                options.ClientSecret = googleClientSecret;
                options.SignInScheme = IdentityConstants.ExternalScheme;
                options.CallbackPath = "/auth/google/callback";
            })
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = false,
                    ValidateAudience = false,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(SHA256.HashData(Encoding.UTF8.GetBytes(secretKey))),
                };
            });

        services.AddAuthorization(options =>
        {
            // Role-based policies
            options.AddPolicy(Policies.AdminOnly, policy => policy.RequireRole(Roles.Admin));
            options.AddPolicy(Policies.LoggedIn, policy => policy.RequireRole(Roles.Admin, Roles.User));
        });

        services
            .AddIdentityApiEndpoints<User>()
            .AddRoles<IdentityRole>()
            .AddEntityFrameworkStores<DatabaseContext>()
            .AddDefaultTokenProviders();

        return services;
    }

    /// <summary>
    /// Setup the database context for the application
    /// </summary>
    public static IServiceCollection SetupDatabase(this IServiceCollection services)
    {
        services.AddDbContext<DatabaseContext>(options => options.UseDatabase());
        return services;
    }

    /// <summary>
    /// Setup controllers and routing with lowercase URLs and query strings
    /// </summary>
    public static IServiceCollection SetupRouting(this IServiceCollection services)
    {
        services.AddControllers();
        services.AddRouting(options =>
        {
            options.LowercaseUrls = true;
            options.LowercaseQueryStrings = true;
        });

        return services;
    }

    /// <summary>
    /// Setup Swagger documentation for the API
    /// </summary>
    public static IServiceCollection SetupDocumentation(this IServiceCollection services)
    {
        services.AddEndpointsApiExplorer();
        services.AddSwaggerGen();
        return services;
    }
}