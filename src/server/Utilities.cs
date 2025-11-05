using MimeDetective;
using Npgsql;

namespace MocklyServer;

public static class Utilities
{
    public static string GetContentType(Stream stream, string defaultType = "application/octet-stream")
    {
        var contentType = new ContentInspectorBuilder
        {
            Definitions = MimeDetective.Definitions.DefaultDefinitions.All(),
        }
            .Build()
            .Inspect(stream)
            .ByMimeType()
            .FirstOrDefault()
            ?.MimeType;

        return contentType ?? defaultType;
    }
}