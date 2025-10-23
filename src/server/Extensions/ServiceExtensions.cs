using System.Text;
using EnterpriseServer.Auth;
using EnterpriseServer.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace EnterpriseServer.Extensions;

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
    public static IServiceCollection SetupAuth(this IServiceCollection services, WebApplicationBuilder builder)
    {
        services
            .AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            })
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = false,
                    ValidateAudience = false,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(
                        Encoding.UTF8.GetBytes(builder.Configuration["SECRET_KEY"]!)
                    ),
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
            .AddEntityFrameworkStores<AppDbContext>()
            .AddDefaultTokenProviders();

        return services;
    }

    /// <summary>
    /// Setup the database context for the application
    /// </summary>
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