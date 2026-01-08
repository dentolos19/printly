using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using PrintlyServer.Data;
using PrintlyServer.Data.Auth;
using PrintlyServer.Data.Entities;
using PrintlyServer.Hubs;
using PrintlyServer.Middlewares;

namespace PrintlyServer.Extensions;

public static class AppExtensions
{
    /// <summary>
    /// Map SignalR hubs for real-time communication
    /// </summary>
    public static WebApplication MapHubs(this WebApplication app)
    {
        app.MapHub<ChatHub>("/hubs/chat");
        app.MapHub<SupportHub>("/hubs/support");
        return app;
    }

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
    /// Setup production environment configurations
    /// </summary>
    public static async Task<WebApplication> SetupProductionAsync(this WebApplication app)
    {
        if (!app.Environment.IsProduction())
            return app;

        // Enforce secure HTTP connections in production
        app.UseHttpsRedirection();

        using var scope = app.Services.CreateScope();

        // Apply migrations to database for production
        var database = scope.ServiceProvider.GetRequiredService<DatabaseContext>().Database;
        await database.MigrateAsync(); // NOTE: This doesn't work for some reason, alternatively run the migration task manually.

        return app;
    }

    /// <summary>
    /// Setup development environment configurations
    /// </summary>
    public static async Task<WebApplication> SetupDevelopmentAsync(this WebApplication app)
    {
        if (!app.Environment.IsDevelopment())
            return app;

        // Use the developer exception page for detailed error information during development
        app.UseDeveloperExceptionPage();

        using var scope = app.Services.CreateScope();

        // Ensure database is created for development
        var db = scope.ServiceProvider.GetRequiredService<DatabaseContext>();
        await db.Database.EnsureCreatedAsync();

        // Seed sample product data
        await SeedProductDataAsync(db);

        return app;
    }

    private static async Task SeedProductDataAsync(DatabaseContext db)
    {
        // Skip seeding if products already exist
        if (await db.Products.AnyAsync())
            return;

        var products = new List<Product>
        {
            new()
            {
                Name = "T-Shirt",
                BasePrice = 19.99m,
                IsActive = true,
            },
            new()
            {
                Name = "Mug",
                BasePrice = 12.99m,
                IsActive = true,
            },
            new()
            {
                Name = "Tote Bag",
                BasePrice = 15.99m,
                IsActive = true,
            },
            new()
            {
                Name = "Cap",
                BasePrice = 14.99m,
                IsActive = true,
            },
            new()
            {
                Name = "Polo Shirt",
                BasePrice = 29.99m,
                IsActive = true,
            },
        };

        await db.Products.AddRangeAsync(products);
        await db.SaveChangesAsync();

        // Create variants and inventory for each product
        var variants = new List<ProductVariant>();
        var inventories = new List<Inventory>();

        var sizes = Enum.GetValues<ProductSize>();
        var colors = Enum.GetValues<ProductColor>();
        var random = new Random(42); // Fixed seed for reproducible data

        foreach (var product in products)
        {
            foreach (var size in sizes)
            {
                foreach (var color in colors)
                {
                    var variant = new ProductVariant
                    {
                        ProductId = product.Id,
                        Size = size,
                        Color = color,
                    };
                    variants.Add(variant);

                    // Create inventory for each variant
                    inventories.Add(
                        new Inventory
                        {
                            VariantId = variant.Id,
                            Quantity = random.Next(0, 100),
                            ReorderLevel = random.Next(5, 20),
                        }
                    );
                }
            }
        }

        await db.ProductVariants.AddRangeAsync(variants);
        await db.Inventories.AddRangeAsync(inventories);
        await db.SaveChangesAsync();
    }

    /// <summary>
    /// Setup default roles and claims in the identity system
    /// </summary>
    public static async Task<WebApplication> SetupRolesAsync(this WebApplication app)
    {
        using var scope = app.Services.CreateScope();

        var db = scope.ServiceProvider.GetRequiredService<DatabaseContext>();
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
