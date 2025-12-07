using System.Security.Cryptography;
using MimeDetective;
using MimeDetective.Definitions;

namespace PrintlyServer;

public static class Utilities
{
    public static string GetContentType(Stream stream, string defaultType = "application/octet-stream")
    {
        var contentType = new ContentInspectorBuilder { Definitions = DefaultDefinitions.All() }
            .Build()
            .Inspect(stream)
            .ByMimeType()
            .FirstOrDefault()
            ?.MimeType;
        return contentType ?? defaultType;
    }

    public static string GenerateSecureToken()
    {
        var token = new byte[64];

        // Generate secure random bytes
        using var generator = RandomNumberGenerator.Create();
        generator.GetBytes(token);

        // Convert and return as string
        return Convert.ToBase64String(token);
    }
}