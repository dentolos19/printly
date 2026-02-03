using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using PrintlyServer.Data.Entities;
using PrintlyServer.Extensions;

namespace PrintlyServer.Data;

public class DatabaseContext(DbContextOptions<DatabaseContext> options) : IdentityDbContext<User>(options)
{
    public DbSet<RefreshToken> RefreshTokens { get; set; }
    public DbSet<Design> Designs { get; set; }
    public DbSet<Imprint> Imprints { get; set; }
    public DbSet<Asset> Assets { get; set; }
    public DbSet<Broadcast> Broadcasts { get; set; }
    public DbSet<Notification> Notifications { get; set; }
    public DbSet<ChatbotMessage> ChatbotMessages { get; set; }
    public DbSet<Product> Products { get; set; }
    public DbSet<ProductVariant> ProductVariants { get; set; }
    public DbSet<Inventory> Inventories { get; set; }
    public DbSet<Order> Orders { get; set; }
    public DbSet<OrderItem> OrderItems { get; set; }
    public DbSet<Payment> Payments { get; set; }
    public DbSet<Post> Posts { get; set; }
    public DbSet<PostComment> PostComments { get; set; }
    public DbSet<PostReaction> PostReactions { get; set; }
    public DbSet<PostBookmark> PostBookmarks { get; set; }
    public DbSet<Conversation> Conversations { get; set; }
    public DbSet<ConversationParticipant> ConversationParticipants { get; set; }
    public DbSet<ConversationMessage> ConversationMessages { get; set; }
    public DbSet<Refund> Refunds { get; set; }
    public DbSet<CallLog> CallLogs { get; set; }
    public DbSet<CallParticipant> CallParticipants { get; set; }
    public DbSet<UserFollower> UserFollowers { get; set; }
    public DbSet<Report> Reports { get; set; }
    public DbSet<UserBlock> UserBlocks { get; set; }
    public DbSet<PrintArea> PrintAreas { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder options)
    {
        if (!options.IsConfigured)
            options.UseDatabase();
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

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
            .HasOne(n => n.Conversation)
            .WithMany()
            .HasForeignKey(n => n.ConversationId)
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
        modelBuilder.Entity<Notification>().HasIndex(n => n.CreatedAt);

        modelBuilder
            .Entity<Product>()
            .HasMany(p => p.Variants)
            .WithOne(v => v.Product)
            .HasForeignKey(v => v.ProductId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder
            .Entity<Product>()
            .HasMany(p => p.PrintAreas)
            .WithOne(pa => pa.Product)
            .HasForeignKey(pa => pa.ProductId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<PrintArea>().HasIndex(pa => new { pa.ProductId, pa.AreaId }).IsUnique();

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

        // OrderItem -> Imprint relationship (nullable - only for customized products)
        modelBuilder
            .Entity<OrderItem>()
            .HasOne(i => i.Imprint)
            .WithMany()
            .HasForeignKey(i => i.ImprintId)
            .OnDelete(DeleteBehavior.SetNull);

        // Imprint -> Product relationship (optional association)
        modelBuilder
            .Entity<Imprint>()
            .HasOne(i => i.Product)
            .WithMany()
            .HasForeignKey(i => i.ProductId)
            .OnDelete(DeleteBehavior.SetNull);

        // Index for OrderItem imprint queries
        modelBuilder.Entity<OrderItem>().HasIndex(i => i.ImprintId);

        // Index for Imprint product queries
        modelBuilder.Entity<Imprint>().HasIndex(i => i.ProductId);

        // Index for querying orders by user and status
        modelBuilder.Entity<Order>().HasIndex(o => o.UserId);
        modelBuilder.Entity<Order>().HasIndex(o => o.Status);
        modelBuilder.Entity<Order>().HasIndex(o => o.CreatedAt);

        // Payment relationships (1:1 with Order)
        modelBuilder
            .Entity<Payment>()
            .HasOne(p => p.Order)
            .WithOne()
            .HasForeignKey<Payment>(p => p.OrderId)
            .OnDelete(DeleteBehavior.Restrict);

        // Unique constraints for Payment
        modelBuilder.Entity<Payment>().HasIndex(p => p.OrderId).IsUnique();
        modelBuilder.Entity<Payment>().HasIndex(p => p.StripeCheckoutSessionId).IsUnique();
        modelBuilder.Entity<Payment>().HasIndex(p => p.Status);

        modelBuilder.Entity<Post>().HasOne(p => p.Author).WithMany().HasForeignKey(p => p.AuthorId).IsRequired();

        modelBuilder.Entity<Post>().HasOne(p => p.Photo).WithMany().HasForeignKey(p => p.PhotoId).IsRequired();

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

        modelBuilder.Entity<PostReaction>().HasIndex(pr => new { pr.PostId, pr.UserId }).IsUnique();

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

        modelBuilder.Entity<PostBookmark>().HasIndex(pb => new { pb.PostId, pb.UserId }).IsUnique();

        // Indexes for Post queries
        modelBuilder.Entity<Post>().HasIndex(p => p.AuthorId);
        modelBuilder.Entity<Post>().HasIndex(p => p.PostStatus);
        modelBuilder.Entity<Post>().HasIndex(p => p.Visibility);
        modelBuilder.Entity<Post>().HasIndex(p => p.CreatedAt);

        // Index for PostComment queries
        modelBuilder.Entity<PostComment>().HasIndex(pc => pc.PostId);
        modelBuilder.Entity<PostComment>().HasIndex(pc => pc.AuthorId);

        // Conversations
        modelBuilder
            .Entity<ConversationParticipant>()
            .HasOne(cp => cp.Conversation)
            .WithMany(c => c.Participants)
            .HasForeignKey(cp => cp.ConversationId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder
            .Entity<ConversationParticipant>()
            .HasOne(cp => cp.User)
            .WithMany()
            .HasForeignKey(cp => cp.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<ConversationParticipant>().HasIndex(cp => new { cp.ConversationId, cp.UserId }).IsUnique();

        modelBuilder
            .Entity<ConversationMessage>()
            .HasOne(cm => cm.Conversation)
            .WithMany(c => c.Messages)
            .HasForeignKey(cm => cm.ConversationId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder
            .Entity<ConversationMessage>()
            .HasOne(cm => cm.Participant)
            .WithMany()
            .HasForeignKey(cm => cm.ParticipantId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder
            .Entity<ConversationMessage>()
            .HasOne(cm => cm.ReplyToMessage)
            .WithMany()
            .HasForeignKey(cm => cm.ReplyToMessageId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<ConversationMessage>().HasIndex(cm => cm.CreatedAt);

        // Refund relationships
        modelBuilder
            .Entity<Refund>()
            .HasOne(r => r.Payment)
            .WithMany()
            .HasForeignKey(r => r.PaymentId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder
            .Entity<Refund>()
            .HasOne(r => r.Order)
            .WithMany()
            .HasForeignKey(r => r.OrderId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder
            .Entity<Refund>()
            .HasOne(r => r.RequestedByUser)
            .WithMany()
            .HasForeignKey(r => r.RequestedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder
            .Entity<Refund>()
            .HasOne(r => r.ProcessedByUser)
            .WithMany()
            .HasForeignKey(r => r.ProcessedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder
            .Entity<Refund>()
            .HasOne(r => r.Conversation)
            .WithMany()
            .HasForeignKey(r => r.ConversationId)
            .OnDelete(DeleteBehavior.SetNull);

        // Refund indexes
        modelBuilder.Entity<Refund>().HasIndex(r => r.PaymentId);
        modelBuilder.Entity<Refund>().HasIndex(r => r.OrderId);
        modelBuilder.Entity<Refund>().HasIndex(r => r.RequestedByUserId);
        modelBuilder.Entity<Refund>().HasIndex(r => r.Status);
        modelBuilder.Entity<Refund>().HasIndex(r => r.RequestedAt);
        modelBuilder.Entity<Refund>().HasIndex(r => r.StripeRefundId).IsUnique();

        // UserFollower relationships
        modelBuilder
            .Entity<UserFollower>()
            .HasOne(uf => uf.Follower)
            .WithMany(u => u.Following)
            .HasForeignKey(uf => uf.FollowerId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder
            .Entity<UserFollower>()
            .HasOne(uf => uf.Following)
            .WithMany(u => u.Followers)
            .HasForeignKey(uf => uf.FollowingId)
            .OnDelete(DeleteBehavior.Cascade);

        // Prevent duplicate follows
        modelBuilder.Entity<UserFollower>().HasIndex(uf => new { uf.FollowerId, uf.FollowingId }).IsUnique();

        // Indexes for queries
        modelBuilder.Entity<UserFollower>().HasIndex(uf => uf.FollowerId);
        modelBuilder.Entity<UserFollower>().HasIndex(uf => uf.FollowingId);

        // Report relationships
        modelBuilder
            .Entity<Report>()
            .HasOne(r => r.Reporter)
            .WithMany()
            .HasForeignKey(r => r.ReporterId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder
            .Entity<Report>()
            .HasOne(r => r.ReportedUser)
            .WithMany()
            .HasForeignKey(r => r.ReportedUserId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder
            .Entity<Report>()
            .HasOne(r => r.ReviewedBy)
            .WithMany()
            .HasForeignKey(r => r.ReviewedById)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder
            .Entity<Report>()
            .HasOne(r => r.Post)
            .WithMany()
            .HasForeignKey(r => r.PostId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder
            .Entity<Report>()
            .HasOne(r => r.ReportedComment)
            .WithMany()
            .HasForeignKey(r => r.CommentId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<Report>().HasIndex(r => r.Status);
        modelBuilder.Entity<Report>().HasIndex(r => r.ReportType);
        modelBuilder.Entity<Report>().HasIndex(r => r.ReporterId);

        // Asset relationships
        modelBuilder
            .Entity<Asset>()
            .HasOne(a => a.User)
            .WithMany()
            .HasForeignKey(a => a.UserId)
            .OnDelete(DeleteBehavior.SetNull);

        // User avatar relationship (separate from Asset.User)
        modelBuilder
            .Entity<User>()
            .HasOne(u => u.Avatar)
            .WithMany()
            .HasForeignKey(u => u.AvatarId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<User>().HasIndex(u => u.AvatarId);

        // UserBlock relationships
        modelBuilder
            .Entity<UserBlock>()
            .HasOne(b => b.Blocker)
            .WithMany()
            .HasForeignKey(b => b.BlockerId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder
            .Entity<UserBlock>()
            .HasOne(b => b.Blocked)
            .WithMany()
            .HasForeignKey(b => b.BlockedId)
            .OnDelete(DeleteBehavior.Cascade);

        // Prevent duplicate blocks
        modelBuilder.Entity<UserBlock>().HasIndex(b => new { b.BlockerId, b.BlockedId }).IsUnique();
        modelBuilder.Entity<UserBlock>().HasIndex(b => b.BlockerId);
        modelBuilder.Entity<UserBlock>().HasIndex(b => b.BlockedId);
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
