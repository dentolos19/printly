using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using PrintlyServer.Data;
using PrintlyServer.Data.Auth;
using PrintlyServer.Data.Entities;
using PrintlyServer.Extensions;
using PrintlyServer.Hubs;
using PrintlyServer.Services;

namespace PrintlyServer.Controllers;

[Route("conversation")]
[Authorize(Roles = Roles.Admin + "," + Roles.User)]
public class ConversationController(
    DatabaseContext context,
    INotificationService notificationService,
    StorageService storageService,
    IHubContext<ConversationHub> hubContext,
    ChatService chatService,
    ILogger<ConversationController> logger
) : BaseController(context)
{
    private readonly INotificationService _notificationService = notificationService;
    private readonly StorageService _storageService = storageService;
    private readonly IHubContext<ConversationHub> _hubContext = hubContext;
    private readonly ChatService _chatService = chatService;
    private readonly ILogger<ConversationController> _logger = logger;

    public record ContactResponse(string Id, string Name, string Email, string Role);

    public record ParticipantResponse(
        Guid Id,
        string UserId,
        string Name,
        string Email,
        ConversationParticipantRole Role,
        bool IsCurrentUser
    );

    public record MessagePreview(
        Guid Id,
        string Content,
        string SenderId,
        string SenderName,
        bool IsRead,
        bool IsDeleted,
        bool IsEdited,
        DateTime CreatedAt
    );

    public record MessageResponse(
        Guid Id,
        Guid ConversationId,
        Guid ParticipantId,
        string SenderId,
        string SenderName,
        string Content,
        bool IsRead,
        DateTime? ReadAt,
        bool IsEdited,
        DateTime? EditedAt,
        bool IsDeleted,
        DateTime? DeletedAt,
        DateTime CreatedAt,
        Guid? ReplyToMessageId,
        string? ReplyToContent,
        string? ReplyToSenderName,
        string? FileUrl,
        string? FileName,
        string? FileType,
        long? FileSize,
        string? VoiceMessageUrl,
        int? VoiceMessageDuration,
        // Call message fields
        bool IsCallMessage,
        Guid? CallLogId,
        CallType? CallType,
        CallStatus? CallStatus,
        int? CallDurationSeconds,
        string? CallInitiatorId,
        string? CallInitiatorName
    );

    public record ConversationResponse(
        Guid Id,
        string? Subject,
        string CustomerId,
        string CustomerName,
        bool SupportMode,
        ConversationStatus Status,
        ConversationPriority Priority,
        Guid? OrderId,
        DateTime? LastMessageAt,
        int UnreadCount,
        DateTime CreatedAt,
        DateTime UpdatedAt,
        MessagePreview? LastMessage,
        IEnumerable<ParticipantResponse> Participants
    );

    public record CreateConversationRequest(List<string> ParticipantIds, string? Subject);

    // New request for creating support conversations
    public record CreateSupportConversationRequest(string Subject, Guid? OrderId, string? InitialMessage);

    // Request for updating status/priority
    public record UpdateConversationStatusRequest(ConversationStatus Status);

    public record UpdateConversationPriorityRequest(ConversationPriority Priority);

    // File upload response
    public record FileUploadResponse(Guid AssetId, string FileUrl, string FileName, string FileType, long FileSize);

    // Voice upload response
    public record VoiceUploadResponse(Guid AssetId, string VoiceUrl, int Duration);

    // Admin list response for assignment dropdown
    public record AdminResponse(string Id, string Name, string Email);

    // Allowed file types for attachments
    private static readonly HashSet<string> AllowedImageTypes =
    [
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/gif",
        "image/webp",
    ];

    private static readonly HashSet<string> AllowedDocumentTypes = ["application/pdf"];

    private static readonly HashSet<string> AllowedAudioTypes =
    [
        "audio/mpeg",
        "audio/mp3",
        "audio/wav",
        "audio/m4a",
        "audio/x-m4a",
        "audio/webm",
    ];

    private static readonly HashSet<string> AllowedVideoTypes = ["video/mp4", "video/webm"];

    private const long MaxFileSize = 50 * 1024 * 1024; // 50MB
    private const long MaxVoiceSize = 10 * 1024 * 1024; // 10MB

    [HttpGet("contacts")]
    public async Task<ActionResult<IEnumerable<ContactResponse>>> GetContacts()
    {
        var currentUserId = User.GetUserId();
        if (currentUserId is null)
            return Unauthorized();

        var users = await Context.Users.Where(u => u.Id != currentUserId).ToListAsync();

        var userIds = users.Select(u => u.Id).ToList();
        var userRoleMap = await Context
            .UserRoles.Where(ur => userIds.Contains(ur.UserId))
            .Join(Context.Roles, ur => ur.RoleId, r => r.Id, (ur, role) => new { ur.UserId, RoleName = role.Name })
            .ToListAsync();

        var roleDict = userRoleMap
            .GroupBy(x => x.UserId)
            .ToDictionary(g => g.Key, g => g.First().RoleName ?? Roles.User);

        var contacts = users
            .Select(u => new ContactResponse(
                u.Id,
                u.UserName ?? u.Email ?? "Unknown",
                u.Email ?? string.Empty,
                roleDict.TryGetValue(u.Id, out var role) ? role : Roles.User
            ))
            .OrderBy(c => c.Name)
            .ToList();

        return Ok(contacts);
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ConversationResponse>>> GetConversations(
        [FromQuery] bool includeAllForStaff = false,
        [FromQuery] ConversationStatus? status = null
    )
    {
        var currentUserId = User.GetUserId();
        if (currentUserId is null)
            return Unauthorized();

        var isAdmin = User.IsInRole(Roles.Admin);
        if (!isAdmin)
        {
            includeAllForStaff = false;
        }

        var query = Context.Conversations.AsQueryable();

        if (includeAllForStaff)
        {
            // Staff sees only support mode conversations
            query = query.Where(c => c.SupportMode);
        }
        else
        {
            // Users see conversations they created OR non-support conversations they participate in.
            // For support conversations, only the customer (creator) can see them — not other participants.
            query = query.Where(c =>
                c.CustomerId == currentUserId || (!c.SupportMode && c.Participants.Any(p => p.UserId == currentUserId))
            );
        }

        // Filter by status if provided
        if (status.HasValue)
        {
            query = query.Where(c => c.Status == status.Value);
        }

        // Fetch conversations with all fields
        var conversationList = await query
            .Include(c => c.Customer)
            .Select(c => new
            {
                c.Id,
                c.Subject,
                c.CustomerId,
                CustomerName = c.Customer.UserName ?? c.Customer.Email ?? "Unknown",
                c.SupportMode,
                c.Status,
                c.Priority,
                c.OrderId,
                c.LastMessageAt,
                c.UnreadCount,
                c.CreatedAt,
                c.UpdatedAt,
            })
            .ToListAsync();

        var conversationIds = conversationList.Select(c => c.Id).ToList();

        // Fetch all messages and participants for these conversations
        var messages = await Context
            .ConversationMessages.Where(m => conversationIds.Contains(m.ConversationId))
            .Include(m => m.Participant)
            .ThenInclude(p => p.User)
            .ToListAsync();

        var participants = await Context
            .ConversationParticipants.Where(p => conversationIds.Contains(p.ConversationId))
            .Include(p => p.User)
            .ToListAsync();

        // Compose response objects in memory
        var conversations = conversationList
            .Select(c => new ConversationResponse(
                c.Id,
                c.Subject,
                c.CustomerId,
                c.CustomerName,
                c.SupportMode,
                c.Status,
                c.Priority,
                c.OrderId,
                c.LastMessageAt,
                c.UnreadCount,
                c.CreatedAt,
                c.UpdatedAt,
                messages
                    .Where(m => m.ConversationId == c.Id)
                    .OrderByDescending(m => m.CreatedAt)
                    .Select(m => new MessagePreview(
                        m.Id,
                        m.Content,
                        m.Participant.UserId,
                        m.Participant.User.UserName ?? m.Participant.User.Email ?? "Unknown",
                        m.IsRead,
                        m.IsDeleted,
                        m.IsEdited,
                        m.CreatedAt
                    ))
                    .FirstOrDefault(),
                participants
                    .Where(p => p.ConversationId == c.Id)
                    .Select(p => new ParticipantResponse(
                        p.Id,
                        p.UserId,
                        p.User.UserName ?? p.User.Email ?? "Unknown",
                        p.User.Email ?? string.Empty,
                        p.Role,
                        p.UserId == currentUserId
                    ))
            ))
            .OrderByDescending(c => c.LastMessageAt ?? c.CreatedAt)
            .ToList();

        return Ok(conversations);
    }

    /// <summary>
    /// Create a new support conversation. All admins are automatically added as participants.
    /// Customers can use this to start a support ticket.
    /// </summary>
    [HttpPost("support")]
    public async Task<ActionResult<ConversationResponse>> CreateSupportConversation(
        [FromBody] CreateSupportConversationRequest request
    )
    {
        var currentUserId = User.GetUserId();
        if (currentUserId is null)
            return Unauthorized();

        if (string.IsNullOrWhiteSpace(request.Subject))
            return BadRequest("Subject is required for support conversations.");

        var currentUser = await Context.Users.FindAsync(currentUserId);
        if (currentUser is null)
            return Unauthorized();

        // Create the conversation with the customer as the owner and support mode enabled
        var conversation = new Conversation
        {
            Subject = request.Subject.Trim(),
            CustomerId = currentUserId,
            OrderId = request.OrderId,
            SupportMode = true,
            Status = ConversationStatus.Pending,
            Priority = ConversationPriority.Normal,
        };

        Context.Conversations.Add(conversation);

        // Add the customer as the only initial participant
        // Admins will be added lazily when they join the conversation
        var customerParticipant = new ConversationParticipant
        {
            ConversationId = conversation.Id,
            UserId = currentUserId,
            Role = ConversationParticipantRole.Member,
        };
        Context.ConversationParticipants.Add(customerParticipant);

        await Context.SaveChangesAsync();

        // If an initial message was provided, add it
        if (!string.IsNullOrWhiteSpace(request.InitialMessage))
        {
            var message = new ConversationMessage
            {
                ConversationId = conversation.Id,
                ParticipantId = customerParticipant.Id,
                Content = request.InitialMessage.Trim(),
                IsRead = false,
            };

            Context.ConversationMessages.Add(message);
            conversation.LastMessageAt = DateTime.UtcNow;
            conversation.UnreadCount = 1;

            await Context.SaveChangesAsync();
        }

        // Notify admins about the new conversation
        await _notificationService.NotifyAdminsAsync(
            NotificationType.ConversationCreated,
            "New Support Conversation",
            $"{currentUser.UserName ?? currentUser.Email} started a conversation: {request.Subject}",
            conversation.Id,
            NotificationPriority.Normal
        );

        // Build and return the response
        var participants = await Context
            .ConversationParticipants.Where(p => p.ConversationId == conversation.Id)
            .Include(p => p.User)
            .ToListAsync();

        var lastMessage = await Context
            .ConversationMessages.Where(m => m.ConversationId == conversation.Id)
            .OrderByDescending(m => m.CreatedAt)
            .Include(m => m.Participant)
            .ThenInclude(p => p.User)
            .FirstOrDefaultAsync();

        var response = new ConversationResponse(
            conversation.Id,
            conversation.Subject,
            conversation.CustomerId,
            currentUser.UserName ?? currentUser.Email ?? "Unknown",
            conversation.SupportMode,
            conversation.Status,
            conversation.Priority,
            conversation.OrderId,
            conversation.LastMessageAt,
            conversation.UnreadCount,
            conversation.CreatedAt,
            conversation.UpdatedAt,
            lastMessage != null
                ? new MessagePreview(
                    lastMessage.Id,
                    lastMessage.Content,
                    lastMessage.Participant.UserId,
                    lastMessage.Participant.User.UserName ?? lastMessage.Participant.User.Email ?? "Unknown",
                    lastMessage.IsRead,
                    lastMessage.IsDeleted,
                    lastMessage.IsEdited,
                    lastMessage.CreatedAt
                )
                : null,
            participants.Select(p => new ParticipantResponse(
                p.Id,
                p.UserId,
                p.User.UserName ?? p.User.Email ?? "Unknown",
                p.User.Email ?? string.Empty,
                p.Role,
                p.UserId == currentUserId
            ))
        );

        return CreatedAtAction(nameof(GetConversations), new { id = response.Id }, response);
    }

    /// <summary>
    /// Update conversation status. Admin only.
    /// </summary>
    [HttpPatch("{conversationId:guid}/status")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> UpdateStatus(
        Guid conversationId,
        [FromBody] UpdateConversationStatusRequest request
    )
    {
        var conversation = await Context.Conversations.FindAsync(conversationId);
        if (conversation is null)
            return NotFound();

        var currentUserId = User.GetUserId();
        var currentUserName = User.Identity?.Name ?? "Admin";

        conversation.Status = request.Status;
        await Context.SaveChangesAsync();

        // Broadcast status update in real-time to all participants
        var statusResponse = new
        {
            conversationId,
            status = (int)request.Status,
            updatedByUserId = currentUserId,
            updatedByUserName = currentUserName,
            updatedAt = DateTime.UtcNow,
        };

        await _hubContext
            .Clients.Group($"conversation-{conversationId}")
            .SendAsync("ConversationStatusUpdated", statusResponse);

        // Also notify staff inbox
        await _hubContext.Clients.Group("staff").SendAsync("ConversationStatusUpdated", statusResponse);

        // Notify the customer if closed (non-blocking)
        if (request.Status == ConversationStatus.Closed)
        {
            try
            {
                await _notificationService.CreateNotificationAsync(
                    conversation.CustomerId,
                    NotificationType.ConversationStatusChanged,
                    "Conversation Closed",
                    "Your support conversation has been closed",
                    conversationId,
                    null,
                    NotificationPriority.Normal,
                    $"/chat?conversation={conversationId}"
                );
            }
            catch (Exception ex)
            {
                // Log but don't fail the request - notification is not critical
                Console.WriteLine($"[ConversationController] Failed to create notification: {ex.Message}");
            }
        }

        return NoContent();
    }

    /// <summary>
    /// Update conversation priority. Admin only.
    /// </summary>
    [HttpPatch("{conversationId:guid}/priority")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> UpdatePriority(
        Guid conversationId,
        [FromBody] UpdateConversationPriorityRequest request
    )
    {
        var conversation = await Context.Conversations.FindAsync(conversationId);
        if (conversation is null)
            return NotFound();

        var currentUserId = User.GetUserId();
        var currentUserName = User.Identity?.Name ?? "Admin";

        conversation.Priority = request.Priority;
        await Context.SaveChangesAsync();

        // Broadcast priority update in real-time
        var priorityResponse = new
        {
            conversationId,
            priority = (int)request.Priority,
            updatedByUserId = currentUserId,
            updatedByUserName = currentUserName,
            updatedAt = DateTime.UtcNow,
        };

        await _hubContext
            .Clients.Group($"conversation-{conversationId}")
            .SendAsync("ConversationPriorityUpdated", priorityResponse);

        await _hubContext.Clients.Group("staff").SendAsync("ConversationPriorityUpdated", priorityResponse);

        return NoContent();
    }

    /// <summary>
    /// Legacy endpoint for creating peer-to-peer conversations.
    /// For support conversations, use POST /conversation/support instead.
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<ConversationResponse>> CreateConversation(
        [FromBody] CreateConversationRequest request
    )
    {
        var currentUserId = User.GetUserId();
        if (currentUserId is null)
            return Unauthorized();

        var currentUser = await Context.Users.FindAsync(currentUserId);
        if (currentUser is null)
            return Unauthorized();

        var participantIds =
            request
                .ParticipantIds?.Where(id => !string.IsNullOrWhiteSpace(id))
                .Select(id => id.Trim())
                .Distinct()
                .ToList()
            ?? [];

        if (!participantIds.Contains(currentUserId))
        {
            participantIds.Add(currentUserId);
        }

        if (participantIds.Count < 2)
        {
            return BadRequest("A conversation requires at least two participants.");
        }

        var userIdsInDb = await Context.Users.Where(u => participantIds.Contains(u.Id)).Select(u => u.Id).ToListAsync();
        if (userIdsInDb.Count != participantIds.Count)
        {
            return BadRequest("One or more participants do not exist.");
        }

        // Check if a conversation with these exact participants already exists
        var existingConversation = await Context
            .Conversations.Where(c => c.Participants.Count == participantIds.Count)
            .Where(c => c.Participants.All(p => participantIds.Contains(p.UserId)))
            .FirstOrDefaultAsync();

        if (existingConversation is not null)
        {
            // Return the existing conversation
            return await GetConversationById(existingConversation.Id, currentUserId);
        }

        var conversation = new Conversation
        {
            Subject = string.IsNullOrWhiteSpace(request.Subject) ? null : request.Subject.Trim(),
            CustomerId = currentUserId, // Current user is the initiator
            Status = ConversationStatus.Active, // Peer conversations start active
            Priority = ConversationPriority.Normal,
        };

        Context.Conversations.Add(conversation);

        var adminRoleId = await Context.Roles.Where(r => r.Name == Roles.Admin).Select(r => r.Id).FirstOrDefaultAsync();

        foreach (var userId in participantIds)
        {
            var isParticipantAdmin =
                adminRoleId != null
                && await Context.UserRoles.AnyAsync(ur => ur.UserId == userId && ur.RoleId == adminRoleId);
            conversation.Participants.Add(
                new ConversationParticipant
                {
                    UserId = userId,
                    Role = isParticipantAdmin ? ConversationParticipantRole.Admin : ConversationParticipantRole.Member,
                }
            );
        }

        await Context.SaveChangesAsync();

        return await GetConversationById(conversation.Id, currentUserId);
    }

    private async Task<ActionResult<ConversationResponse>> GetConversationById(
        Guid conversationId,
        string currentUserId
    )
    {
        var conversation = await Context
            .Conversations.Include(c => c.Customer)
            .FirstOrDefaultAsync(c => c.Id == conversationId);

        if (conversation is null)
            return NotFound();

        var participants = await Context
            .ConversationParticipants.Where(p => p.ConversationId == conversationId)
            .Include(p => p.User)
            .ToListAsync();

        var lastMessage = await Context
            .ConversationMessages.Where(m => m.ConversationId == conversationId)
            .OrderByDescending(m => m.CreatedAt)
            .Include(m => m.Participant)
            .ThenInclude(p => p.User)
            .FirstOrDefaultAsync();

        var response = new ConversationResponse(
            conversation.Id,
            conversation.Subject,
            conversation.CustomerId,
            conversation.Customer.UserName ?? conversation.Customer.Email ?? "Unknown",
            conversation.SupportMode,
            conversation.Status,
            conversation.Priority,
            conversation.OrderId,
            conversation.LastMessageAt,
            conversation.UnreadCount,
            conversation.CreatedAt,
            conversation.UpdatedAt,
            lastMessage != null
                ? new MessagePreview(
                    lastMessage.Id,
                    lastMessage.Content,
                    lastMessage.Participant.UserId,
                    lastMessage.Participant.User.UserName ?? lastMessage.Participant.User.Email ?? "Unknown",
                    lastMessage.IsRead,
                    lastMessage.IsDeleted,
                    lastMessage.IsEdited,
                    lastMessage.CreatedAt
                )
                : null,
            participants.Select(p => new ParticipantResponse(
                p.Id,
                p.UserId,
                p.User.UserName ?? p.User.Email ?? "Unknown",
                p.User.Email ?? string.Empty,
                p.Role,
                p.UserId == currentUserId
            ))
        );

        return Ok(response);
    }

    [HttpGet("{conversationId:guid}/messages")]
    public async Task<ActionResult<IEnumerable<MessageResponse>>> GetMessages(
        Guid conversationId,
        [FromQuery] int take = 100
    )
    {
        var currentUserId = User.GetUserId();
        if (currentUserId is null)
            return Unauthorized();

        var isAdmin = User.IsInRole(Roles.Admin);

        var conversation = await Context.Conversations.FindAsync(conversationId);
        if (conversation is null)
            return NotFound();

        // Admins can access all conversations.
        // For support conversations, only the customer (creator) can access — not other participants.
        // For peer-to-peer conversations, any participant can access.
        var hasAccess =
            isAdmin
            || conversation.CustomerId == currentUserId
            || (
                !conversation.SupportMode
                && await Context.ConversationParticipants.AnyAsync(p =>
                    p.ConversationId == conversationId && p.UserId == currentUserId
                )
            );
        if (!hasAccess)
        {
            return Forbid();
        }

        take = Math.Clamp(take, 1, 200);

        var messages = await Context
            .ConversationMessages.Where(m => m.ConversationId == conversationId)
            .Include(m => m.CallLog)
            .ThenInclude(cl => cl!.Initiator)
            .OrderBy(m => m.CreatedAt)
            .Take(take)
            .Select(m => new MessageResponse(
                m.Id,
                m.ConversationId,
                m.ParticipantId,
                m.Participant.UserId,
                m.Participant.User.UserName ?? m.Participant.User.Email ?? "Unknown",
                m.Content,
                m.IsRead,
                m.ReadAt,
                m.IsEdited,
                m.EditedAt,
                m.IsDeleted,
                m.DeletedAt,
                m.CreatedAt,
                m.ReplyToMessageId,
                m.ReplyToMessage != null ? m.ReplyToMessage.Content : null,
                m.ReplyToMessage != null
                    ? m.ReplyToMessage.Participant.User.UserName ?? m.ReplyToMessage.Participant.User.Email
                    : null,
                m.FileUrl,
                m.FileName,
                m.FileType,
                m.FileSize,
                m.VoiceMessageUrl,
                m.VoiceMessageDuration,
                // Call message fields
                m.IsCallMessage,
                m.CallLogId,
                m.CallLog != null ? m.CallLog.Type : (CallType?)null,
                m.CallLog != null ? m.CallLog.Status : (CallStatus?)null,
                m.CallLog != null ? m.CallLog.DurationSeconds : (int?)null,
                m.CallLog != null ? m.CallLog.InitiatorId : null,
                m.CallLog != null ? m.CallLog.Initiator.UserName ?? m.CallLog.Initiator.Email : null
            ))
            .ToListAsync();

        return Ok(messages);
    }

    [HttpPost("{conversationId:guid}/read")]
    public async Task<IActionResult> MarkConversationAsRead(Guid conversationId)
    {
        var currentUserId = User.GetUserId();
        if (currentUserId is null)
            return Unauthorized();

        var isAdmin = User.IsInRole(Roles.Admin);

        var conversation = await Context.Conversations.FindAsync(conversationId);
        if (conversation is null)
            return NotFound();

        // Same authorization as GetMessages: admins, customer owner, or p2p participant
        var hasAccess =
            isAdmin
            || conversation.CustomerId == currentUserId
            || (
                !conversation.SupportMode
                && await Context.ConversationParticipants.AnyAsync(p =>
                    p.ConversationId == conversationId && p.UserId == currentUserId
                )
            );
        if (!hasAccess)
        {
            return Forbid();
        }

        var unreadMessages = await Context
            .ConversationMessages.Where(m =>
                m.ConversationId == conversationId && m.Participant.UserId != currentUserId && !m.IsRead
            )
            .ToListAsync();

        if (unreadMessages.Count == 0)
        {
            return NoContent();
        }

        var now = DateTime.UtcNow;
        foreach (var message in unreadMessages)
        {
            message.IsRead = true;
            message.ReadAt = now;
        }

        await Context.SaveChangesAsync();

        return NoContent();
    }

    /// <summary>
    /// Upload a file attachment for a conversation message.
    /// Accepts images (png, jpg, gif, webp), documents (pdf), audio, and video files.
    /// Max file size: 50MB.
    /// </summary>
    [HttpPost("{conversationId:guid}/upload-file")]
    public async Task<ActionResult<FileUploadResponse>> UploadFile(Guid conversationId, IFormFile file)
    {
        var currentUserId = User.GetUserId();
        if (currentUserId is null)
            return Unauthorized();

        // Verify user has access to this conversation
        var isAdmin = User.IsInRole(Roles.Admin);
        var conversation = await Context.Conversations.FindAsync(conversationId);
        if (conversation is null)
            return NotFound("Conversation not found");

        var hasAccess =
            isAdmin
            || conversation.CustomerId == currentUserId
            || await Context.ConversationParticipants.AnyAsync(p =>
                p.ConversationId == conversationId && p.UserId == currentUserId
            );
        if (!hasAccess)
            return Forbid();

        // Validate file
        if (file is null || file.Length == 0)
            return BadRequest("No file provided");

        if (file.Length > MaxFileSize)
            return BadRequest($"File too large. Maximum size is {MaxFileSize / (1024 * 1024)}MB");

        var contentType = file.ContentType.ToLowerInvariant().Split(';')[0].Trim();
        var isAllowed =
            AllowedImageTypes.Contains(contentType)
            || AllowedDocumentTypes.Contains(contentType)
            || AllowedAudioTypes.Contains(contentType)
            || AllowedVideoTypes.Contains(contentType);

        if (!isAllowed)
            return BadRequest(
                "File type not allowed. Allowed types: images (png, jpg, gif, webp), documents (pdf), audio (mp3, wav, m4a), video (mp4, webm)"
            );

        try
        {
            // Upload to R2 storage
            await using var stream = file.OpenReadStream();
            var asset = await _storageService.UploadFileAsync(stream, file.FileName, $"conversation-{conversationId}");

            // Get presigned URL for the uploaded file
            var fileUrl = await _storageService.DownloadFileAsync(asset);

            return Ok(new FileUploadResponse(asset.Id, fileUrl, file.FileName, contentType, file.Length));
        }
        catch (Exception ex)
        {
            // Log the full exception including inner exceptions to help diagnose
            var fullError = ex.ToString();
            _logger.LogError(
                ex,
                "Failed to upload file in conversation {ConversationId}. Full error: {Error}",
                conversationId,
                fullError
            );
            Console.WriteLine($"[UploadFile ERROR] {fullError}");

            // Return the innermost exception message for debugging
            var innerMessage = ex.InnerException?.InnerException?.Message ?? ex.InnerException?.Message ?? ex.Message;
            return StatusCode(500, $"Failed to upload file: {innerMessage}");
        }
    }

    /// <summary>
    /// Upload a voice message recording for a conversation.
    /// Accepts audio files (mp3, wav, m4a, webm). Max file size: 10MB.
    /// </summary>
    [HttpPost("{conversationId:guid}/upload-voice")]
    public async Task<ActionResult<VoiceUploadResponse>> UploadVoice(
        Guid conversationId,
        IFormFile audioFile,
        [FromForm] int duration
    )
    {
        var currentUserId = User.GetUserId();
        if (currentUserId is null)
            return Unauthorized();

        // Verify user has access to this conversation
        var isAdmin = User.IsInRole(Roles.Admin);
        var conversation = await Context.Conversations.FindAsync(conversationId);
        if (conversation is null)
            return NotFound("Conversation not found");

        var hasAccess =
            isAdmin
            || conversation.CustomerId == currentUserId
            || await Context.ConversationParticipants.AnyAsync(p =>
                p.ConversationId == conversationId && p.UserId == currentUserId
            );
        if (!hasAccess)
            return Forbid();

        // Validate audio file
        if (audioFile is null || audioFile.Length == 0)
            return BadRequest("No audio file provided");

        if (audioFile.Length > MaxVoiceSize)
            return BadRequest($"Voice message too large. Maximum size is {MaxVoiceSize / (1024 * 1024)}MB");

        var rawContentType = audioFile.ContentType.ToLowerInvariant();
        var contentType = rawContentType.Split(';')[0].Trim();
        if (!AllowedAudioTypes.Contains(contentType))
            return BadRequest("Invalid audio format. Allowed formats: mp3, wav, m4a, webm");

        if (duration <= 0)
            return BadRequest("Invalid duration");

        try
        {
            // Upload to R2 storage
            await using var stream = audioFile.OpenReadStream();
            var asset = await _storageService.UploadFileAsync(
                stream,
                $"voice-{DateTime.UtcNow:yyyyMMddHHmmss}.{GetExtensionFromMimeType(contentType)}",
                $"conversation-{conversationId}-voice"
            );

            // Get presigned URL for the uploaded file
            var voiceUrl = await _storageService.DownloadFileAsync(asset);

            return Ok(new VoiceUploadResponse(asset.Id, voiceUrl, duration));
        }
        catch (Exception ex)
        {
            var fullError = ex.ToString();
            _logger.LogError(
                ex,
                "Failed to upload voice message in conversation {ConversationId}. Full error: {Error}",
                conversationId,
                fullError
            );
            Console.WriteLine($"[UploadVoice ERROR] {fullError}");

            var innerMessage = ex.InnerException?.InnerException?.Message ?? ex.InnerException?.Message ?? ex.Message;
            return StatusCode(500, $"Failed to upload voice message: {innerMessage}");
        }
    }

    /// <summary>
    /// Get list of all admin users for assignment dropdown.
    /// </summary>
    [HttpGet("admins")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<IEnumerable<AdminResponse>>> GetAdmins()
    {
        var adminRoleId = await Context.Roles.Where(r => r.Name == Roles.Admin).Select(r => r.Id).FirstOrDefaultAsync();

        if (adminRoleId is null)
            return Ok(Array.Empty<AdminResponse>());

        var adminUserIds = await Context
            .UserRoles.Where(ur => ur.RoleId == adminRoleId)
            .Select(ur => ur.UserId)
            .ToListAsync();

        var admins = await Context
            .Users.Where(u => adminUserIds.Contains(u.Id))
            .Select(u => new AdminResponse(u.Id, u.UserName ?? u.Email ?? "Unknown", u.Email ?? ""))
            .ToListAsync();

        return Ok(admins);
    }

    /// <summary>
    /// Assign or unassign a conversation to an admin. Admin only.
    /// Pass null adminId to unassign.
    /// </summary>
    [HttpPatch("{conversationId:guid}/assign")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> AssignConversation(
        Guid conversationId,
        [FromBody] AssignConversationRequest request
    )
    {
        var currentUserId = User.GetUserId();
        if (currentUserId is null)
            return Unauthorized();

        var conversation = await Context
            .Conversations.Include(c => c.Customer)
            .FirstOrDefaultAsync(c => c.Id == conversationId);
        if (conversation is null)
            return NotFound("Conversation not found");

        // Validate admin exists if assigning
        string? assignedAdminName = null;
        if (!string.IsNullOrEmpty(request.AdminId))
        {
            var adminRoleId = await Context
                .Roles.Where(r => r.Name == Roles.Admin)
                .Select(r => r.Id)
                .FirstOrDefaultAsync();

            var isValidAdmin =
                adminRoleId != null
                && await Context.UserRoles.AnyAsync(ur => ur.UserId == request.AdminId && ur.RoleId == adminRoleId);

            if (!isValidAdmin)
                return BadRequest("Invalid admin user");

            var admin = await Context.Users.FindAsync(request.AdminId);
            assignedAdminName = admin?.UserName ?? admin?.Email ?? "Unknown";
        }

        var previousAssignedId = conversation.AssignedToAdminId;
        conversation.AssignedToAdminId = request.AdminId;
        await Context.SaveChangesAsync();

        // Send notification to assigned admin
        if (!string.IsNullOrEmpty(request.AdminId) && request.AdminId != currentUserId)
        {
            var customerName = conversation.Customer.UserName ?? conversation.Customer.Email ?? "Unknown";
            await _notificationService.CreateNotificationAsync(
                request.AdminId,
                NotificationType.ConversationAssigned,
                "Conversation Assigned",
                $"You were assigned to {customerName}'s conversation: {conversation.Subject ?? "Support Request"}",
                conversationId,
                null,
                NotificationPriority.Normal,
                $"/admin/chat?conversation={conversationId}"
            );
        }

        return Ok(
            new
            {
                conversationId,
                assignedToAdminId = request.AdminId,
                assignedToAdminName = assignedAdminName,
                assignedAt = DateTime.UtcNow,
            }
        );
    }

    public record AssignConversationRequest(string? AdminId);

    private static string GetExtensionFromMimeType(string mimeType) =>
        mimeType switch
        {
            "audio/mpeg" or "audio/mp3" => "mp3",
            "audio/wav" => "wav",
            "audio/m4a" or "audio/x-m4a" => "m4a",
            "audio/webm" => "webm",
            _ => "audio",
        };

    #region Calling

    public record CallTokenResponse(string Token, string RoomName, string WsUrl);

    /// <summary>
    /// Gets a LiveKit token to join a call.
    /// </summary>
    [HttpPost("call/{callId:guid}/token")]
    public async Task<ActionResult<CallTokenResponse>> GetCallToken(
        Guid callId,
        [FromServices] ILiveKitService liveKitService,
        [FromServices] IConfiguration configuration
    )
    {
        var currentUserId = User.GetUserId();
        if (currentUserId is null)
            return Unauthorized();

        var callLog = await Context.CallLogs.Include(c => c.Participants).FirstOrDefaultAsync(c => c.Id == callId);

        if (callLog is null)
            return NotFound("Call not found");

        var participant = callLog.Participants.FirstOrDefault(p => p.UserId == currentUserId);
        if (participant is null)
            return Forbid();

        if (string.IsNullOrEmpty(callLog.LiveKitRoomName))
            return BadRequest("Call room not initialized");

        var user = await Context.Users.FindAsync(currentUserId);
        var userName = user?.UserName ?? user?.Email ?? "Unknown";

        var token = liveKitService.GenerateToken(
            participantId: currentUserId,
            participantName: userName,
            roomName: callLog.LiveKitRoomName
        );

        var wsUrl = configuration["LIVEKIT_URL"] ?? throw new InvalidOperationException("LIVEKIT_URL not configured");

        return Ok(new CallTokenResponse(token, callLog.LiveKitRoomName, wsUrl));
    }

    public record CallParticipantResponse(string Id, string Name, bool DidAnswer, DateTime? JoinedAt, DateTime? LeftAt);

    public record CallDetailsResponse(
        Guid Id,
        Guid ConversationId,
        CallType Type,
        CallStatus Status,
        DateTime StartedAt,
        DateTime? EndedAt,
        int? DurationSeconds,
        string LiveKitRoomName,
        CallParticipantResponse Initiator,
        List<CallParticipantResponse> Participants,
        bool HasRecording,
        bool HasAiNotes
    );

    /// <summary>
    /// Gets details about a specific call.
    /// </summary>
    [HttpGet("call/{callId:guid}")]
    public async Task<ActionResult<CallDetailsResponse>> GetCallDetails(Guid callId)
    {
        var currentUserId = User.GetUserId();
        if (currentUserId is null)
            return Unauthorized();

        var callLog = await Context
            .CallLogs.Include(c => c.Participants)
            .ThenInclude(p => p.User)
            .Include(c => c.Initiator)
            .FirstOrDefaultAsync(c => c.Id == callId);

        if (callLog is null)
            return NotFound("Call not found");

        var isParticipant = callLog.Participants.Any(p => p.UserId == currentUserId);
        if (!isParticipant)
            return Forbid();

        return Ok(
            new CallDetailsResponse(
                callLog.Id,
                callLog.ConversationId,
                callLog.Type,
                callLog.Status,
                callLog.StartedAt,
                callLog.EndedAt,
                callLog.DurationSeconds,
                callLog.LiveKitRoomName ?? "",
                new CallParticipantResponse(
                    callLog.Initiator.Id,
                    callLog.Initiator.UserName ?? callLog.Initiator.Email ?? "Unknown",
                    true,
                    callLog.StartedAt,
                    null
                ),
                callLog
                    .Participants.Select(p => new CallParticipantResponse(
                        p.User.Id,
                        p.User.UserName ?? p.User.Email ?? "Unknown",
                        p.DidAnswer,
                        p.JoinedAt,
                        p.LeftAt
                    ))
                    .ToList(),
                callLog.RecordingAssetId != null,
                !string.IsNullOrEmpty(callLog.AiCallNotes)
            )
        );
    }

    public record UploadRecordingResponse(Guid AssetId);

    /// <summary>
    /// Upload a call recording audio file. Called automatically when a call ends.
    /// </summary>
    [HttpPost("call/{callId:guid}/upload-recording")]
    public async Task<ActionResult<UploadRecordingResponse>> UploadCallRecording(Guid callId, IFormFile audioFile)
    {
        var currentUserId = User.GetUserId();
        if (currentUserId is null)
            return Unauthorized();

        var callLog = await Context.CallLogs.Include(c => c.Participants).FirstOrDefaultAsync(c => c.Id == callId);

        if (callLog is null)
            return NotFound("Call not found");

        // Verify user was a participant
        var isParticipant = callLog.Participants.Any(p => p.UserId == currentUserId);
        if (!isParticipant)
            return Forbid();

        // Don't overwrite if recording already exists
        if (callLog.RecordingAssetId is not null)
            return Ok(new UploadRecordingResponse(callLog.RecordingAssetId.Value));

        if (audioFile is null || audioFile.Length == 0)
            return BadRequest("No audio file provided");

        // Max 50MB for call recordings
        if (audioFile.Length > 50 * 1024 * 1024)
            return BadRequest("Recording too large. Maximum size is 50MB.");

        try
        {
            await using var stream = audioFile.OpenReadStream();
            // Determine file extension from content type
            var ext =
                audioFile.ContentType.Contains("ogg") ? "ogg"
                : audioFile.ContentType.Contains("wav") ? "wav"
                : audioFile.ContentType.Contains("mp3") ? "mp3"
                : "ogg";
            var asset = await _storageService.UploadFileAsync(
                stream,
                $"call-recording-{callId}.{ext}",
                $"call-recording-{callId}"
            );

            callLog.RecordingAssetId = asset.Id;
            await Context.SaveChangesAsync();

            return Ok(new UploadRecordingResponse(asset.Id));
        }
        catch (Exception ex)
        {
            var innerMessage = ex.InnerException?.InnerException?.Message ?? ex.InnerException?.Message ?? ex.Message;
            return StatusCode(500, $"Failed to upload recording: {innerMessage}");
        }
    }

    public record CallNotesResponse(string Notes, string Transcript, bool WasGenerated);

    /// <summary>
    /// Get AI-generated call notes. First request triggers generation, subsequent requests return cached result.
    /// </summary>
    [HttpPost("call/{callId:guid}/notes")]
    public async Task<ActionResult<CallNotesResponse>> GetOrGenerateCallNotes(
        Guid callId,
        [FromServices] GenerativeService generativeService,
        [FromServices] StorageService storageService
    )
    {
        var currentUserId = User.GetUserId();
        if (currentUserId is null)
            return Unauthorized();

        var callLog = await Context
            .CallLogs.Include(c => c.Participants)
            .Include(c => c.RecordingAsset)
            .FirstOrDefaultAsync(c => c.Id == callId);

        if (callLog is null)
            return NotFound("Call not found");

        var isParticipant = callLog.Participants.Any(p => p.UserId == currentUserId);
        var isAdmin = User.IsInRole(Roles.Admin);
        if (!isParticipant && !isAdmin)
            return Forbid();

        // If notes already exist, return them immediately (cached in DB)
        if (!string.IsNullOrEmpty(callLog.AiCallNotes))
        {
            return Ok(new CallNotesResponse(callLog.AiCallNotes, callLog.Transcript ?? "", false));
        }

        // No notes yet, so we need to generate them from the recording
        if (callLog.RecordingAssetId is null || callLog.RecordingAsset is null)
            return BadRequest("No recording available for this call. AI Call Notes require a call recording.");

        try
        {
            // Fetch the audio bytes from R2 storage
            using var audioStream = await storageService.StreamFileAsync(callLog.RecordingAsset);
            using var memoryStream = new MemoryStream();
            await audioStream.CopyToAsync(memoryStream);
            var audioBytes = memoryStream.ToArray();

            var mimeType = callLog.RecordingAsset.Type ?? "audio/webm";

            // Send to Gemini for transcription and note generation
            var (transcript, notes) = await generativeService.GenerateCallNotesAsync(audioBytes, mimeType);

            // Save to database so we never have to generate again
            callLog.Transcript = transcript;
            callLog.AiCallNotes = notes;
            await Context.SaveChangesAsync();

            return Ok(new CallNotesResponse(notes, transcript, true));
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Failed to generate call notes: {ex.Message}");
        }
    }

    #endregion

    /// <summary>
    /// Generate an AI summary of a conversation
    /// </summary>
    [HttpPost("{conversationId:guid}/summary")]
    public async Task<IActionResult> GetConversationSummary(Guid conversationId)
    {
        var currentUserId = User.GetUserId();
        if (currentUserId is null)
            return Unauthorized();

        var isAdmin = User.IsInRole(Roles.Admin);

        var conversation = await Context.Conversations.FirstOrDefaultAsync(c => c.Id == conversationId);

        if (conversation is null)
            return NotFound();

        if (!isAdmin && conversation.CustomerId != currentUserId)
            return Forbid();

        var messages = await Context
            .ConversationMessages.Where(m => m.ConversationId == conversationId && !m.IsDeleted)
            .Include(m => m.Participant)
            .ThenInclude(p => p.User)
            .OrderBy(m => m.CreatedAt)
            .Select(m => new SummaryMessage
            {
                SenderName = m.Participant.User.UserName ?? m.Participant.User.Email ?? "Unknown",
                Role = m.Participant.Role == ConversationParticipantRole.Admin ? "admin/support" : "customer",
                Content = m.IsCallMessage ? $"[Call: {m.Content}]" : m.Content,
                Timestamp = m.CreatedAt,
            })
            .ToListAsync();

        if (messages.Count == 0)
            return Ok(
                new
                {
                    summary = "No messages in this conversation yet.",
                    keyPoints = Array.Empty<string>(),
                    sentiment = "neutral",
                    resolved = false,
                    actionItems = Array.Empty<string>(),
                    messageCount = 0,
                    durationMinutes = 0,
                }
            );

        var statusText = conversation.Status switch
        {
            ConversationStatus.Pending => "Pending",
            ConversationStatus.Active => "Active",
            ConversationStatus.Resolved => "Resolved",
            ConversationStatus.Closed => "Closed",
            _ => "Unknown",
        };

        var priorityText = conversation.Priority switch
        {
            ConversationPriority.Low => "Low",
            ConversationPriority.Normal => "Normal",
            ConversationPriority.High => "High",
            ConversationPriority.Urgent => "Urgent",
            _ => "Normal",
        };

        var result = await _chatService.GenerateConversationSummaryAsync(
            conversation.Subject,
            statusText,
            priorityText,
            conversation.CreatedAt,
            messages
        );

        return Ok(
            new
            {
                summary = result.Summary,
                keyPoints = result.KeyPoints,
                sentiment = result.Sentiment,
                resolved = result.Resolved,
                actionItems = result.ActionItems,
                messageCount = result.MessageCount,
                durationMinutes = (int)result.Duration.TotalMinutes,
            }
        );
    }
}
