using MimeDetective;

namespace MocklyServer;

public static class Utilities
{
    public static string GetContentType(Stream stream, string defaultType = "application/octet-stream")
    {
        var inspector = new ContentInspectorBuilder
        {
            Definitions = MimeDetective.Definitions.DefaultDefinitions.All(),
        }.Build();

        var result = inspector.Inspect(stream);
        var types = result.ByMimeType();
        return types.FirstOrDefault()?.MimeType ?? defaultType;
    }
}