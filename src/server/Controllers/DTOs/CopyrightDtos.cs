namespace PrintlyServer.Controllers.Dtos;

public record CopyrightCheckResponse(bool IsViolation, string? Reason, string[]? DetectedItems);

public record PromptCheckResponse(
    bool HasViolation,
    string[]? DetectedTerms,
    string RewrittenPrompt,
    string? Explanation
);
