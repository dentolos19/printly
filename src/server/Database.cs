using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using MocklyServer.Extensions;
using MocklyServer.Models;

namespace MocklyServer;

public class Database(DbContextOptions<Database> options) : IdentityDbContext<User>(options)
{
    public DbSet<RefreshToken> RefreshTokens { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder options)
    {
        if (!options.IsConfigured)
            return;
        options.UseDatabase();
    }
}