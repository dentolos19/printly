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
    public DbSet<ChatbotMessage> ChatbotMessages { get; set; }
    public DbSet<Product> Products { get; set; }
    public DbSet<ProductVariant> ProductVariants { get; set; }
    public DbSet<Inventory> Inventories { get; set; }
    public DbSet<Order> Orders { get; set; }
    public DbSet<OrderItem> OrderItems { get; set; }
    public DbSet<Post> Posts { get; set; }
    public DbSet<PostComment> PostComments { get; set; }
    public DbSet<PostReaction> PostReactions { get; set; }
    public DbSet<PostBookmark> PostBookmarks { get; set; }

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

        modelBuilder.Entity<Notification>()
            .HasIndex(n => n.CreatedAt);
        modelBuilder.Entity<Notification>().HasIndex(n => n.CreatedAt);

        modelBuilder
            .Entity<Product>()
            .HasMany(p => p.Variants)
            .WithOne(v => v.Product)
            .HasForeignKey(v => v.ProductId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder
            .Entity<ProductVariant>()
            .HasOne(v => v.Inventory)
            .WithOne(i => i.Variant)
            .HasForeignKey<Inventory>(i => i.VariantId)
            .IsRequired()
            .OnDelete(DeleteBehavior.Cascade);

        // Unique constraint to prevent duplicate variants (same product, size, color)
        modelBuilder
            .Entity<ProductVariant>()
            .HasIndex(v => new
            {
                v.ProductId,
                v.Size,
                v.Color,
            })
            .IsUnique();

        // Index for querying active products
        modelBuilder.Entity<Product>().HasIndex(p => p.IsActive);

        // Order relationships
        modelBuilder
            .Entity<Order>()
            .HasOne(o => o.User)
            .WithMany()
            .HasForeignKey(o => o.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder
            .Entity<Order>()
            .HasMany(o => o.Items)
            .WithOne(i => i.Order)
            .HasForeignKey(i => i.OrderId)
            .OnDelete(DeleteBehavior.Cascade);

        // OrderItem relationships
        modelBuilder
            .Entity<OrderItem>()
            .HasOne(i => i.Variant)
            .WithMany()
            .HasForeignKey(i => i.VariantId)
            .OnDelete(DeleteBehavior.Restrict);

        // Index for querying orders by user and status
        modelBuilder.Entity<Order>().HasIndex(o => o.UserId);
        modelBuilder.Entity<Order>().HasIndex(o => o.Status);
        modelBuilder.Entity<Order>().HasIndex(o => o.CreatedAt);

        modelBuilder
            .Entity<Post>()
            .HasOne(p => p.Author)
            .WithMany()
            .HasForeignKey(p => p.AuthorId)
            .IsRequired();

        modelBuilder
            .Entity<Post>()
            .HasOne(p => p.Photo)
            .WithMany()
            .HasForeignKey(p => p.PhotoId)
            .IsRequired();

        modelBuilder
            .Entity<PostReaction>()
            .HasOne(pr => pr.Post)
            .WithMany(p => p.Reactions)
            .HasForeignKey(pr => pr.PostId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder
            .Entity<PostReaction>()
            .HasOne(pr => pr.User)
            .WithMany()
            .HasForeignKey(pr => pr.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder
            .Entity<PostReaction>()
            .HasIndex(pr => new { pr.PostId, pr.UserId })
            .IsUnique();

        // PostComment relationships
        modelBuilder
            .Entity<PostComment>()
            .HasOne(pc => pc.Post)
            .WithMany(p => p.Comments)
            .HasForeignKey(pc => pc.PostId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder
            .Entity<PostComment>()
            .HasOne(pc => pc.Author)
            .WithMany()
            .HasForeignKey(pc => pc.AuthorId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder
            .Entity<PostComment>()
            .HasOne(pc => pc.Parent)
            .WithMany(pc => pc.Replies)
            .HasForeignKey(pc => pc.ParentId)
            .OnDelete(DeleteBehavior.Restrict);

        // PostBookmark relationships
        modelBuilder
            .Entity<PostBookmark>()
            .HasOne(pb => pb.Post)
            .WithMany(p => p.Bookmarks)
            .HasForeignKey(pb => pb.PostId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder
            .Entity<PostBookmark>()
            .HasOne(pb => pb.User)
            .WithMany()
            .HasForeignKey(pb => pb.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder
            .Entity<PostBookmark>()
            .HasIndex(pb => new { pb.PostId, pb.UserId })
            .IsUnique();

        // Indexes for Post queries
        modelBuilder.Entity<Post>().HasIndex(p => p.AuthorId);
        modelBuilder.Entity<Post>().HasIndex(p => p.PostStatus);
        modelBuilder.Entity<Post>().HasIndex(p => p.Visibility);
        modelBuilder.Entity<Post>().HasIndex(p => p.CreatedAt);

        // Index for PostComment queries
        modelBuilder.Entity<PostComment>().HasIndex(pc => pc.PostId);
        modelBuilder.Entity<PostComment>().HasIndex(pc => pc.AuthorId);
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
