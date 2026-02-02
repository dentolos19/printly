using System.Security.Claims;
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
            .Where(p => p.Visibility == PostVisibility.Visible)
            .AsQueryable();

        // Filter by status (default to Published for public feed)
        postsQuery = postsQuery.Where(p => p.PostStatus == (query.Status ?? PostStatus.Published));

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
                    post.Comments.Count,
                    post.Reactions.Count,
                    isBookmarked,
                    userReaction,
                    post.CreatedAt
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
            .Include(p => p.Reactions)
            .Include(p => p.Bookmarks)
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
                c.UpdatedAt
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
                post.UpdatedAt
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
                    post.Comments.Count,
                    post.Reactions.Count,
                    isBookmarked,
                    userReaction,
                    post.CreatedAt
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
        };

        Context.Posts.Add(post);
        await Context.SaveChangesAsync();

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

        await Context.SaveChangesAsync();

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
                    post.Comments.Count,
                    post.Reactions.Count,
                    false,
                    null,
                    post.CreatedAt
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
        var totalPosts = await Context.Posts.CountAsync(p =>
            p.Visibility == PostVisibility.Visible && p.PostStatus == PostStatus.Published
        );

        var totalComments = await Context.PostComments.CountAsync();
        var totalReactions = await Context.PostReactions.CountAsync();

        var totalUsers = await Context
            .Posts.Where(p => p.Visibility == PostVisibility.Visible)
            .Select(p => p.AuthorId)
            .Distinct()
            .CountAsync();

        // FIX: Project to an anonymous type in SQL, then map to ReactionSummary in memory.
        var topReactionSummaries = (await Context.PostReactions
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

        var posts = await Context
            .Posts.Include(p => p.Author)
            .Include(p => p.Photo)
            .Include(p => p.Comments)
            .Include(p => p.Reactions)
            .Include(p => p.Bookmarks)
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
                    post.Comments.Count,
                    post.Reactions.Count,
                    isBookmarked,
                    userReaction,
                    post.CreatedAt
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

        var comments = await Context
            .PostComments.Include(c => c.Author)
            .Include(c => c.Replies)
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
                c.UpdatedAt
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

        var replies = await Context
            .PostComments.Include(c => c.Author)
            .Include(c => c.Replies)
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
                c.UpdatedAt
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
                createdComment.UpdatedAt
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
                comment.UpdatedAt
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

        var comment = await Context.PostComments.FindAsync(id);

        if (comment is null)
            return NotFound(new { message = "Comment not found" });

        if (comment.AuthorId != userId)
            return Forbid();

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
                        bookmark.Post.Comments.Count,
                        bookmark.Post.Reactions.Count,
                        true,
                        userReaction,
                        bookmark.Post.CreatedAt
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

        var follow = new UserFollower { FollowerId = currentUserId, FollowingId = userId };

        Context.UserFollowers.Add(follow);
        await Context.SaveChangesAsync();

        // Create notification for the followed user
        var currentUser = await Context.Users.FindAsync(currentUserId);
        await CreateNotificationAsync(
            userId,
            NotificationType.NewFollower,
            "New Follower",
            $"{currentUser?.UserName ?? "Someone"} started following you",
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
            return NotFound("Not following this user");

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

        return Ok(new FollowStatusResponse(isFollowing, isFollowedBy));
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
}
