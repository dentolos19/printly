using System.Security.Cryptography;
using System.Text;
using DotNetEnv;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using PrintlyServer.Data;
using PrintlyServer.Data.Auth;
using PrintlyServer.Data.Entities;
using PrintlyServer.Providers;

namespace PrintlyServer.Extensions;

public static class ServiceExtensions
{
    /// <summary>
    /// Setup Cross-Origin Resource Sharing (CORS) to allow our app to access this server.
    /// </summary>
    public static IServiceCollection SetupCors(this IServiceCollection services)
    {
        services.AddCors(options =>
        {
            options.AddPolicy(
                "AllowAll",
                policy =>
                {
                    policy
                        .WithOrigins(
                            "https://printly.dennise.me", // Production
                            "http://localhost:3000", // Development Frontend
                            "https://localhost:3000", // Development with HTTPS
                            "http://localhost:3001", // Development API
                            "https://localhost:3001" // Development API with HTTPS
                        )
                        .AllowAnyMethod()
                        .AllowAnyHeader()
                        .AllowCredentials()
                        .SetIsOriginAllowedToAllowWildcardSubdomains();
                }
            );
        });

        return services;
    }

    /// <summary>
    /// Setup SignalR for real-time communication with proper timeout configuration.
    /// </summary>
    public static IServiceCollection SetupCommunications(this IServiceCollection services)
    {
        services.AddSignalR(options =>
        {
            // Enable detailed errors in development for debugging
            options.EnableDetailedErrors = true;

            // Increase timeouts to prevent premature disconnections
            options.ClientTimeoutInterval = TimeSpan.FromSeconds(60);
            options.HandshakeTimeout = TimeSpan.FromSeconds(30);
            options.KeepAliveInterval = TimeSpan.FromSeconds(15);

            // Max message size (default is 32KB)
            options.MaximumReceiveMessageSize = 64 * 1024; // 64KB
        });

        // Register custom user ID provider to support both "sub" and NameIdentifier claims
        services.AddSingleton<IUserIdProvider, CustomUserIdProvider>();

        return services;
    }

    /// <summary>
    /// Setup authentication and authorization using JWT and Identity
    /// </summary>
    public static IServiceCollection SetupAuth(this IServiceCollection services)
    {
        // Load environment variables
        var secretKey = Environment.GetEnvironmentVariable("SECRET_KEY")!;
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
                // CRITICAL: Disable claim type mapping so "sub" stays as "sub"
                // Without this, "sub" gets mapped to a long URI claim type
                options.MapInboundClaims = false;

                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = false,
                    ValidateAudience = false,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(SHA256.HashData(Encoding.UTF8.GetBytes(secretKey))),
                    NameClaimType = "sub", // Tell ASP.NET Core to use "sub" for user identity
                };

                // Handle JWT token from query string for SignalR WebSocket connections
                options.Events = new JwtBearerEvents
                {
                    OnMessageReceived = context =>
                    {
                        var accessToken = context.Request.Query["access_token"];
                        var path = context.HttpContext.Request.Path;
                        if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs/conversation"))
                        {
                            context.Token = accessToken;
                        }
                        return Task.CompletedTask;
                    },
                };
            });

        services
            .AddAuthorizationBuilder()
            .AddPolicy(Policies.AdminOnly, policy => policy.RequireRole(Roles.Admin))
            .AddPolicy(Policies.LoggedIn, policy => policy.RequireRole(Roles.Admin, Roles.User));

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
