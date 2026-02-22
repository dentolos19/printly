using System.Security.Claims;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PrintlyServer.Controllers.Dtos;
using PrintlyServer.Data;
using PrintlyServer.Data.Auth;
using PrintlyServer.Data.Entities;
using PrintlyServer.Services;

namespace PrintlyServer.Controllers;

/// <summary>
/// Controller for managing community posts, comments, reactions, and bookmarks.
/// Provides social features for users to share and interact with content.
/// </summary>
[Route("community")]
[Authorize]
public class CommunityController(
    DatabaseContext context,
    StorageService storageService,
    GenerativeService generativeService
) : BaseController(context)
{
    // ============ Posts ============

    /// <summary>
    /// Gets a paginated feed of published posts.
    /// </summary>
    [HttpGet("posts")]
    [AllowAnonymous]
    public async Task<ActionResult<PostFeedResponse>> GetPosts([FromQuery] PostFeedQuery query)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        var postsQuery = Context
            .Posts.Include(p => p.Author)
            .Include(p => p.Photo)
            .Include(p => p.Comments)
            .Include(p => p.Reactions)
            .Include(p => p.Bookmarks)
            .Include(p => p.Tags).ThenInclude(pt => pt.Tag)
            .Include(p => p.Shares)
            .Include(p => p.Views)
            .Where(p => p.Visibility == PostVisibility.Visible)
            .AsQueryable();

        // Filter by status (default to Published for public feed)
        postsQuery = postsQuery.Where(p => p.PostStatus == (query.Status ?? PostStatus.Published));

        // Block filtering
        if (userId != null)
        {
            postsQuery = postsQuery.Where(p => !Context.UserBlocks.Any(b =>
                (b.BlockerId == userId && b.BlockedId == p.AuthorId) ||
                (b.BlockerId == p.AuthorId && b.BlockedId == userId)));
            // Mute filtering (single direction)
            postsQuery = postsQuery.Where(p => !Context.UserMutes.Any(m =>
                m.MuterId == userId && m.MutedId == p.AuthorId));
        }

        // Hide posts from private profiles unless the viewer follows them
        postsQuery = postsQuery.Where(p => !p.Author.IsPrivate
            || p.AuthorId == userId
            || (userId != null && Context.UserFollowers.Any(f => f.FollowerId == userId && f.FollowingId == p.AuthorId)));

        // Filter by author
        if (!string.IsNullOrEmpty(query.AuthorId))
            postsQuery = postsQuery.Where(p => p.AuthorId == query.AuthorId);

        // Search by caption
        if (!string.IsNullOrWhiteSpace(query.SearchTerm))
            postsQuery = postsQuery.Where(p => p.Caption.Contains(query.SearchTerm));

        var totalCount = await postsQuery.CountAsync();
        var totalPages = (int)Math.Ceiling(totalCount / (double)query.PageSize);

        var posts = await postsQuery
            .OrderByDescending(p => p.CreatedAt)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync();

        var postSummaries = new List<PostSummaryResponse>();
        foreach (var post in posts)
        {
            var photoUrl = await storageService.DownloadFileAsync(post.Photo);
            var isBookmarked = userId != null && post.Bookmarks.Any(b => b.UserId.ToString() == userId);
            var userReaction =
                userId != null ? post.Reactions.FirstOrDefault(r => r.UserId.ToString() == userId)?.ReactionType : null;

            postSummaries.Add(
                new PostSummaryResponse(
                    post.Id,
                    post.AuthorId,
                    post.Author.UserName ?? "Unknown",
                    post.Caption,
                    post.PhotoId,
                    photoUrl,
                    post.PostStatus,
                    post.Comments.Count,
                    post.Reactions.Count,
                    isBookmarked,
                    userReaction,
                    post.CreatedAt,
                    post.Tags.Select(t => t.Tag.Name).ToList(),
                    post.Shares.Count,
                    post.Views.Count,
                    post.IsNsfw,
                    post.ContentWarning
                )
            );
        }

        return Ok(new PostFeedResponse(postSummaries, totalCount, query.Page, query.PageSize, totalPages));
    }

    /// <summary>
    /// Gets a specific post by ID with full details.
    /// </summary>
    [HttpGet("posts/{id:guid}")]
    [AllowAnonymous]
    public async Task<ActionResult<PostDetailResponse>> GetPost(Guid id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        var post = await Context
            .Posts.Include(p => p.Author)
            .Include(p => p.Photo)
            .Include(p => p.Comments.Where(c => c.ParentId == null))
            .ThenInclude(c => c.Author)
            .Include(p => p.Comments)
            .ThenInclude(c => c.Replies)
            .Include(p => p.Comments)
            .ThenInclude(c => c.CommentReactions)
            .Include(p => p.Reactions)
            .Include(p => p.Bookmarks)
            .Include(p => p.Tags).ThenInclude(pt => pt.Tag)
            .Include(p => p.Shares)
            .Include(p => p.Views)
            .FirstOrDefaultAsync(p => p.Id == id && p.Visibility == PostVisibility.Visible);

        if (post is null)
            return NotFound(new { message = "Post not found" });

        var photoUrl = await storageService.DownloadFileAsync(post.Photo);
        var isBookmarked = userId != null && post.Bookmarks.Any(b => b.UserId.ToString() == userId);
        var userReaction =
            userId != null ? post.Reactions.FirstOrDefault(r => r.UserId.ToString() == userId)?.ReactionType : null;

        var comments = post
            .Comments.Where(c => c.ParentId == null)
            .Select(c => new PostCommentResponse(
                c.Id,
                c.PostId,
                c.AuthorId,
                c.Author.UserName ?? "Unknown",
                c.Content,
                c.ParentId,
                c.Replies.Count,
                c.CreatedAt,
                c.UpdatedAt,
                c.CommentReactions.Count,
                userId != null ? c.CommentReactions.FirstOrDefault(cr => cr.UserId == userId)?.ReactionType : null
            ))
            .ToList();

        var reactionSummaries = post
            .Reactions.GroupBy(r => r.ReactionType)
            .Select(g => new ReactionSummary(g.Key, g.Count()))
            .ToList();

        return Ok(
            new PostDetailResponse(
                post.Id,
                post.AuthorId,
                post.Author.UserName ?? "Unknown",
                post.Caption,
                post.PhotoId,
                photoUrl,
                post.Visibility,
                post.PostStatus,
                comments,
                reactionSummaries,
                isBookmarked,
                userReaction,
                post.CreatedAt,
                post.UpdatedAt,
                post.Tags.Select(t => t.Tag.Name).ToList(),
                post.Shares.Count,
                post.Views.Count,
                post.IsNsfw,
                post.ContentWarning
            )
        );
    }

    /// <summary>
    /// Gets posts created by the current user.
    /// </summary>
    [HttpGet("posts/my")]
    public async Task<ActionResult<List<PostSummaryResponse>>> GetMyPosts([FromQuery] PostStatus? status = null)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null)
            return Unauthorized();

        var postsQuery = Context
            .Posts.Include(p => p.Author)
            .Include(p => p.Photo)
            .Include(p => p.Comments)
            .Include(p => p.Reactions)
            .Include(p => p.Bookmarks)
            .Include(p => p.Tags).ThenInclude(pt => pt.Tag)
            .Include(p => p.Shares)
            .Include(p => p.Views)
            .Where(p => p.AuthorId == userId && p.Visibility == PostVisibility.Visible);

        if (status.HasValue)
            postsQuery = postsQuery.Where(p => p.PostStatus == status.Value);

        var posts = await postsQuery.OrderByDescending(p => p.CreatedAt).ToListAsync();

        var postSummaries = new List<PostSummaryResponse>();
        foreach (var post in posts)
        {
            var photoUrl = await storageService.DownloadFileAsync(post.Photo);
            var isBookmarked = post.Bookmarks.Any(b => b.UserId == userId);
            var userReaction = post.Reactions.FirstOrDefault(r => r.UserId == userId)?.ReactionType;

            postSummaries.Add(
                new PostSummaryResponse(
                    post.Id,
                    post.AuthorId,
                    post.Author.UserName ?? "Unknown",
                    post.Caption,
                    post.PhotoId,
                    photoUrl,
                    post.PostStatus,
                    post.Comments.Count,
                    post.Reactions.Count,
                    isBookmarked,
                    userReaction,
                    post.CreatedAt,
                    post.Tags.Select(t => t.Tag.Name).ToList(),
                    post.Shares.Count,
                    post.Views.Count,
                    post.IsNsfw,
                    post.ContentWarning
                )
            );
        }

        return Ok(postSummaries);
    }

    /// <summary>
    /// Creates a new post.
    /// </summary>
    [HttpPost("posts")]
    public async Task<ActionResult<PostResponse>> CreatePost([FromBody] CreatePostDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null)
            return Unauthorized();

        var photo = await Context.Assets.FindAsync(dto.PhotoId);
        if (photo is null)
            return BadRequest(new { message = "Photo not found" });

        var post = new Post
        {
            AuthorId = userId,
            Caption = dto.Caption,
            PhotoId = dto.PhotoId,
            PostStatus = dto.PostStatus,
            Visibility = PostVisibility.Visible,
            IsNsfw = dto.IsNsfw,
            ContentWarning = dto.ContentWarning,
        };

        Context.Posts.Add(post);
        await Context.SaveChangesAsync();

        // Handle tags
        if (dto.Tags is { Count: > 0 })
            await UpsertTagsAsync(post.Id, dto.Tags);

        // Parse mentions from caption
        await ParseAndNotifyMentionsAsync(userId, dto.Caption, post.Id);

        // Reload with includes
        var createdPost = await Context
            .Posts.Include(p => p.Author)
            .Include(p => p.Photo)
            .FirstAsync(p => p.Id == post.Id);

        var photoUrl = await storageService.DownloadFileAsync(createdPost.Photo);

        return CreatedAtAction(
            nameof(GetPost),
            new { id = post.Id },
            new PostResponse(
                createdPost.Id,
                createdPost.AuthorId,
                createdPost.Author.UserName ?? "Unknown",
                createdPost.Caption,
                createdPost.PhotoId,
                photoUrl,
                createdPost.Visibility,
                createdPost.PostStatus,
                0,
                0,
                0,
                createdPost.CreatedAt,
                createdPost.UpdatedAt
            )
        );
    }

    /// <summary>
    /// Updates an existing post.
    /// </summary>
    [HttpPut("posts/{id:guid}")]
    public async Task<ActionResult<PostResponse>> UpdatePost(Guid id, [FromBody] UpdatePostDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null)
            return Unauthorized();

        var post = await Context
            .Posts.Include(p => p.Author)
            .Include(p => p.Photo)
            .Include(p => p.Comments)
            .Include(p => p.Reactions)
            .Include(p => p.Bookmarks)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (post is null)
            return NotFound(new { message = "Post not found" });

        if (post.AuthorId != userId)
            return Forbid();

        if (dto.Caption is not null)
            post.Caption = dto.Caption;

        if (dto.PhotoId.HasValue)
        {
            var photo = await Context.Assets.FindAsync(dto.PhotoId.Value);
            if (photo is null)
                return BadRequest(new { message = "Photo not found" });

            post.PhotoId = dto.PhotoId.Value;
        }

        if (dto.PostStatus.HasValue)
            post.PostStatus = dto.PostStatus.Value;

        if (dto.IsNsfw.HasValue)
            post.IsNsfw = dto.IsNsfw.Value;

        if (dto.ContentWarning is not null)
            post.ContentWarning = dto.ContentWarning;

        await Context.SaveChangesAsync();

        // Handle tags
        if (dto.Tags is not null)
            await UpsertTagsAsync(post.Id, dto.Tags);

        var photoUrl = await storageService.DownloadFileAsync(post.Photo);

        return Ok(
            new PostResponse(
                post.Id,
                post.AuthorId,
                post.Author.UserName ?? "Unknown",
                post.Caption,
                post.PhotoId,
                photoUrl,
                post.Visibility,
                post.PostStatus,
                post.Comments.Count,
                post.Reactions.Count,
                post.Bookmarks.Count,
                post.CreatedAt,
                post.UpdatedAt
            )
        );
    }

    /// <summary>
    /// Soft deletes a post.
    /// </summary>
    [HttpDelete("posts/{id:guid}")]
    public async Task<ActionResult> DeletePost(Guid id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null)
            return Unauthorized();

        var post = await Context.Posts.FindAsync(id);

        if (post is null)
            return NotFound(new { message = "Post not found" });

        if (post.AuthorId != userId)
            return Forbid();

        post.Visibility = PostVisibility.Deleted;
        await Context.SaveChangesAsync();

        return NoContent();
    }

    /// <summary>
    /// [Admin] Hard deletes a post and all associated data.
    /// </summary>
    [HttpDelete("posts/{id:guid}/permanent")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult> HardDeletePost(Guid id)
    {
        var post = await Context
            .Posts.Include(p => p.Comments)
            .Include(p => p.Reactions)
            .Include(p => p.Bookmarks)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (post is null)
            return NotFound(new { message = "Post not found" });

        // Remove all associated data
        Context.PostComments.RemoveRange(post.Comments);
        Context.PostReactions.RemoveRange(post.Reactions);
        Context.PostBookmarks.RemoveRange(post.Bookmarks);
        Context.Posts.Remove(post);

        await Context.SaveChangesAsync();

        return NoContent();
    }

    /// <summary>
    /// [Admin] Gets all posts including deleted ones for moderation.
    /// </summary>
    [HttpGet("admin/posts")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<PostFeedResponse>> GetAllPostsAdmin(
        [FromQuery] PostFeedQuery query,
        [FromQuery] PostVisibility? visibility = null
    )
    {
        var postsQuery = Context
            .Posts.Include(p => p.Author)
            .Include(p => p.Photo)
            .Include(p => p.Comments)
            .Include(p => p.Reactions)
            .Include(p => p.Bookmarks)
            .Include(p => p.Tags).ThenInclude(pt => pt.Tag)
            .Include(p => p.Shares)
            .Include(p => p.Views)
            .AsQueryable();

        // Filter by visibility (admins can see deleted posts)
        if (visibility.HasValue)
            postsQuery = postsQuery.Where(p => p.Visibility == visibility.Value);

        // Filter by status
        if (query.Status.HasValue)
            postsQuery = postsQuery.Where(p => p.PostStatus == query.Status.Value);

        // Filter by author
        if (!string.IsNullOrEmpty(query.AuthorId))
            postsQuery = postsQuery.Where(p => p.AuthorId == query.AuthorId);

        // Search by caption
        if (!string.IsNullOrWhiteSpace(query.SearchTerm))
            postsQuery = postsQuery.Where(p => p.Caption.Contains(query.SearchTerm));

        var totalCount = await postsQuery.CountAsync();
        var totalPages = (int)Math.Ceiling(totalCount / (double)query.PageSize);

        var posts = await postsQuery
            .OrderByDescending(p => p.CreatedAt)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync();

        var postSummaries = new List<PostSummaryResponse>();
        foreach (var post in posts)
        {
            var photoUrl = await storageService.DownloadFileAsync(post.Photo);

            postSummaries.Add(
                new PostSummaryResponse(
                    post.Id,
                    post.AuthorId,
                    post.Author.UserName ?? "Unknown",
                    post.Caption,
                    post.PhotoId,
                    photoUrl,
                    post.PostStatus,
                    post.Comments.Count,
                    post.Reactions.Count,
                    false,
                    null,
                    post.CreatedAt,
                    post.Tags.Select(t => t.Tag.Name).ToList(),
                    post.Shares.Count,
                    post.Views.Count,
                    post.IsNsfw,
                    post.ContentWarning
                )
            );
        }

        return Ok(new PostFeedResponse(postSummaries, totalCount, query.Page, query.PageSize, totalPages));
    }

    /// <summary>
    /// [Admin] Restores a soft-deleted post.
    /// </summary>
    [HttpPost("posts/{id:guid}/restore")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult> RestorePost(Guid id)
    {
        var post = await Context.Posts.FindAsync(id);

        if (post is null)
            return NotFound(new { message = "Post not found" });

        if (post.Visibility != PostVisibility.Deleted)
            return BadRequest(new { message = "Post is not deleted" });

        post.Visibility = PostVisibility.Visible;
        await Context.SaveChangesAsync();

        return Ok(new { message = "Post restored successfully" });
    }

    /// <summary>
    /// Gets community statistics.
    /// </summary>
    [HttpGet("stats")]
    [AllowAnonymous]
    public async Task<ActionResult<CommunityStatsResponse>> GetCommunityStats()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        // Base query: visible, published, and exclude private accounts the viewer isn't following
        var visiblePosts = Context.Posts.Where(p =>
            p.Visibility == PostVisibility.Visible
            && p.PostStatus == PostStatus.Published
            && (!p.Author.IsPrivate
                || p.AuthorId == userId
                || (userId != null && Context.UserFollowers.Any(f => f.FollowerId == userId && f.FollowingId == p.AuthorId)))
        );

        var totalPosts = await visiblePosts.CountAsync();

        var visiblePostIds = visiblePosts.Select(p => p.Id);

        var totalComments = await Context.PostComments
            .Where(c => visiblePostIds.Contains(c.PostId))
            .CountAsync();

        var totalReactions = await Context.PostReactions
            .Where(r => visiblePostIds.Contains(r.PostId))
            .CountAsync();

        var totalUsers = await visiblePosts
            .Select(p => p.AuthorId)
            .Distinct()
            .CountAsync();

        var topReactionSummaries = (await Context.PostReactions
                .Where(r => visiblePostIds.Contains(r.PostId))
                .GroupBy(r => r.ReactionType)
                .Select(g => new { ReactionType = g.Key, Count = g.Count() })
                .OrderByDescending(x => x.Count)
                .ToListAsync())
            .Select(x => new ReactionSummary(x.ReactionType, x.Count))
            .ToList();

        return Ok(
            new CommunityStatsResponse(
                totalPosts,
                totalComments,
                totalReactions,
                totalUsers,
                topReactionSummaries
            ));
    }

    /// <summary>
    /// Gets posts by a specific user (public profile view).
    /// </summary>
    [HttpGet("users/{authorId}/posts")]
    [AllowAnonymous]
    public async Task<ActionResult<List<PostSummaryResponse>>> GetUserPosts(string authorId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        var author = await Context.Users.FindAsync(authorId);
        if (author is null)
            return NotFound(new { message = "User not found" });

        // If the profile is private and the viewer is not the owner or a follower, return empty
        if (author.IsPrivate && userId != authorId)
        {
            var isFollower = userId != null && await Context.UserFollowers.AnyAsync(f =>
                f.FollowerId == userId && f.FollowingId == authorId);
            if (!isFollower)
                return Ok(new List<PostSummaryResponse>());
        }

        var posts = await Context
            .Posts.Include(p => p.Author)
            .Include(p => p.Photo)
            .Include(p => p.Comments)
            .Include(p => p.Reactions)
            .Include(p => p.Bookmarks)
            .Include(p => p.Tags).ThenInclude(pt => pt.Tag)
            .Include(p => p.Shares)
            .Include(p => p.Views)
            .Where(p =>
                p.AuthorId == authorId && p.Visibility == PostVisibility.Visible && p.PostStatus == PostStatus.Published
            )
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();

        var postSummaries = new List<PostSummaryResponse>();
        foreach (var post in posts)
        {
            var photoUrl = await storageService.DownloadFileAsync(post.Photo);
            var isBookmarked = userId != null && post.Bookmarks.Any(b => b.UserId.ToString() == userId);
            var userReaction =
                userId != null ? post.Reactions.FirstOrDefault(r => r.UserId.ToString() == userId)?.ReactionType : null;

            postSummaries.Add(
                new PostSummaryResponse(
                    post.Id,
                    post.AuthorId,
                    post.Author.UserName ?? "Unknown",
                    post.Caption,
                    post.PhotoId,
                    photoUrl,
                    post.PostStatus,
                    post.Comments.Count,
                    post.Reactions.Count,
                    isBookmarked,
                    userReaction,
                    post.CreatedAt,
                    post.Tags.Select(t => t.Tag.Name).ToList(),
                    post.Shares.Count,
                    post.Views.Count,
                    post.IsNsfw,
                    post.ContentWarning
                )
            );
        }

        return Ok(postSummaries);
    }

    // ============ AI Features ============

    /// <summary>
    /// Generates an AI-powered caption for a photo using vision analysis.
    /// </summary>
    [HttpPost("posts/generate-caption")]
    public async Task<ActionResult<GenerateCaptionResponse>> GenerateCaption([FromBody] GenerateCaptionRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null)
            return Unauthorized();

        // Find the photo asset
        var photo = await Context.Assets.FindAsync(request.PhotoId);
        if (photo is null)
            return NotFound(new { message = "Photo not found" });

        // Get a downloadable URL for the photo
        var photoUrl = await storageService.DownloadFileAsync(photo);

        try
        {
            // Generate caption using AI vision
            var caption = await generativeService.GenerateCaptionAsync(photoUrl, request.Prompt);
            return Ok(new GenerateCaptionResponse(caption));
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to generate caption", error = ex.Message });
        }
    }

    // ============ Comments ============

    /// <summary>
    /// Gets comments for a post.
    /// </summary>
    [HttpGet("posts/{postId:guid}/comments")]
    [AllowAnonymous]
    public async Task<ActionResult<List<PostCommentResponse>>> GetComments(Guid postId)
    {
        var post = await Context.Posts.FindAsync(postId);
        if (post is null || post.Visibility == PostVisibility.Deleted)
            return NotFound(new { message = "Post not found" });

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        var comments = await Context
            .PostComments.Include(c => c.Author)
            .Include(c => c.Replies)
            .Include(c => c.CommentReactions)
            .Where(c => c.PostId == postId && c.ParentId == null)
            .OrderByDescending(c => c.CreatedAt)
            .Select(c => new PostCommentResponse(
                c.Id,
                c.PostId,
                c.AuthorId,
                c.Author.UserName ?? "Unknown",
                c.Content,
                c.ParentId,
                c.Replies.Count,
                c.CreatedAt,
                c.UpdatedAt,
                c.CommentReactions.Count,
                userId != null ? c.CommentReactions.FirstOrDefault(cr => cr.UserId == userId)!.ReactionType : null
            ))
            .ToListAsync();

        return Ok(comments);
    }

    /// <summary>
    /// Gets replies for a comment.
    /// </summary>
    [HttpGet("comments/{commentId:guid}/replies")]
    [AllowAnonymous]
    public async Task<ActionResult<List<PostCommentResponse>>> GetReplies(Guid commentId)
    {
        var comment = await Context.PostComments.FindAsync(commentId);
        if (comment is null)
            return NotFound(new { message = "Comment not found" });

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        var replies = await Context
            .PostComments.Include(c => c.Author)
            .Include(c => c.Replies)
            .Include(c => c.CommentReactions)
            .Where(c => c.ParentId == commentId)
            .OrderBy(c => c.CreatedAt)
            .Select(c => new PostCommentResponse(
                c.Id,
                c.PostId,
                c.AuthorId,
                c.Author.UserName ?? "Unknown",
                c.Content,
                c.ParentId,
                c.Replies.Count,
                c.CreatedAt,
                c.UpdatedAt,
                c.CommentReactions.Count,
                userId != null ? c.CommentReactions.FirstOrDefault(cr => cr.UserId == userId)!.ReactionType : null
            ))
            .ToListAsync();

        return Ok(replies);
    }

    /// <summary>
    /// Creates a new comment on a post.
    /// </summary>
    [HttpPost("comments")]
    public async Task<ActionResult<PostCommentResponse>> CreateComment([FromBody] CreateCommentDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null)
            return Unauthorized();

        var post = await Context.Posts.Include(p => p.Author).FirstOrDefaultAsync(p => p.Id == dto.PostId);
        if (post is null || post.Visibility == PostVisibility.Deleted)
            return NotFound(new { message = "Post not found" });

        PostComment? parentComment = null;
        if (dto.ParentId.HasValue)
        {
            parentComment = await Context.PostComments.Include(c => c.Author).FirstOrDefaultAsync(c => c.Id == dto.ParentId.Value);
            if (parentComment is null || parentComment.PostId != dto.PostId)
                return BadRequest(new { message = "Parent comment not found or belongs to different post" });
        }

        var comment = new PostComment
        {
            PostId = dto.PostId,
            AuthorId = userId,
            Content = dto.Content,
            ParentId = dto.ParentId,
        };

        Context.PostComments.Add(comment);
        await Context.SaveChangesAsync();

        var createdComment = await Context.PostComments.Include(c => c.Author).FirstAsync(c => c.Id == comment.Id);

        // Send notification
        if (parentComment != null)
        {
            // Notify parent comment author about the reply (if not self)
            if (parentComment.AuthorId != userId)
            {
                await CreateNotificationAsync(
                    parentComment.AuthorId,
                    NotificationType.CommentReplied,
                    "New Reply",
                    $"{createdComment.Author.UserName ?? "Someone"} replied to your comment",
                    $"/community/posts/{dto.PostId}"
                );
            }
        }
        else
        {
            // Notify post author about the comment (if not self)
            if (post.AuthorId != userId)
            {
                await CreateNotificationAsync(
                    post.AuthorId,
                    NotificationType.PostCommented,
                    "New Comment",
                    $"{createdComment.Author.UserName ?? "Someone"} commented on your post",
                    $"/community/posts/{dto.PostId}"
                );
            }
        }

        // Parse mentions from comment
        await ParseAndNotifyMentionsAsync(userId, dto.Content, dto.PostId);

        return CreatedAtAction(
            nameof(GetComments),
            new { postId = dto.PostId },
            new PostCommentResponse(
                createdComment.Id,
                createdComment.PostId,
                createdComment.AuthorId,
                createdComment.Author.UserName ?? "Unknown",
                createdComment.Content,
                createdComment.ParentId,
                0,
                createdComment.CreatedAt,
                createdComment.UpdatedAt,
                0,
                null
            )
        );
    }

    /// <summary>
    /// Updates an existing comment.
    /// </summary>
    [HttpPut("comments/{id:guid}")]
    public async Task<ActionResult<PostCommentResponse>> UpdateComment(Guid id, [FromBody] UpdateCommentDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null)
            return Unauthorized();

        var comment = await Context
            .PostComments.Include(c => c.Author)
            .Include(c => c.Replies)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (comment is null)
            return NotFound(new { message = "Comment not found" });

        if (comment.AuthorId != userId)
            return Forbid();

        if (dto.Content is not null)
            comment.Content = dto.Content;

        await Context.SaveChangesAsync();

        return Ok(
            new PostCommentResponse(
                comment.Id,
                comment.PostId,
                comment.AuthorId,
                comment.Author.UserName ?? "Unknown",
                comment.Content,
                comment.ParentId,
                comment.Replies.Count,
                comment.CreatedAt,
                comment.UpdatedAt,
                comment.CommentReactions?.Count ?? 0,
                null
            )
        );
    }

    /// <summary>
    /// Deletes a comment.
    /// </summary>
    [HttpDelete("comments/{id:guid}")]
    public async Task<ActionResult> DeleteComment(Guid id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null)
            return Unauthorized();

        var comment = await Context.PostComments.Include(c => c.Replies).FirstOrDefaultAsync(c => c.Id == id);

        if (comment is null)
            return NotFound(new { message = "Comment not found" });

        if (comment.AuthorId != userId)
            return Forbid();

        // Remove all replies first (cascading delete)
        if (comment.Replies.Any())
            Context.PostComments.RemoveRange(comment.Replies);

        Context.PostComments.Remove(comment);
        await Context.SaveChangesAsync();

        return NoContent();
    }

    /// <summary>
    /// [Admin] Deletes any comment for moderation purposes.
    /// </summary>
    [HttpDelete("admin/comments/{id:guid}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult> AdminDeleteComment(Guid id)
    {
        var comment = await Context.PostComments.Include(c => c.Replies).FirstOrDefaultAsync(c => c.Id == id);

        if (comment is null)
            return NotFound(new { message = "Comment not found" });

        // Remove all replies first
        if (comment.Replies.Any())
            Context.PostComments.RemoveRange(comment.Replies);

        Context.PostComments.Remove(comment);
        await Context.SaveChangesAsync();

        return NoContent();
    }

    // ============ Reactions ============

    /// <summary>
    /// Gets reactions for a post.
    /// </summary>
    [HttpGet("posts/{postId:guid}/reactions")]
    [AllowAnonymous]
    public async Task<ActionResult<List<ReactionSummary>>> GetReactions(Guid postId)
    {
        var post = await Context.Posts.FindAsync(postId);
        if (post is null || post.Visibility == PostVisibility.Deleted)
            return NotFound(new { message = "Post not found" });

        var reactions = await Context
            .PostReactions.Where(r => r.PostId == postId)
            .GroupBy(r => r.ReactionType)
            .Select(g => new { ReactionType = g.Key, Count = g.Count() })
            .ToListAsync();
        var reactionSummaries = reactions
            .Select(r => new ReactionSummary(r.ReactionType, r.Count))
            .ToList();

        return Ok(reactionSummaries);
    }

    /// <summary>
    /// Adds or updates a reaction to a post.
    /// </summary>
    [HttpPost("reactions")]
    public async Task<ActionResult<PostReactionResponse>> CreateOrUpdateReaction([FromBody] CreateReactionDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null)
            return Unauthorized();

        var post = await Context.Posts.Include(p => p.Author).FirstOrDefaultAsync(p => p.Id == dto.PostId);
        if (post is null || post.Visibility == PostVisibility.Deleted)
            return NotFound(new { message = "Post not found" });

        var existingReaction = await Context.PostReactions.FirstOrDefaultAsync(r =>
            r.PostId == dto.PostId && r.UserId == userId
        );

        if (existingReaction is not null)
        {
            existingReaction.ReactionType = dto.ReactionType;
            await Context.SaveChangesAsync();

            var user = await Context.Users.FindAsync(userId);
            return Ok(
                new PostReactionResponse(
                    existingReaction.Id,
                    existingReaction.PostId,
                    existingReaction.UserId,
                    user?.UserName ?? "Unknown",
                    existingReaction.ReactionType,
                    existingReaction.CreatedAt
                )
            );
        }

        var reaction = new PostReaction
        {
            PostId = dto.PostId,
            UserId = userId,
            ReactionType = dto.ReactionType,
        };

        Context.PostReactions.Add(reaction);
        await Context.SaveChangesAsync();

        var currentUser = await Context.Users.FindAsync(userId);

        // Send notification to post author (if not self)
        if (post.AuthorId != userId)
        {
            await CreateNotificationAsync(
                post.AuthorId,
                NotificationType.PostLiked,
                "Post Liked",
                $"{currentUser?.UserName ?? "Someone"} reacted to your post",
                $"/community/posts/{dto.PostId}"
            );
        }

        return CreatedAtAction(
            nameof(GetReactions),
            new { postId = dto.PostId },
            new PostReactionResponse(
                reaction.Id,
                reaction.PostId,
                reaction.UserId,
                currentUser?.UserName ?? "Unknown",
                reaction.ReactionType,
                reaction.CreatedAt
            )
        );
    }

    /// <summary>
    /// Removes a reaction from a post.
    /// </summary>
    [HttpDelete("posts/{postId:guid}/reactions")]
    public async Task<ActionResult> DeleteReaction(Guid postId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null)
            return Unauthorized();

        var reaction = await Context.PostReactions.FirstOrDefaultAsync(r => r.PostId == postId && r.UserId == userId);

        if (reaction is null)
            return NotFound(new { message = "Reaction not found" });

        Context.PostReactions.Remove(reaction);
        await Context.SaveChangesAsync();

        return NoContent();
    }

    // ============ Bookmarks ============

    /// <summary>
    /// Gets bookmarked posts for the current user.
    /// </summary>
    [HttpGet("bookmarks")]
    public async Task<ActionResult<List<BookmarkedPostResponse>>> GetBookmarks()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null)
            return Unauthorized();

        var bookmarks = await Context
            .PostBookmarks.Include(b => b.Post)
            .ThenInclude(p => p.Author)
            .Include(b => b.Post)
            .ThenInclude(p => p.Photo)
            .Include(b => b.Post)
            .ThenInclude(p => p.Comments)
            .Include(b => b.Post)
            .ThenInclude(p => p.Reactions)
            .Include(b => b.Post)
            .ThenInclude(p => p.Tags).ThenInclude(pt => pt.Tag)
            .Include(b => b.Post)
            .ThenInclude(p => p.Shares)
            .Include(b => b.Post)
            .ThenInclude(p => p.Views)
            .Where(b => b.UserId == userId && b.Post.Visibility == PostVisibility.Visible)
            .OrderByDescending(b => b.CreatedAt)
            .ToListAsync();

        var bookmarkedPosts = new List<BookmarkedPostResponse>();
        foreach (var bookmark in bookmarks)
        {
            var photoUrl = await storageService.DownloadFileAsync(bookmark.Post.Photo);
            var userReaction = bookmark.Post.Reactions.FirstOrDefault(r => r.UserId == userId)?.ReactionType;

            bookmarkedPosts.Add(
                new BookmarkedPostResponse(
                    bookmark.Id,
                    bookmark.CreatedAt,
                    new PostSummaryResponse(
                        bookmark.Post.Id,
                        bookmark.Post.AuthorId,
                        bookmark.Post.Author.UserName ?? "Unknown",
                        bookmark.Post.Caption,
                        bookmark.Post.PhotoId,
                        photoUrl,
                        bookmark.Post.PostStatus,
                        bookmark.Post.Comments.Count,
                        bookmark.Post.Reactions.Count,
                        true,
                        userReaction,
                        bookmark.Post.CreatedAt,
                        bookmark.Post.Tags.Select(t => t.Tag.Name).ToList(),
                        bookmark.Post.Shares.Count,
                        bookmark.Post.Views.Count,
                        bookmark.Post.IsNsfw,
                        bookmark.Post.ContentWarning
                    )
                )
            );
        }

        return Ok(bookmarkedPosts);
    }

    /// <summary>
    /// Adds a bookmark to a post.
    /// </summary>
    [HttpPost("bookmarks")]
    public async Task<ActionResult<PostBookmarkResponse>> CreateBookmark([FromBody] CreateBookmarkDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null)
            return Unauthorized();

        var post = await Context.Posts.FindAsync(dto.PostId);
        if (post is null || post.Visibility == PostVisibility.Deleted)
            return NotFound(new { message = "Post not found" });

        var existingBookmark = await Context.PostBookmarks.FirstOrDefaultAsync(b =>
            b.PostId == dto.PostId && b.UserId == userId
        );

        if (existingBookmark is not null)
            return Conflict(new { message = "Post already bookmarked" });

        var bookmark = new PostBookmark { PostId = dto.PostId, UserId = userId };

        Context.PostBookmarks.Add(bookmark);
        await Context.SaveChangesAsync();

        return CreatedAtAction(
            nameof(GetBookmarks),
            new PostBookmarkResponse(bookmark.Id, bookmark.PostId, bookmark.UserId, bookmark.CreatedAt)
        );
    }

    /// <summary>
    /// Toggles a bookmark on a post. Creates if not exists, removes if exists.
    /// </summary>
    [HttpPost("bookmarks/{postId:guid}/toggle")]
    public async Task<ActionResult<BookmarkToggleResponse>> ToggleBookmark(Guid postId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null)
            return Unauthorized();

        var post = await Context.Posts.FindAsync(postId);
        if (post is null || post.Visibility == PostVisibility.Deleted)
            return NotFound(new { message = "Post not found" });

        var existingBookmark = await Context.PostBookmarks.FirstOrDefaultAsync(b =>
            b.PostId == postId && b.UserId == userId
        );

        if (existingBookmark is not null)
        {
            Context.PostBookmarks.Remove(existingBookmark);
            await Context.SaveChangesAsync();
            return Ok(new BookmarkToggleResponse(false, "Bookmark removed"));
        }

        var bookmark = new PostBookmark { PostId = postId, UserId = userId };

        Context.PostBookmarks.Add(bookmark);
        await Context.SaveChangesAsync();

        return Ok(new BookmarkToggleResponse(true, "Bookmark added"));
    }

    /// <summary>
    /// Removes a bookmark from a post.
    /// </summary>
    [HttpDelete("bookmarks/{postId:guid}")]
    public async Task<ActionResult> DeleteBookmark(Guid postId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null)
            return Unauthorized();

        var bookmark = await Context.PostBookmarks.FirstOrDefaultAsync(b => b.PostId == postId && b.UserId == userId);

        if (bookmark is null)
            return NotFound(new { message = "Bookmark not found" });

        Context.PostBookmarks.Remove(bookmark);
        await Context.SaveChangesAsync();

        return NoContent();
    }

    // ============ Follow ============

    /// <summary>
    /// Follow a user.
    /// </summary>
    [HttpPost("follow/{userId}")]
    public async Task<ActionResult> Follow(string userId)
    {
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (currentUserId == null)
            return Unauthorized();

        if (currentUserId == userId)
            return BadRequest("Cannot follow yourself");

        // Check if user exists
        var targetUser = await Context.Users.FindAsync(userId);
        if (targetUser == null)
            return NotFound("User not found");

        // Check if already following
        var existingFollow = await Context.UserFollowers.FirstOrDefaultAsync(f =>
            f.FollowerId == currentUserId && f.FollowingId == userId
        );

        if (existingFollow != null)
            return BadRequest("Already following this user");

        // If target user is private, create a follow request instead
        if (targetUser.IsPrivate)
        {
            var existingRequest = await Context.FollowRequests.FirstOrDefaultAsync(fr =>
                fr.RequesterId == currentUserId && fr.TargetId == userId
            );

            if (existingRequest != null)
            {
                if (existingRequest.Status == FollowRequestStatus.Pending)
                    return BadRequest("Follow request already pending");

                // Reset a previously rejected/approved request back to pending
                existingRequest.Status = FollowRequestStatus.Pending;
                existingRequest.UpdatedAt = DateTime.UtcNow;
                await Context.SaveChangesAsync();
            }
            else
            {
                Context.FollowRequests.Add(new FollowRequest { RequesterId = currentUserId, TargetId = userId });
                await Context.SaveChangesAsync();
            }

            var currentUser = await Context.Users.FindAsync(currentUserId);
            await CreateNotificationAsync(
                userId,
                NotificationType.FollowRequested,
                "Follow Request",
                $"{currentUser?.UserName ?? "Someone"} requested to follow you",
                $"/user/{currentUserId}"
            );

            return Ok(new { message = "Follow request sent" });
        }

        var follow = new UserFollower { FollowerId = currentUserId, FollowingId = userId };

        Context.UserFollowers.Add(follow);
        await Context.SaveChangesAsync();

        // Create notification for the followed user
        var followNotifUser = await Context.Users.FindAsync(currentUserId);
        await CreateNotificationAsync(
            userId,
            NotificationType.NewFollower,
            "New Follower",
            $"{followNotifUser?.UserName ?? "Someone"} started following you",
            $"/profile/{currentUserId}"
        );

        return Ok();
    }

    /// <summary>
    /// Unfollow a user.
    /// </summary>
    [HttpDelete("follow/{userId}")]
    public async Task<ActionResult> Unfollow(string userId)
    {
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (currentUserId == null)
            return Unauthorized();

        var follow = await Context.UserFollowers.FirstOrDefaultAsync(f =>
            f.FollowerId == currentUserId && f.FollowingId == userId
        );

        if (follow == null)
        {
            // Also check for pending follow request and cancel it
            var pendingRequest = await Context.FollowRequests.FirstOrDefaultAsync(fr =>
                fr.RequesterId == currentUserId && fr.TargetId == userId && fr.Status == FollowRequestStatus.Pending
            );
            if (pendingRequest != null)
            {
                Context.FollowRequests.Remove(pendingRequest);
                await Context.SaveChangesAsync();
                return Ok(new { message = "Follow request cancelled" });
            }
            return NotFound("Not following this user");
        }

        Context.UserFollowers.Remove(follow);
        await Context.SaveChangesAsync();

        return Ok();
    }

    /// <summary>
    /// Check if the current user is following a specific user.
    /// </summary>
    [HttpGet("follow/{userId}/status")]
    public async Task<ActionResult<FollowStatusResponse>> GetFollowStatus(string userId)
    {
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (currentUserId == null)
            return Unauthorized();

        var isFollowing = await Context.UserFollowers.AnyAsync(f =>
            f.FollowerId == currentUserId && f.FollowingId == userId
        );

        var isFollowedBy = await Context.UserFollowers.AnyAsync(f =>
            f.FollowerId == userId && f.FollowingId == currentUserId
        );

        var hasPendingRequest = await Context.FollowRequests.AnyAsync(fr =>
            fr.RequesterId == currentUserId && fr.TargetId == userId && fr.Status == FollowRequestStatus.Pending
        );

        // Check if the target user has a pending request TO the current user
        var incomingRequest = await Context.FollowRequests.FirstOrDefaultAsync(fr =>
            fr.RequesterId == userId && fr.TargetId == currentUserId && fr.Status == FollowRequestStatus.Pending
        );

        var targetUser = await Context.Users.FindAsync(userId);
        var isPrivate = targetUser?.IsPrivate ?? false;

        return Ok(new FollowStatusResponse(isFollowing, isFollowedBy, hasPendingRequest, isPrivate, incomingRequest?.Id));
    }

    /// <summary>
    /// Get a user's followers with pagination.
    /// </summary>
    [HttpGet("follow/{userId}/followers")]
    [AllowAnonymous]
    public async Task<ActionResult<FollowListResponse>> GetFollowers(string userId, [FromQuery] FollowListQuery query)
    {
        var user = await Context.Users.FindAsync(userId);
        if (user == null)
            return NotFound("User not found");

        var followersQuery = Context.UserFollowers
            .Where(f => f.FollowingId == userId)
            .Include(f => f.Follower)
            .OrderByDescending(f => f.CreatedAt);

        var totalCount = await followersQuery.CountAsync();
        var totalPages = (int)Math.Ceiling(totalCount / (double)query.PageSize);

        var followers = await followersQuery
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .Select(f => new FollowUserResponse(f.Follower.Id, f.Follower.UserName ?? "Unknown", f.CreatedAt))
            .ToListAsync();

        return Ok(new FollowListResponse(followers, totalCount, query.Page, query.PageSize, totalPages));
    }

    /// <summary>
    /// Get users that a user is following with pagination.
    /// </summary>
    [HttpGet("follow/{userId}/following")]
    [AllowAnonymous]
    public async Task<ActionResult<FollowListResponse>> GetFollowing(string userId, [FromQuery] FollowListQuery query)
    {
        var user = await Context.Users.FindAsync(userId);
        if (user == null)
            return NotFound("User not found");

        var followingQuery = Context.UserFollowers
            .Where(f => f.FollowerId == userId)
            .Include(f => f.Following)
            .OrderByDescending(f => f.CreatedAt);

        var totalCount = await followingQuery.CountAsync();
        var totalPages = (int)Math.Ceiling(totalCount / (double)query.PageSize);

        var following = await followingQuery
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .Select(f => new FollowUserResponse(f.Following.Id, f.Following.UserName ?? "Unknown", f.CreatedAt))
            .ToListAsync();

        return Ok(new FollowListResponse(following, totalCount, query.Page, query.PageSize, totalPages));
    }

    /// <summary>
    /// Get follower and following counts for a user.
    /// </summary>
    [HttpGet("follow/{userId}/counts")]
    [AllowAnonymous]
    public async Task<ActionResult<FollowCountsResponse>> GetFollowCounts(string userId)
    {
        var user = await Context.Users.FindAsync(userId);
        if (user == null)
            return NotFound("User not found");

        var followerCount = await Context.UserFollowers.CountAsync(f => f.FollowingId == userId);
        var followingCount = await Context.UserFollowers.CountAsync(f => f.FollowerId == userId);

        return Ok(new FollowCountsResponse(followerCount, followingCount));
    }

    // ============ Notifications ============

    /// <summary>
    /// Get community notifications for the current user.
    /// </summary>
    [HttpGet("notifications")]
    public async Task<ActionResult<CommunityNotificationListResponse>> GetNotifications([FromQuery] NotificationListQuery query)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null)
            return Unauthorized();

        // Filter to only community-related notification types
        var communityTypes = new[]
        {
            NotificationType.NewFollower,
            NotificationType.PostLiked,
            NotificationType.PostCommented,
            NotificationType.CommentReplied
        };

        var notificationsQuery = Context.Notifications
            .Where(n => n.UserId == userId && communityTypes.Contains(n.Type) && !n.IsDeleted)
            .AsQueryable();

        if (query.UnreadOnly == true)
            notificationsQuery = notificationsQuery.Where(n => !n.IsRead);

        var totalCount = await notificationsQuery.CountAsync();
        var unreadCount = await Context.Notifications
            .CountAsync(n => n.UserId == userId && communityTypes.Contains(n.Type) && !n.IsRead && !n.IsDeleted);
        var totalPages = (int)Math.Ceiling(totalCount / (double)query.PageSize);

        var notifications = await notificationsQuery
            .OrderByDescending(n => n.CreatedAt)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .Select(n => new CommunityNotificationResponse(
                n.Id,
                n.Type,
                n.Title,
                n.Message,
                n.IsRead,
                n.ReadAt,
                n.ActionUrl,
                n.CreatedAt
            ))
            .ToListAsync();

        return Ok(new CommunityNotificationListResponse(notifications, totalCount, unreadCount, query.Page, query.PageSize, totalPages));
    }

    /// <summary>
    /// Get notification counts for the current user.
    /// </summary>
    [HttpGet("notifications/count")]
    public async Task<ActionResult<NotificationCountResponse>> GetNotificationCount()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null)
            return Unauthorized();

        var communityTypes = new[]
        {
            NotificationType.NewFollower,
            NotificationType.PostLiked,
            NotificationType.PostCommented,
            NotificationType.CommentReplied
        };

        var totalCount = await Context.Notifications
            .CountAsync(n => n.UserId == userId && communityTypes.Contains(n.Type) && !n.IsDeleted);
        var unreadCount = await Context.Notifications
            .CountAsync(n => n.UserId == userId && communityTypes.Contains(n.Type) && !n.IsRead && !n.IsDeleted);

        return Ok(new NotificationCountResponse(totalCount, unreadCount));
    }

    /// <summary>
    /// Mark a notification as read.
    /// </summary>
    [HttpPost("notifications/{id:guid}/read")]
    public async Task<ActionResult> MarkNotificationRead(Guid id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null)
            return Unauthorized();

        var notification = await Context.Notifications.FindAsync(id);
        if (notification == null)
            return NotFound("Notification not found");

        if (notification.UserId != userId)
            return Forbid();

        notification.IsRead = true;
        notification.ReadAt = DateTime.UtcNow;
        await Context.SaveChangesAsync();

        return Ok();
    }

    /// <summary>
    /// Mark all community notifications as read.
    /// </summary>
    [HttpPost("notifications/read-all")]
    public async Task<ActionResult> MarkAllNotificationsRead()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null)
            return Unauthorized();

        var communityTypes = new[]
        {
            NotificationType.NewFollower,
            NotificationType.PostLiked,
            NotificationType.PostCommented,
            NotificationType.CommentReplied
        };

        await Context.Notifications
            .Where(n => n.UserId == userId && communityTypes.Contains(n.Type) && !n.IsRead)
            .ExecuteUpdateAsync(s => s
                .SetProperty(n => n.IsRead, true)
                .SetProperty(n => n.ReadAt, DateTime.UtcNow));

        return Ok(new { message = "All notifications marked as read" });
    }

    /// <summary>
    /// Delete a notification.
    /// </summary>
    [HttpDelete("notifications/{id:guid}")]
    public async Task<ActionResult> DeleteNotification(Guid id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null)
            return Unauthorized();

        var notification = await Context.Notifications.FindAsync(id);
        if (notification == null)
            return NotFound("Notification not found");

        if (notification.UserId != userId)
            return Forbid();

        notification.IsDeleted = true;
        notification.DeletedAt = DateTime.UtcNow;
        await Context.SaveChangesAsync();

        return NoContent();
    }

    /// <summary>
    /// Delete all community notifications for the current user.
    /// </summary>
    [HttpDelete("notifications/all")]
    public async Task<ActionResult> DeleteAllNotifications()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null)
            return Unauthorized();

        var communityTypes = new[]
        {
            NotificationType.NewFollower,
            NotificationType.PostLiked,
            NotificationType.PostCommented,
            NotificationType.CommentReplied
        };

        await Context.Notifications
            .Where(n => n.UserId == userId && communityTypes.Contains(n.Type))
            .ExecuteUpdateAsync(s => s
                .SetProperty(n => n.IsDeleted, true)
                .SetProperty(n => n.DeletedAt, DateTime.UtcNow));

        return NoContent();
    }

    // ============ Helper Methods ============

    /// <summary>
    /// Creates a community notification for a user.
    /// </summary>
    private async Task CreateNotificationAsync(
        string userId,
        NotificationType type,
        string title,
        string message,
        string? actionUrl = null)
    {
        var notification = new Notification
        {
            UserId = userId,
            Type = type,
            Title = title,
            Message = message,
            ActionUrl = actionUrl
        };

        Context.Notifications.Add(notification);
        await Context.SaveChangesAsync();
    }

    // ============ Reports ============

    /// <summary>
    /// Report a post, comment, or user.
    /// </summary>
    [HttpPost("reports")]
    public async Task<ActionResult<ReportResponse>> CreateReport([FromBody] CreateReportDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null)
            return Unauthorized();

        // Validate target exists based on report type
        switch (dto.ReportType)
        {
            case ReportType.Post:
                if (!dto.PostId.HasValue)
                    return BadRequest("PostId is required for post reports");
                var post = await Context.Posts.FindAsync(dto.PostId.Value);
                if (post == null)
                    return NotFound("Post not found");
                break;

            case ReportType.Comment:
                if (!dto.CommentId.HasValue)
                    return BadRequest("CommentId is required for comment reports");
                var comment = await Context.PostComments.FindAsync(dto.CommentId.Value);
                if (comment == null)
                    return NotFound("Comment not found");
                break;

            case ReportType.User:
                if (string.IsNullOrEmpty(dto.ReportedUserId))
                    return BadRequest("ReportedUserId is required for user reports");
                if (dto.ReportedUserId == userId)
                    return BadRequest("Cannot report yourself");
                var targetUser = await Context.Users.FindAsync(dto.ReportedUserId);
                if (targetUser == null)
                    return NotFound("User not found");
                break;
        }

        // Check for duplicate pending report
        var existingReport = await Context.Reports.FirstOrDefaultAsync(r =>
            r.ReporterId == userId &&
            r.Status == ReportStatus.Pending &&
            r.ReportType == dto.ReportType &&
            r.PostId == dto.PostId &&
            r.CommentId == dto.CommentId &&
            r.ReportedUserId == dto.ReportedUserId
        );

        if (existingReport != null)
            return BadRequest("You have already reported this content");

        var report = new Report
        {
            ReporterId = userId,
            ReportType = dto.ReportType,
            PostId = dto.PostId,
            CommentId = dto.CommentId,
            ReportedUserId = dto.ReportedUserId,
            Reason = dto.Reason,
            Description = dto.Description
        };

        Context.Reports.Add(report);
        await Context.SaveChangesAsync();

        var reporter = await Context.Users.FindAsync(userId);

        return CreatedAtAction(
            nameof(GetMyReports),
            new ReportResponse(
                report.Id,
                report.ReporterId,
                reporter?.UserName ?? "Unknown",
                report.ReportType,
                report.PostId,
                report.CommentId,
                report.ReportedUserId,
                report.Reason,
                report.Description,
                report.Status,
                report.CreatedAt
            )
        );
    }

    /// <summary>
    /// Get reports submitted by the current user.
    /// </summary>
    [HttpGet("reports/my")]
    public async Task<ActionResult<List<ReportResponse>>> GetMyReports()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null)
            return Unauthorized();

        var reports = await Context.Reports
            .Include(r => r.Reporter)
            .Where(r => r.ReporterId == userId)
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new ReportResponse(
                r.Id,
                r.ReporterId,
                r.Reporter.UserName ?? "Unknown",
                r.ReportType,
                r.PostId,
                r.CommentId,
                r.ReportedUserId,
                r.Reason,
                r.Description,
                r.Status,
                r.CreatedAt
            ))
            .ToListAsync();

        return Ok(reports);
    }

    /// <summary>
    /// [Admin] Get all reports with filtering and pagination.
    /// </summary>
    [HttpGet("admin/reports")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<ReportListResponse>> GetAllReports([FromQuery] ReportListQuery query)
    {
        var reportsQuery = Context.Reports
            .Include(r => r.Reporter)
            .Include(r => r.ReportedUser)
            .AsQueryable();

        if (query.Status.HasValue)
            reportsQuery = reportsQuery.Where(r => r.Status == query.Status.Value);

        if (query.Type.HasValue)
            reportsQuery = reportsQuery.Where(r => r.ReportType == query.Type.Value);

        var totalCount = await reportsQuery.CountAsync();
        var totalPages = (int)Math.Ceiling(totalCount / (double)query.PageSize);

        var reports = await reportsQuery
            .OrderByDescending(r => r.CreatedAt)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .Select(r => new AdminReportResponse(
                r.Id,
                r.ReporterId,
                r.Reporter.UserName ?? "Unknown",
                r.ReportType,
                r.PostId,
                r.CommentId,
                r.ReportedUserId,
                r.ReportedUser != null ? r.ReportedUser.UserName : null,
                r.Reason,
                r.Description,
                r.Status,
                r.AdminNotes,
                r.ReviewedById,
                r.CreatedAt,
                r.ReviewedAt
            ))
            .ToListAsync();

        return Ok(new ReportListResponse(reports, totalCount, query.Page, query.PageSize, totalPages));
    }

    /// <summary>
    /// [Admin] Update a report's status.
    /// </summary>
    [HttpPut("admin/reports/{id:guid}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult> UpdateReportStatus(Guid id, [FromBody] UpdateReportStatusDto dto)
    {
        var adminId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (adminId == null)
            return Unauthorized();

        var report = await Context.Reports.FindAsync(id);
        if (report == null)
            return NotFound("Report not found");

        report.Status = dto.Status;
        report.AdminNotes = dto.AdminNotes;
        report.ReviewedById = adminId;
        report.ReviewedAt = DateTime.UtcNow;

        await Context.SaveChangesAsync();

        return Ok(new { message = "Report updated successfully" });
    }

    // ============ Blocking ============

    /// <summary>
    /// Block a user.
    /// </summary>
    [HttpPost("block/{userId}")]
    public async Task<ActionResult> BlockUser(string userId)
    {
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (currentUserId == null)
            return Unauthorized();

        if (currentUserId == userId)
            return BadRequest("Cannot block yourself");

        var targetUser = await Context.Users.FindAsync(userId);
        if (targetUser == null)
            return NotFound("User not found");

        var existingBlock = await Context.UserBlocks
            .FirstOrDefaultAsync(b => b.BlockerId == currentUserId && b.BlockedId == userId);

        if (existingBlock != null)
            return BadRequest("User already blocked");

        var block = new UserBlock
        {
            BlockerId = currentUserId,
            BlockedId = userId
        };

        Context.UserBlocks.Add(block);

        // Also remove any follow relationships between the users
        var followsToRemove = await Context.UserFollowers
            .Where(f => (f.FollowerId == currentUserId && f.FollowingId == userId) ||
                        (f.FollowerId == userId && f.FollowingId == currentUserId))
            .ToListAsync();

        Context.UserFollowers.RemoveRange(followsToRemove);

        await Context.SaveChangesAsync();

        return Ok(new { message = "User blocked successfully" });
    }

    /// <summary>
    /// Unblock a user.
    /// </summary>
    [HttpDelete("block/{userId}")]
    public async Task<ActionResult> UnblockUser(string userId)
    {
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (currentUserId == null)
            return Unauthorized();

        var block = await Context.UserBlocks
            .FirstOrDefaultAsync(b => b.BlockerId == currentUserId && b.BlockedId == userId);

        if (block == null)
            return NotFound("User not blocked");

        Context.UserBlocks.Remove(block);
        await Context.SaveChangesAsync();

        return Ok(new { message = "User unblocked successfully" });
    }

    /// <summary>
    /// Check block status between current user and another user.
    /// </summary>
    [HttpGet("block/{userId}/status")]
    public async Task<ActionResult<BlockStatusResponse>> GetBlockStatus(string userId)
    {
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (currentUserId == null)
            return Unauthorized();

        var isBlocked = await Context.UserBlocks
            .AnyAsync(b => b.BlockerId == currentUserId && b.BlockedId == userId);

        var isBlockedBy = await Context.UserBlocks
            .AnyAsync(b => b.BlockerId == userId && b.BlockedId == currentUserId);

        return Ok(new BlockStatusResponse(isBlocked, isBlockedBy));
    }

    /// <summary>
    /// Get list of users blocked by current user.
    /// </summary>
    [HttpGet("block/list")]
    public async Task<ActionResult<BlockListResponse>> GetBlockedUsers([FromQuery] BlockListQuery query)
    {
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (currentUserId == null)
            return Unauthorized();

        var blocksQuery = Context.UserBlocks
            .Where(b => b.BlockerId == currentUserId)
            .Include(b => b.Blocked)
            .OrderByDescending(b => b.CreatedAt);

        var totalCount = await blocksQuery.CountAsync();
        var totalPages = (int)Math.Ceiling(totalCount / (double)query.PageSize);

        var blockedUsers = await blocksQuery
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .Select(b => new BlockedUserResponse(b.Blocked.Id, b.Blocked.UserName ?? "Unknown", b.CreatedAt))
            .ToListAsync();

        return Ok(new BlockListResponse(blockedUsers, totalCount, query.Page, query.PageSize, totalPages));
    }

    /// <summary>
    /// Helper method to check if a user is blocked.
    /// </summary>
    private async Task<bool> IsBlockedAsync(string userId1, string userId2)
    {
        return await Context.UserBlocks.AnyAsync(b =>
            (b.BlockerId == userId1 && b.BlockedId == userId2) ||
            (b.BlockerId == userId2 && b.BlockedId == userId1)
        );
    }

    // ============ Helper: Build PostSummaryResponse ============

    private async Task<PostSummaryResponse> BuildPostSummaryAsync(Post post, string? userId)
    {
        var photoUrl = await storageService.DownloadFileAsync(post.Photo);
        var isBookmarked = userId != null && post.Bookmarks.Any(b => b.UserId.ToString() == userId);
        var userReaction = userId != null ? post.Reactions.FirstOrDefault(r => r.UserId.ToString() == userId)?.ReactionType : null;

        return new PostSummaryResponse(
            post.Id, post.AuthorId, post.Author.UserName ?? "Unknown",
            post.Caption, post.PhotoId, photoUrl, post.PostStatus,
            post.Comments.Count, post.Reactions.Count, isBookmarked, userReaction,
            post.CreatedAt,
            post.Tags.Select(t => t.Tag.Name).ToList(),
            post.Shares.Count, post.Views.Count, post.IsNsfw, post.ContentWarning
        );
    }

    // ============ Helper: Tag Upsert ============

    private async Task UpsertTagsAsync(Guid postId, List<string> tagNames)
    {
        // Remove existing tags for this post
        var existingPostTags = await Context.PostTags.Where(pt => pt.PostId == postId).ToListAsync();
        Context.PostTags.RemoveRange(existingPostTags);

        foreach (var rawName in tagNames)
        {
            var name = rawName.Trim().ToLowerInvariant().TrimStart('#');
            if (string.IsNullOrEmpty(name)) continue;

            var tag = await Context.Tags.FirstOrDefaultAsync(t => t.Name == name);
            if (tag is null)
            {
                tag = new Tag { Name = name };
                Context.Tags.Add(tag);
                await Context.SaveChangesAsync();
            }

            Context.PostTags.Add(new PostTag { PostId = postId, TagId = tag.Id });
        }
        await Context.SaveChangesAsync();
    }

    // ============ Helper: Mention Parsing ============

    private async Task ParseAndNotifyMentionsAsync(string senderUserId, string text, Guid postId)
    {
        var matches = Regex.Matches(text, @"@(\w+)");
        var mentionedUsernames = matches.Select(m => m.Groups[1].Value).Distinct().ToList();

        foreach (var username in mentionedUsernames)
        {
            var mentionedUser = await Context.Users.FirstOrDefaultAsync(u => u.UserName == username);
            if (mentionedUser is null || mentionedUser.Id == senderUserId) continue;

            await CreateNotificationAsync(
                mentionedUser.Id,
                NotificationType.Mentioned,
                "You were mentioned",
                $"{(await Context.Users.FindAsync(senderUserId))?.UserName ?? "Someone"} mentioned you",
                $"/community/posts/{postId}"
            );
        }
    }

    // ============ Content Discovery ============

    /// <summary>
    /// Gets trending posts scored by recency and engagement.
    /// </summary>
    [HttpGet("posts/trending")]
    [AllowAnonymous]
    public async Task<ActionResult<PostFeedResponse>> GetTrendingPosts([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        var postsQuery = Context.Posts
            .Include(p => p.Author).Include(p => p.Photo)
            .Include(p => p.Comments).Include(p => p.Reactions).Include(p => p.Bookmarks)
            .Include(p => p.Tags).ThenInclude(pt => pt.Tag)
            .Include(p => p.Shares).Include(p => p.Views)
            .Where(p => p.Visibility == PostVisibility.Visible && p.PostStatus == PostStatus.Published);

        if (userId != null)
        {
            postsQuery = postsQuery.Where(p => !Context.UserBlocks.Any(b =>
                (b.BlockerId == userId && b.BlockedId == p.AuthorId) ||
                (b.BlockerId == p.AuthorId && b.BlockedId == userId)));
            postsQuery = postsQuery.Where(p => !Context.UserMutes.Any(m =>
                m.MuterId == userId && m.MutedId == p.AuthorId));
        }

        // Hide posts from private profiles unless the viewer follows them
        postsQuery = postsQuery.Where(p => !p.Author.IsPrivate
            || p.AuthorId == userId
            || (userId != null && Context.UserFollowers.Any(f => f.FollowerId == userId && f.FollowingId == p.AuthorId)));

        var allPosts = await postsQuery.ToListAsync();

        // Trending score: engagement weighted by recency
        var now = DateTime.UtcNow;
        var scored = allPosts.Select(p =>
        {
            var ageHours = Math.Max(1, (now - p.CreatedAt).TotalHours);
            var engagement = p.Reactions.Count * 3 + p.Comments.Count * 2 + p.Views.Count + p.Shares.Count * 4;
            var score = engagement / Math.Pow(ageHours, 1.5);
            return (Post: p, Score: score);
        })
        .OrderByDescending(x => x.Score)
        .ToList();

        var totalCount = scored.Count;
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        var pagedPosts = scored.Skip((page - 1) * pageSize).Take(pageSize).ToList();

        var summaries = new List<PostSummaryResponse>();
        foreach (var (post, _) in pagedPosts)
            summaries.Add(await BuildPostSummaryAsync(post, userId));

        return Ok(new PostFeedResponse(summaries, totalCount, page, pageSize, totalPages));
    }

    /// <summary>
    /// Gets posts by tag/hashtag.
    /// </summary>
    [HttpGet("tags/{tag}/posts")]
    [AllowAnonymous]
    public async Task<ActionResult<PostFeedResponse>> GetPostsByTag(string tag, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var normalizedTag = tag.Trim().ToLowerInvariant().TrimStart('#');

        var postsQuery = Context.Posts
            .Include(p => p.Author).Include(p => p.Photo)
            .Include(p => p.Comments).Include(p => p.Reactions).Include(p => p.Bookmarks)
            .Include(p => p.Tags).ThenInclude(pt => pt.Tag)
            .Include(p => p.Shares).Include(p => p.Views)
            .Where(p => p.Visibility == PostVisibility.Visible && p.PostStatus == PostStatus.Published)
            .Where(p => p.Tags.Any(t => t.Tag.Name == normalizedTag))
            .Where(p => !p.Author.IsPrivate
                || p.AuthorId == userId
                || (userId != null && Context.UserFollowers.Any(f => f.FollowerId == userId && f.FollowingId == p.AuthorId)));

        var totalCount = await postsQuery.CountAsync();
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        var posts = await postsQuery.OrderByDescending(p => p.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

        var summaries = new List<PostSummaryResponse>();
        foreach (var post in posts)
            summaries.Add(await BuildPostSummaryAsync(post, userId));

        return Ok(new PostFeedResponse(summaries, totalCount, page, pageSize, totalPages));
    }

    /// <summary>
    /// Gets popular tags by post count.
    /// </summary>
    [HttpGet("tags/popular")]
    [AllowAnonymous]
    public async Task<ActionResult<List<TagSummaryResponse>>> GetPopularTags([FromQuery] int limit = 20)
    {
        var tags = await Context.Tags
            .Select(t => new TagSummaryResponse(t.Name, t.PostTags.Count))
            .OrderByDescending(t => t.PostCount)
            .Take(limit)
            .ToListAsync();

        return Ok(tags);
    }

    /// <summary>
    /// Gets personalized "For You" feed from followed users, trending-scored.
    /// </summary>
    [HttpGet("posts/feed")]
    public async Task<ActionResult<PostFeedResponse>> GetForYouFeed([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null) return Unauthorized();

        var followedIds = await Context.UserFollowers
            .Where(uf => uf.FollowerId == userId)
            .Select(uf => uf.FollowingId)
            .ToListAsync();

        var postsQuery = Context.Posts
            .Include(p => p.Author).Include(p => p.Photo)
            .Include(p => p.Comments).Include(p => p.Reactions).Include(p => p.Bookmarks)
            .Include(p => p.Tags).ThenInclude(pt => pt.Tag)
            .Include(p => p.Shares).Include(p => p.Views)
            .Where(p => p.Visibility == PostVisibility.Visible && p.PostStatus == PostStatus.Published)
            .Where(p => followedIds.Contains(p.AuthorId))
            .Where(p => !Context.UserBlocks.Any(b =>
                (b.BlockerId == userId && b.BlockedId == p.AuthorId) ||
                (b.BlockerId == p.AuthorId && b.BlockedId == userId)))
            .Where(p => !Context.UserMutes.Any(m =>
                m.MuterId == userId && m.MutedId == p.AuthorId));

        var totalCount = await postsQuery.CountAsync();
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        var posts = await postsQuery.OrderByDescending(p => p.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

        var summaries = new List<PostSummaryResponse>();
        foreach (var post in posts)
            summaries.Add(await BuildPostSummaryAsync(post, userId));

        return Ok(new PostFeedResponse(summaries, totalCount, page, pageSize, totalPages));
    }

    /// <summary>
    /// Gets explore page — posts from unfollowed users, trending-scored.
    /// </summary>
    [HttpGet("posts/explore")]
    public async Task<ActionResult<PostFeedResponse>> GetExplorePosts([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null) return Unauthorized();

        var followedIds = await Context.UserFollowers
            .Where(uf => uf.FollowerId == userId)
            .Select(uf => uf.FollowingId)
            .ToListAsync();

        var postsQuery = Context.Posts
            .Include(p => p.Author).Include(p => p.Photo)
            .Include(p => p.Comments).Include(p => p.Reactions).Include(p => p.Bookmarks)
            .Include(p => p.Tags).ThenInclude(pt => pt.Tag)
            .Include(p => p.Shares).Include(p => p.Views)
            .Where(p => p.Visibility == PostVisibility.Visible && p.PostStatus == PostStatus.Published)
            .Where(p => p.AuthorId != userId && !followedIds.Contains(p.AuthorId))
            .Where(p => !Context.UserBlocks.Any(b =>
                (b.BlockerId == userId && b.BlockedId == p.AuthorId) ||
                (b.BlockerId == p.AuthorId && b.BlockedId == userId)))
            .Where(p => !Context.UserMutes.Any(m =>
                m.MuterId == userId && m.MutedId == p.AuthorId))
            .Where(p => !p.Author.IsPrivate);

        var allPosts = await postsQuery.ToListAsync();

        var now = DateTime.UtcNow;
        var scored = allPosts.Select(p =>
        {
            var ageHours = Math.Max(1, (now - p.CreatedAt).TotalHours);
            var engagement = p.Reactions.Count * 3 + p.Comments.Count * 2 + p.Views.Count + p.Shares.Count * 4;
            return (Post: p, Score: engagement / Math.Pow(ageHours, 1.5));
        })
        .OrderByDescending(x => x.Score).ToList();

        var totalCount = scored.Count;
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);
        var pagedPosts = scored.Skip((page - 1) * pageSize).Take(pageSize);

        var summaries = new List<PostSummaryResponse>();
        foreach (var (post, _) in pagedPosts)
            summaries.Add(await BuildPostSummaryAsync(post, userId));

        return Ok(new PostFeedResponse(summaries, totalCount, page, pageSize, totalPages));
    }

    // ============ Comment Reactions ============

    /// <summary>
    /// React to a comment.
    /// </summary>
    [HttpPost("comments/{commentId:guid}/reactions")]
    public async Task<ActionResult> ReactToComment(Guid commentId, [FromBody] CreateCommentReactionDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null) return Unauthorized();

        var comment = await Context.PostComments.Include(c => c.Author).FirstOrDefaultAsync(c => c.Id == commentId);
        if (comment is null) return NotFound(new { message = "Comment not found" });

        var existing = await Context.CommentReactions.FirstOrDefaultAsync(cr => cr.CommentId == commentId && cr.UserId == userId);
        if (existing is not null)
        {
            existing.ReactionType = dto.ReactionType;
            await Context.SaveChangesAsync();
            return Ok(new { message = "Reaction updated" });
        }

        Context.CommentReactions.Add(new CommentReaction
        {
            CommentId = commentId,
            UserId = userId,
            ReactionType = dto.ReactionType
        });
        await Context.SaveChangesAsync();

        if (comment.AuthorId != userId)
        {
            await CreateNotificationAsync(comment.AuthorId, NotificationType.CommentReacted,
                "Comment Reacted", $"Someone reacted to your comment",
                $"/community/posts/{comment.PostId}");
        }

        return Ok(new { message = "Reaction added" });
    }

    /// <summary>
    /// Remove reaction from a comment.
    /// </summary>
    [HttpDelete("comments/{commentId:guid}/reactions")]
    public async Task<ActionResult> RemoveCommentReaction(Guid commentId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null) return Unauthorized();

        var reaction = await Context.CommentReactions.FirstOrDefaultAsync(cr => cr.CommentId == commentId && cr.UserId == userId);
        if (reaction is null) return NotFound(new { message = "Reaction not found" });

        Context.CommentReactions.Remove(reaction);
        await Context.SaveChangesAsync();
        return Ok(new { message = "Reaction removed" });
    }

    // ============ Post Shares ============

    /// <summary>
    /// Share/repost a post.
    /// </summary>
    [HttpPost("posts/{postId:guid}/share")]
    public async Task<ActionResult> SharePost(Guid postId, [FromBody] CreateShareDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null) return Unauthorized();

        var post = await Context.Posts.Include(p => p.Author).FirstOrDefaultAsync(p => p.Id == postId && p.Visibility == PostVisibility.Visible);
        if (post is null) return NotFound(new { message = "Post not found" });

        Context.PostShares.Add(new PostShare { PostId = postId, UserId = userId, Caption = dto.Caption });
        await Context.SaveChangesAsync();

        if (post.AuthorId != userId)
        {
            await CreateNotificationAsync(post.AuthorId, NotificationType.PostShared,
                "Post Shared", $"Someone shared your post",
                $"/community/posts/{postId}");
        }

        return Ok(new { message = "Post shared" });
    }

    /// <summary>
    /// Get share count for a post.
    /// </summary>
    [HttpGet("posts/{postId:guid}/shares")]
    [AllowAnonymous]
    public async Task<ActionResult<ShareCountResponse>> GetShareCount(Guid postId)
    {
        var count = await Context.PostShares.CountAsync(s => s.PostId == postId);
        return Ok(new ShareCountResponse(count));
    }

    // ============ Pinned Posts ============

    /// <summary>
    /// Pin a post to author's profile.
    /// </summary>
    [HttpPost("posts/{id:guid}/pin")]
    public async Task<ActionResult> PinPost(Guid id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null) return Unauthorized();

        var post = await Context.Posts.FirstOrDefaultAsync(p => p.Id == id);
        if (post is null) return NotFound(new { message = "Post not found" });
        if (post.AuthorId != userId) return Forbid();

        post.IsPinned = true;
        post.PinnedAt = DateTime.UtcNow;
        await Context.SaveChangesAsync();
        return Ok(new { message = "Post pinned" });
    }

    /// <summary>
    /// Unpin a post.
    /// </summary>
    [HttpDelete("posts/{id:guid}/pin")]
    public async Task<ActionResult> UnpinPost(Guid id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null) return Unauthorized();

        var post = await Context.Posts.FirstOrDefaultAsync(p => p.Id == id);
        if (post is null) return NotFound(new { message = "Post not found" });
        if (post.AuthorId != userId) return Forbid();

        post.IsPinned = false;
        post.PinnedAt = null;
        await Context.SaveChangesAsync();
        return Ok(new { message = "Post unpinned" });
    }

    /// <summary>
    /// Get pinned posts for a user.
    /// </summary>
    [HttpGet("users/{authorId}/posts/pinned")]
    [AllowAnonymous]
    public async Task<ActionResult<List<PostSummaryResponse>>> GetPinnedPosts(string authorId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        // If the profile is private and the viewer is not the owner or a follower, return empty
        var pinnedAuthor = await Context.Users.FindAsync(authorId);
        if (pinnedAuthor is not null && pinnedAuthor.IsPrivate && userId != authorId)
        {
            var isFollower = userId != null && await Context.UserFollowers.AnyAsync(f =>
                f.FollowerId == userId && f.FollowingId == authorId);
            if (!isFollower)
                return Ok(new List<PostSummaryResponse>());
        }

        var posts = await Context.Posts
            .Include(p => p.Author).Include(p => p.Photo)
            .Include(p => p.Comments).Include(p => p.Reactions).Include(p => p.Bookmarks)
            .Include(p => p.Tags).ThenInclude(pt => pt.Tag)
            .Include(p => p.Shares).Include(p => p.Views)
            .Where(p => p.AuthorId == authorId && p.IsPinned && p.Visibility == PostVisibility.Visible && p.PostStatus == PostStatus.Published)
            .OrderByDescending(p => p.PinnedAt)
            .ToListAsync();

        var summaries = new List<PostSummaryResponse>();
        foreach (var post in posts)
            summaries.Add(await BuildPostSummaryAsync(post, userId));

        return Ok(summaries);
    }

    // ============ Moderation: Content Flagging ============

    /// <summary>
    /// [Admin] Flag a post as NSFW or add content warning.
    /// </summary>
    [HttpPut("admin/posts/{id:guid}/flag")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult> FlagPost(Guid id, [FromBody] FlagPostDto dto)
    {
        var post = await Context.Posts.FindAsync(id);
        if (post is null) return NotFound(new { message = "Post not found" });

        post.IsNsfw = dto.IsNsfw;
        post.ContentWarning = dto.ContentWarning;
        await Context.SaveChangesAsync();
        return Ok(new { message = "Post flagged" });
    }

    // ============ Mute Users ============

    /// <summary>
    /// Mute a user. Their content will be hidden from your feeds.
    /// </summary>
    [HttpPost("mute/{userId}")]
    public async Task<ActionResult> MuteUser(string userId)
    {
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (currentUserId is null) return Unauthorized();
        if (currentUserId == userId) return BadRequest(new { message = "Cannot mute yourself" });

        var targetUser = await Context.Users.FindAsync(userId);
        if (targetUser is null) return NotFound(new { message = "User not found" });

        var existing = await Context.UserMutes.FirstOrDefaultAsync(m => m.MuterId == currentUserId && m.MutedId == userId);
        if (existing is not null) return Conflict(new { message = "User already muted" });

        Context.UserMutes.Add(new UserMute { MuterId = currentUserId, MutedId = userId });
        await Context.SaveChangesAsync();
        return Ok(new { message = "User muted" });
    }

    /// <summary>
    /// Unmute a user.
    /// </summary>
    [HttpDelete("mute/{userId}")]
    public async Task<ActionResult> UnmuteUser(string userId)
    {
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (currentUserId is null) return Unauthorized();

        var mute = await Context.UserMutes.FirstOrDefaultAsync(m => m.MuterId == currentUserId && m.MutedId == userId);
        if (mute is null) return NotFound(new { message = "Not muted" });

        Context.UserMutes.Remove(mute);
        await Context.SaveChangesAsync();
        return Ok(new { message = "User unmuted" });
    }

    /// <summary>
    /// Get list of muted users.
    /// </summary>
    [HttpGet("mute/list")]
    public async Task<ActionResult<MuteListResponse>> GetMutedUsers([FromQuery] MuteListQuery query)
    {
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (currentUserId is null) return Unauthorized();

        var mutesQuery = Context.UserMutes
            .Where(m => m.MuterId == currentUserId)
            .Include(m => m.Muted)
            .OrderByDescending(m => m.CreatedAt);

        var totalCount = await mutesQuery.CountAsync();
        var totalPages = (int)Math.Ceiling(totalCount / (double)query.PageSize);

        var mutedUsers = await mutesQuery
            .Skip((query.Page - 1) * query.PageSize).Take(query.PageSize)
            .Select(m => new MutedUserResponse(m.Muted.Id, m.Muted.UserName ?? "Unknown", m.CreatedAt))
            .ToListAsync();

        return Ok(new MuteListResponse(mutedUsers, totalCount, query.Page, query.PageSize, totalPages));
    }

    // ============ User Search & Suggested ============

    /// <summary>
    /// Search for users by username.
    /// </summary>
    [HttpGet("users/search")]
    public async Task<ActionResult<PagedResponse<UserSearchResult>>> SearchUsers([FromQuery] UserSearchQuery query)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null) return Unauthorized();

        var usersQuery = Context.Users.AsQueryable();

        if (!string.IsNullOrWhiteSpace(query.Q))
            usersQuery = usersQuery.Where(u => u.UserName!.Contains(query.Q) || (u.DisplayName != null && u.DisplayName.Contains(query.Q)));

        usersQuery = usersQuery.Where(u => u.Id != userId && !u.IsBanned);

        var totalCount = await usersQuery.CountAsync();
        var totalPages = (int)Math.Ceiling(totalCount / (double)query.PageSize);

        var users = await usersQuery
            .OrderBy(u => u.UserName)
            .Skip((query.Page - 1) * query.PageSize).Take(query.PageSize)
            .Select(u => new UserSearchResult(
                u.Id, u.UserName ?? "Unknown",
                u.Followers.Count,
                Context.UserFollowers.Any(uf => uf.FollowerId == userId && uf.FollowingId == u.Id),
                u.IsPrivate,
                Context.FollowRequests.Any(fr => fr.RequesterId == userId && fr.TargetId == u.Id && fr.Status == FollowRequestStatus.Pending)
            ))
            .ToListAsync();

        return Ok(new PagedResponse<UserSearchResult>(users, totalCount, query.Page, query.PageSize, totalPages));
    }

    /// <summary>
    /// Get suggested users to follow.
    /// </summary>
    [HttpGet("users/suggested")]
    public async Task<ActionResult<List<UserSearchResult>>> GetSuggestedUsers([FromQuery] int limit = 10)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null) return Unauthorized();

        var followedIds = await Context.UserFollowers
            .Where(uf => uf.FollowerId == userId)
            .Select(uf => uf.FollowingId).ToListAsync();

        var blockedIds = await Context.UserBlocks
            .Where(b => b.BlockerId == userId || b.BlockedId == userId)
            .Select(b => b.BlockerId == userId ? b.BlockedId : b.BlockerId).ToListAsync();

        var excludeIds = followedIds.Concat(blockedIds).Append(userId).Distinct().ToList();

        var suggested = await Context.Users
            .Where(u => !excludeIds.Contains(u.Id) && !u.IsBanned)
            .OrderByDescending(u => u.Followers.Count)
            .Take(limit)
            .Select(u => new UserSearchResult(u.Id, u.UserName ?? "Unknown", u.Followers.Count, false, u.IsPrivate, false))
            .ToListAsync();

        return Ok(suggested);
    }

    // ============ Follow Requests (Private Accounts) ============

    /// <summary>
    /// Get incoming follow requests for the current user.
    /// </summary>
    [HttpGet("follow/requests/incoming")]
    public async Task<ActionResult<FollowRequestListResponse>> GetIncomingFollowRequests([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null) return Unauthorized();

        var requestsQuery = Context.FollowRequests
            .Where(fr => fr.TargetId == userId && fr.Status == FollowRequestStatus.Pending)
            .Include(fr => fr.Requester)
            .OrderByDescending(fr => fr.CreatedAt);

        var totalCount = await requestsQuery.CountAsync();
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        var requests = await requestsQuery
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(fr => new FollowRequestResponse(fr.Id, fr.RequesterId, fr.Requester.UserName ?? "Unknown", fr.Status, fr.CreatedAt))
            .ToListAsync();

        return Ok(new FollowRequestListResponse(requests, totalCount, page, pageSize, totalPages));
    }

    /// <summary>
    /// Approve a follow request.
    /// </summary>
    [HttpPost("follow/requests/{id:guid}/approve")]
    public async Task<ActionResult> ApproveFollowRequest(Guid id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null) return Unauthorized();

        var request = await Context.FollowRequests.FirstOrDefaultAsync(fr => fr.Id == id && fr.TargetId == userId);
        if (request is null) return NotFound(new { message = "Follow request not found" });
        if (request.Status != FollowRequestStatus.Pending) return BadRequest(new { message = "Request already processed" });

        request.Status = FollowRequestStatus.Approved;

        // Create actual follow
        Context.UserFollowers.Add(new UserFollower { FollowerId = request.RequesterId, FollowingId = userId });
        await Context.SaveChangesAsync();

        await CreateNotificationAsync(request.RequesterId, NotificationType.FollowRequestApproved,
            "Follow Request Approved", $"Your follow request was approved",
            $"/community/users/{userId}");

        return Ok(new { message = "Follow request approved" });
    }

    /// <summary>
    /// Reject a follow request.
    /// </summary>
    [HttpPost("follow/requests/{id:guid}/reject")]
    public async Task<ActionResult> RejectFollowRequest(Guid id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null) return Unauthorized();

        var request = await Context.FollowRequests.FirstOrDefaultAsync(fr => fr.Id == id && fr.TargetId == userId);
        if (request is null) return NotFound(new { message = "Follow request not found" });
        if (request.Status != FollowRequestStatus.Pending) return BadRequest(new { message = "Request already processed" });

        request.Status = FollowRequestStatus.Rejected;
        await Context.SaveChangesAsync();
        return Ok(new { message = "Follow request rejected" });
    }

    // ============ Notifications: Push Tokens & Preferences ============

    /// <summary>
    /// Register a push notification token.
    /// </summary>
    [HttpPost("notifications/push-token")]
    public async Task<ActionResult> RegisterPushToken([FromBody] RegisterPushTokenDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null) return Unauthorized();

        var existing = await Context.PushTokens.FirstOrDefaultAsync(pt => pt.Token == dto.Token);
        if (existing is not null)
        {
            existing.UserId = userId;
            existing.Platform = dto.Platform;
        }
        else
        {
            Context.PushTokens.Add(new PushToken { UserId = userId, Token = dto.Token, Platform = dto.Platform });
        }
        await Context.SaveChangesAsync();
        return Ok(new { message = "Push token registered" });
    }

    /// <summary>
    /// Remove a push notification token.
    /// </summary>
    [HttpDelete("notifications/push-token")]
    public async Task<ActionResult> RemovePushToken([FromBody] RegisterPushTokenDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null) return Unauthorized();

        var token = await Context.PushTokens.FirstOrDefaultAsync(pt => pt.Token == dto.Token && pt.UserId == userId);
        if (token is null) return NotFound(new { message = "Token not found" });

        Context.PushTokens.Remove(token);
        await Context.SaveChangesAsync();
        return Ok(new { message = "Push token removed" });
    }

    /// <summary>
    /// Get notification preferences.
    /// </summary>
    [HttpGet("notifications/preferences")]
    public async Task<ActionResult<List<NotificationPreferenceDto>>> GetNotificationPreferences()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null) return Unauthorized();

        var prefs = await Context.NotificationPreferences
            .Where(np => np.UserId == userId)
            .Select(np => new NotificationPreferenceDto(np.Type, np.InAppEnabled, np.PushEnabled))
            .ToListAsync();

        return Ok(prefs);
    }

    /// <summary>
    /// Update notification preferences.
    /// </summary>
    [HttpPut("notifications/preferences")]
    public async Task<ActionResult> UpdateNotificationPreferences([FromBody] List<NotificationPreferenceDto> prefs)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null) return Unauthorized();

        foreach (var pref in prefs)
        {
            var existing = await Context.NotificationPreferences
                .FirstOrDefaultAsync(np => np.UserId == userId && np.Type == pref.Type);
            if (existing is not null)
            {
                existing.InAppEnabled = pref.InAppEnabled;
                existing.PushEnabled = pref.PushEnabled;
            }
            else
            {
                Context.NotificationPreferences.Add(new NotificationPreference
                {
                    UserId = userId,
                    Type = pref.Type,
                    InAppEnabled = pref.InAppEnabled,
                    PushEnabled = pref.PushEnabled
                });
            }
        }
        await Context.SaveChangesAsync();
        return Ok(new { message = "Preferences updated" });
    }

    // ============ Analytics & Stats ============

    /// <summary>
    /// Record a post view.
    /// </summary>
    [HttpPost("posts/{id:guid}/view")]
    [AllowAnonymous]
    public async Task<ActionResult> RecordPostView(Guid id)
    {
        var post = await Context.Posts.FindAsync(id);
        if (post is null) return NotFound(new { message = "Post not found" });

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        // Deduplicate: only one view per user per post (or per IP hash for anon)
        if (userId != null)
        {
            var alreadyViewed = await Context.PostViews.AnyAsync(pv => pv.PostId == id && pv.UserId == userId);
            if (alreadyViewed) return Ok(new { message = "View already recorded" });
        }

        Context.PostViews.Add(new PostView { PostId = id, UserId = userId });
        await Context.SaveChangesAsync();
        return Ok(new { message = "View recorded" });
    }

    /// <summary>
    /// Get analytics for a specific post (author only).
    /// </summary>
    [HttpGet("posts/{id:guid}/analytics")]
    public async Task<ActionResult<PostAnalyticsResponse>> GetPostAnalytics(Guid id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null) return Unauthorized();

        var post = await Context.Posts
            .Include(p => p.Reactions).Include(p => p.Comments)
            .Include(p => p.Shares).Include(p => p.Bookmarks)
            .Include(p => p.Views)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (post is null) return NotFound(new { message = "Post not found" });
        if (post.AuthorId != userId) return Forbid();

        var reactionBreakdown = post.Reactions
            .GroupBy(r => r.ReactionType)
            .Select(g => new ReactionSummary(g.Key, g.Count())).ToList();

        var uniqueViewers = post.Views.Where(v => v.UserId != null).Select(v => v.UserId).Distinct().Count();

        var sevenDaysAgo = DateTime.UtcNow.AddDays(-7);
        var viewsLast7Days = post.Views
            .Where(v => v.CreatedAt >= sevenDaysAgo)
            .GroupBy(v => DateOnly.FromDateTime(v.CreatedAt))
            .Select(g => new DailyCount(g.Key, g.Count()))
            .OrderBy(d => d.Date).ToList();

        return Ok(new PostAnalyticsResponse(
            post.Views.Count, uniqueViewers, reactionBreakdown,
            post.Comments.Count, post.Shares.Count, post.Bookmarks.Count,
            viewsLast7Days
        ));
    }

    /// <summary>
    /// Get profile stats for a user.
    /// </summary>
    [HttpGet("users/{userId}/stats")]
    [AllowAnonymous]
    public async Task<ActionResult<ProfileStatsResponse>> GetProfileStats(string userId)
    {
        var user = await Context.Users.FindAsync(userId);
        if (user is null) return NotFound(new { message = "User not found" });

        var totalPosts = await Context.Posts.CountAsync(p => p.AuthorId == userId && p.Visibility == PostVisibility.Visible && p.PostStatus == PostStatus.Published);
        var totalLikes = await Context.PostReactions.CountAsync(r => r.Post.AuthorId == userId);
        var totalComments = await Context.PostComments.CountAsync(c => c.Post.AuthorId == userId && c.AuthorId != userId);
        var totalShares = await Context.PostShares.CountAsync(s => s.Post.AuthorId == userId);
        var followerCount = await Context.UserFollowers.CountAsync(uf => uf.FollowingId == userId);
        var followingCount = await Context.UserFollowers.CountAsync(uf => uf.FollowerId == userId);

        return Ok(new ProfileStatsResponse(totalPosts, totalLikes, totalComments, totalShares, followerCount, followingCount));
    }

    // ============ Admin Dashboard ============

    /// <summary>
    /// [Admin] Get overview statistics.
    /// </summary>
    [HttpGet("admin/stats/overview")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<AdminStatsResponse>> GetAdminStats()
    {
        var today = DateTime.UtcNow.Date;

        var totalUsers = await Context.Users.CountAsync();
        var totalPosts = await Context.Posts.CountAsync(p => p.Visibility == PostVisibility.Visible);
        var totalComments = await Context.PostComments.CountAsync();
        var totalReactions = await Context.PostReactions.CountAsync();
        var totalReports = await Context.Reports.CountAsync();
        var pendingReports = await Context.Reports.CountAsync(r => r.Status == ReportStatus.Pending);
        var postsToday = await Context.Posts.CountAsync(p => p.CreatedAt >= today);
        var newUsersToday = await Context.Users.CountAsync(u => u.CreatedAt >= today);

        return Ok(new AdminStatsResponse(
            totalUsers, totalPosts, totalComments, totalReactions,
            totalReports, pendingReports, postsToday, newUsersToday
        ));
    }

    /// <summary>
    /// [Admin] Get trending tags.
    /// </summary>
    [HttpGet("admin/stats/trending-tags")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<List<TagSummaryResponse>>> GetAdminTrendingTags([FromQuery] int limit = 20)
    {
        var tags = await Context.Tags
            .Select(t => new TagSummaryResponse(t.Name, t.PostTags.Count))
            .OrderByDescending(t => t.PostCount)
            .Take(limit).ToListAsync();

        return Ok(tags);
    }

    /// <summary>
    /// [Admin] Search and list users.
    /// </summary>
    [HttpGet("admin/users")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<AdminUserListResponse>> GetAdminUsers([FromQuery] AdminUserListQuery query)
    {
        var usersQuery = Context.Users.AsQueryable();

        if (!string.IsNullOrWhiteSpace(query.Search))
            usersQuery = usersQuery.Where(u => u.UserName!.Contains(query.Search) || u.Email!.Contains(query.Search));

        var totalCount = await usersQuery.CountAsync();
        var totalPages = (int)Math.Ceiling(totalCount / (double)query.PageSize);

        var users = await usersQuery
            .OrderByDescending(u => u.CreatedAt)
            .Skip((query.Page - 1) * query.PageSize).Take(query.PageSize)
            .Select(u => new AdminUserResponse(
                u.Id, u.UserName ?? "Unknown",
                u.Followers.Count,
                Context.Posts.Count(p => p.AuthorId == u.Id),
                Context.Reports.Count(r => r.ReportedUserId == u.Id),
                u.IsBanned, u.CreatedAt
            ))
            .ToListAsync();

        return Ok(new AdminUserListResponse(users, totalCount, query.Page, query.PageSize, totalPages));
    }

    /// <summary>
    /// [Admin] Get posts for a specific user.
    /// </summary>
    [HttpGet("admin/users/{userId}/posts")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<PostFeedResponse>> GetAdminUserPosts(string userId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var postsQuery = Context.Posts
            .Include(p => p.Author).Include(p => p.Photo)
            .Include(p => p.Comments).Include(p => p.Reactions).Include(p => p.Bookmarks)
            .Include(p => p.Tags).ThenInclude(pt => pt.Tag)
            .Include(p => p.Shares).Include(p => p.Views)
            .Where(p => p.AuthorId == userId);

        var totalCount = await postsQuery.CountAsync();
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        var posts = await postsQuery.OrderByDescending(p => p.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

        var summaries = new List<PostSummaryResponse>();
        foreach (var post in posts)
            summaries.Add(await BuildPostSummaryAsync(post, null));

        return Ok(new PostFeedResponse(summaries, totalCount, page, pageSize, totalPages));
    }

    /// <summary>
    /// [Admin] Ban a user.
    /// </summary>
    [HttpPut("admin/users/{userId}/ban")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult> BanUser(string userId, [FromBody] BanUserDto dto)
    {
        var user = await Context.Users.FindAsync(userId);
        if (user is null) return NotFound(new { message = "User not found" });

        user.IsBanned = true;
        user.BanReason = dto.Reason;
        await Context.SaveChangesAsync();
        return Ok(new { message = "User banned" });
    }

    /// <summary>
    /// [Admin] Unban a user.
    /// </summary>
    [HttpDelete("admin/users/{userId}/ban")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult> UnbanUser(string userId)
    {
        var user = await Context.Users.FindAsync(userId);
        if (user is null) return NotFound(new { message = "User not found" });

        user.IsBanned = false;
        user.BanReason = null;
        await Context.SaveChangesAsync();
        return Ok(new { message = "User unbanned" });
    }
}
