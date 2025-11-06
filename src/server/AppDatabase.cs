using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using MocklyServer.Extensions;
using MocklyServer.Models;

namespace MocklyServer;

public class AppDatabase(DbContextOptions<AppDatabase> options) : IdentityDbContext<User>(options)
{
    public DbSet<RefreshToken> RefreshTokens { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder options)
    {
        if (options.IsConfigured)
            options.UseDatabase();
    }
}