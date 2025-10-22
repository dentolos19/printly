using System.Text;
using EnterpriseServer.Auth;
using EnterpriseServer.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace EnterpriseServer.Extensions;

using Microsoft.AspNetCore.Mvc.ApplicationModels;

public class LowercaseParameterTransformer : IOutboundParameterTransformer
{
    public string? TransformOutbound(object? value)
        => value?.ToString()?.ToLowerInvariant();
}

public static class ServiceExtensions
{
    /// <summary>
    /// Setup Cross-Origin Resource Sharing to allow our app to access this server
    /// </summary>
    public static IServiceCollection SetupCors(this IServiceCollection services)
    {
        services.AddCors(options =>
        {
            options.AddPolicy("AllowAll", policy =>
            {
                policy
                    .AllowAnyOrigin()
                    .AllowAnyMethod()
                    .AllowAnyHeader();
            });
        });

        return services;
    }

    /// <summary>
    /// Lets the backend server know that the custom roles exist
    /// </summary>
    public static IServiceCollection SetupAuth(this IServiceCollection services, WebApplicationBuilder builder)
    {
        services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        }).AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = false,
                ValidateAudience = false,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                IssuerSigningKey =
                    new SymmetricSecurityKey(
                        Encoding.UTF8.GetBytes(builder.Configuration["SECRET_KEY"]!))
            };
        });

        services.AddAuthorization(options =>
        {
            // Role-based policies
            options.AddPolicy(Policies.AdminOnly, policy =>
                policy.RequireRole(Roles.Admin));

            options.AddPolicy(Policies.LoggedIn, policy =>
                policy.RequireRole(Roles.Admin, Roles.User));
        });

        services.AddIdentityApiEndpoints<User>().AddRoles<IdentityRole>().AddEntityFrameworkStores<AppDbContext>()
            .AddDefaultTokenProviders();

        return services;
    }

    public static IServiceCollection SetupDatabase(this IServiceCollection services, WebApplicationBuilder builder)
    {
        if (builder.Environment.IsProduction())
        {
            var databaseUri = new Uri(builder.Configuration["DATABASE_URL"]!);
            var databaseInfo = databaseUri.UserInfo.Split(':');
            var connectionString =
                $"Host={databaseUri.Host};Database={databaseUri.AbsolutePath.TrimStart('/')};Username={databaseInfo[0]};Password={databaseInfo[1]};Ssl Mode=Require;Trust Server Certificate=true;";
            services.AddDbContext<AppDbContext>(options => options.UseNpgsql(connectionString));
        }
        else
        {
            services.AddDbContext<AppDbContext>(options => options.UseSqlite("Data Source=data.db"));
        }

        return services;
    }

    public static IServiceCollection AddLowercaseControllers(this IServiceCollection services) {
        services.AddControllers(options =>
        {
            options.Conventions.Add(
                    new RouteTokenTransformerConvention(new LowercaseParameterTransformer())
            );
        });
        return services;
    }
}