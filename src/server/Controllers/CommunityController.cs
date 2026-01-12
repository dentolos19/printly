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
public class CommunityController(DatabaseContext context, StorageService storageService) : BaseController(context)
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

        var post = await Context.Posts.FindAsync(dto.PostId);
        if (post is null || post.Visibility == PostVisibility.Deleted)
            return NotFound(new { message = "Post not found" });

        if (dto.ParentId.HasValue)
        {
            var parentComment = await Context.PostComments.FindAsync(dto.ParentId.Value);
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

        var post = await Context.Posts.FindAsync(dto.PostId);
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
}
