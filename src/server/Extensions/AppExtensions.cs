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

        // Seed sample order data
        await SeedOrderDataAsync(db);

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
        var colors = new[] { "Red", "Blue", "Green", "Black", "White", "Navy" };
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

    private static async Task SeedOrderDataAsync(DatabaseContext db)
    {
        // Skip seeding if orders already exist
        if (await db.Orders.AnyAsync())
            return;

        // Get all users to distribute orders
        var users = await db.Users.ToListAsync();
        if (users.Count == 0)
            return;

        // Get all variants for order items
        var variants = await db.ProductVariants.Include(v => v.Product).ToListAsync();
        if (variants.Count == 0)
            return;

        var random = new Random(123); // Fixed seed for reproducible data
        var orders = new List<Order>();
        var orderItems = new List<OrderItem>();

        // Create orders spanning the last 6 months
        var statuses = Enum.GetValues<OrderStatus>();

        for (var i = 0; i < 50; i++)
        {
            var user = users[random.Next(users.Count)];
            var orderDate = DateTime.UtcNow.AddDays(-random.Next(1, 180)); // Random date in last 6 months

            // Determine status based on order age (older orders more likely to be completed)
            var daysSinceOrder = (DateTime.UtcNow - orderDate).Days;
            OrderStatus status;
            if (daysSinceOrder > 30)
            {
                // Older orders - mostly delivered or cancelled
                var statusRoll = random.Next(100);
                if (statusRoll < 75)
                    status = OrderStatus.Delivered;
                else if (statusRoll < 90)
                    status = OrderStatus.Cancelled;
                else
                    status = OrderStatus.Shipped;
            }
            else if (daysSinceOrder > 14)
            {
                // Medium age - mix of shipped, delivered, processing
                var statusRoll = random.Next(100);
                if (statusRoll < 40)
                    status = OrderStatus.Delivered;
                else if (statusRoll < 70)
                    status = OrderStatus.Shipped;
                else if (statusRoll < 85)
                    status = OrderStatus.Processing;
                else if (statusRoll < 95)
                    status = OrderStatus.Paid;
                else
                    status = OrderStatus.Cancelled;
            }
            else if (daysSinceOrder > 7)
            {
                // Recent - processing, shipped, paid
                var statusRoll = random.Next(100);
                if (statusRoll < 30)
                    status = OrderStatus.Shipped;
                else if (statusRoll < 60)
                    status = OrderStatus.Processing;
                else if (statusRoll < 85)
                    status = OrderStatus.Paid;
                else
                    status = OrderStatus.PendingPayment;
            }
            else
            {
                // Very recent - pending payment, paid, processing
                var statusRoll = random.Next(100);
                if (statusRoll < 40)
                    status = OrderStatus.PendingPayment;
                else if (statusRoll < 70)
                    status = OrderStatus.Paid;
                else
                    status = OrderStatus.Processing;
            }

            var order = new Order
            {
                UserId = user.Id,
                Status = status,
                TotalAmount = 0, // Will calculate after adding items
            };

            // Manually set timestamps
            order.CreatedAt = orderDate;
            order.UpdatedAt = orderDate.AddHours(random.Next(1, 48));

            orders.Add(order);

            // Add 1-4 items per order
            var itemCount = random.Next(1, 5);
            decimal orderTotal = 0;

            var usedVariants = new HashSet<Guid>();
            for (var j = 0; j < itemCount; j++)
            {
                ProductVariant variant;
                do
                {
                    variant = variants[random.Next(variants.Count)];
                } while (usedVariants.Contains(variant.Id) && usedVariants.Count < variants.Count);

                if (usedVariants.Contains(variant.Id))
                    continue;

                usedVariants.Add(variant.Id);

                var quantity = random.Next(1, 6);
                var unitPrice = variant.Product.BasePrice;
                var subtotal = unitPrice * quantity;

                var orderItem = new OrderItem
                {
                    OrderId = order.Id,
                    VariantId = variant.Id,
                    Quantity = quantity,
                    UnitPrice = unitPrice,
                    Subtotal = subtotal,
                };

                orderItem.CreatedAt = orderDate;
                orderItem.UpdatedAt = orderDate;

                orderItems.Add(orderItem);
                orderTotal += subtotal;
            }

            order.TotalAmount = orderTotal;
        }

        await db.Orders.AddRangeAsync(orders);
        await db.OrderItems.AddRangeAsync(orderItems);
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
