using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using PrintlyServer.Data.Entities;
using PrintlyServer.Extensions;

namespace PrintlyServer.Data;

public class DatabaseContext(DbContextOptions<DatabaseContext> options) : IdentityDbContext<User>(options)
{
    public DbSet<RefreshToken> RefreshTokens { get; set; }
    public DbSet<Design> Designs { get; set; }
    public DbSet<Asset> Assets { get; set; }
    public DbSet<Message> Messages { get; set; }
    public DbSet<Ticket> Tickets { get; set; }
    public DbSet<TicketMessage> TicketMessages { get; set; }
    public DbSet<Broadcast> Broadcasts { get; set; }
    public DbSet<Notification> Notifications { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder options)
    {
        if (!options.IsConfigured)
            options.UseDatabase();
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Configure Message entity with two foreign keys to User
        // This prevents cascade delete issues with multiple paths to the same table
        modelBuilder
            .Entity<Message>()
            .HasOne(m => m.Sender)
            .WithMany()
            .HasForeignKey(m => m.SenderId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder
            .Entity<Message>()
            .HasOne(m => m.Receiver)
            .WithMany()
            .HasForeignKey(m => m.ReceiverId)
            .OnDelete(DeleteBehavior.Restrict);

        // Ticket relationships
        modelBuilder
            .Entity<Ticket>()
            .HasOne(t => t.Customer)
            .WithMany()
            .HasForeignKey(t => t.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder
            .Entity<Ticket>()
            .HasMany(t => t.Messages)
            .WithOne(m => m.Ticket)
            .HasForeignKey(m => m.TicketId)
            .OnDelete(DeleteBehavior.Cascade);

        // TicketMessage relationships
        modelBuilder
            .Entity<TicketMessage>()
            .HasOne(m => m.Sender)
            .WithMany()
            .HasForeignKey(m => m.SenderId)
            .OnDelete(DeleteBehavior.Restrict);

        // Broadcast relationships
        modelBuilder
            .Entity<Broadcast>()
            .HasOne(b => b.Sender)
            .WithMany()
            .HasForeignKey(b => b.SenderId)
            .OnDelete(DeleteBehavior.Restrict);

        // Notification relationships
        modelBuilder
            .Entity<Notification>()
            .HasOne(n => n.User)
            .WithMany()
            .HasForeignKey(n => n.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder
            .Entity<Notification>()
            .HasOne(n => n.Ticket)
            .WithMany()
            .HasForeignKey(n => n.TicketId)
            .OnDelete(DeleteBehavior.SetNull);

        // Index for faster queries
        modelBuilder
            .Entity<Notification>()
            .HasIndex(n => new
            {
                n.UserId,
                n.IsRead,
                n.IsDeleted,
            });

        modelBuilder.Entity<Notification>().HasIndex(n => n.CreatedAt);
    }

    public override int SaveChanges()
    {
        UpdateTimestamps();
        return base.SaveChanges();
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        UpdateTimestamps();
        return base.SaveChangesAsync(cancellationToken);
    }

    private void UpdateTimestamps()
    {
        var entities = ChangeTracker
            .Entries()
            .Where(x => x.Entity is BaseEntity && (x.State == EntityState.Added || x.State == EntityState.Modified));

        var now = DateTime.UtcNow;

        foreach (var entity in entities)
        {
            if (entity.State == EntityState.Added)
            {
                // Update creation timestamp only for new entities
                ((BaseEntity)entity.Entity).CreatedAt = now;
            }

            // Always update the modification timestamp
            ((BaseEntity)entity.Entity).UpdatedAt = now;
        }
    }
}
