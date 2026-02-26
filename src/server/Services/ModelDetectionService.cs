using System.Numerics;
using System.Text.RegularExpressions;
using PrintlyServer.Data.Entities;
using SharpGLTF.Schema2;

namespace PrintlyServer.Services;

/// <summary>
/// Represents a detected print area from a 3D model.
/// </summary>
public record DetectedArea(
    string AreaId,
    string Name,
    string? MeshName,
    float RayDirectionX,
    float RayDirectionY,
    float RayDirectionZ,
    int DisplayOrder,
    bool IsAutoDetected = true
);

/// <summary>
/// Analyzes GLB/GLTF models to automatically detect printable surface areas
/// using mesh name heuristics and geometry-based normal analysis.
/// </summary>
public partial class ModelDetectionService
{
    private static readonly Dictionary<string, string> AreaIdMap = new(StringComparer.OrdinalIgnoreCase)
    {
        ["front"] = "front",
        ["frente"] = "front",
        ["forward"] = "front",
        ["chest"] = "front",
        ["back"] = "back",
        ["rear"] = "back",
        ["behind"] = "back",
        ["left sleeve"] = "left-sleeve",
        ["left-sleeve"] = "left-sleeve",
        ["leftsleeve"] = "left-sleeve",
        ["right sleeve"] = "right-sleeve",
        ["right-sleeve"] = "right-sleeve",
        ["rightsleeve"] = "right-sleeve",
        ["sleeve"] = "sleeve",
        ["pocket"] = "pocket",
        ["collar"] = "collar",
        ["hood"] = "hood",
        ["bottom"] = "bottom",
        ["top"] = "top",
    };

    private static readonly Dictionary<string, int> DisplayOrderMap = new()
    {
        ["front"] = 0,
        ["back"] = 1,
        ["left-sleeve"] = 2,
        ["right-sleeve"] = 3,
        ["pocket"] = 4,
        ["collar"] = 5,
        ["hood"] = 6,
        ["top"] = 7,
        ["bottom"] = 8,
    };

    private static readonly List<(Regex Pattern, Func<Match, string> NameExtractor)> PrintAreaPatterns =
    [
        (PrintAreaPrefixRegex(), m => FormatAreaName(m.Groups[1].Value)),
        (PrintSuffixRegex(), m => FormatAreaName(m.Groups[1].Value)),
        (PrintPrefixRegex(), m => FormatAreaName(m.Groups[1].Value)),
    ];

    /// <summary>
    /// Detects print areas from a GLB/GLTF model stream.
    /// Returns detected areas, or an empty list if no areas are found.
    /// </summary>
    public List<DetectedArea> DetectFromStream(Stream modelStream)
    {
        var model = ModelRoot.ReadGLB(modelStream);
        return DetectFromModel(model);
    }

    /// <summary>
    /// Detects print areas from a parsed GLTF model.
    /// Combines name-based pattern matching with geometry-based analysis.
    /// </summary>
    public List<DetectedArea> DetectFromModel(ModelRoot model)
    {
        var detectedAreas = new List<DetectedArea>();
        var seenAreaIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        // Phase 1: name-based detection using mesh naming conventions
        foreach (var mesh in model.LogicalMeshes)
        {
            var meshName = mesh.Name ?? "";
            if (string.IsNullOrWhiteSpace(meshName))
                continue;

            var area = TryDetectByName(meshName);
            if (area != null && seenAreaIds.Add(area.AreaId))
            {
                detectedAreas.Add(area);
            }
        }

        // Also check node names (meshes may be unnamed but nodes have names)
        foreach (var node in model.LogicalNodes)
        {
            var nodeName = node.Name ?? "";
            if (string.IsNullOrWhiteSpace(nodeName))
                continue;

            var meshName = node.Mesh?.Name;
            var area = TryDetectByName(nodeName);
            if (area != null && seenAreaIds.Add(area.AreaId))
            {
                detectedAreas.Add(area with { MeshName = meshName ?? nodeName });
            }
        }

        // Phase 2: if name-based detection found nothing, try geometry-based detection
        if (detectedAreas.Count == 0)
        {
            detectedAreas = DetectByGeometry(model);
        }

        // Sort by standard display order
        detectedAreas.Sort((a, b) =>
            {
                var orderA = DisplayOrderMap.GetValueOrDefault(a.AreaId, 999);
                var orderB = DisplayOrderMap.GetValueOrDefault(b.AreaId, 999);
                return orderA.CompareTo(orderB);
            }
        );

        // Reassign display order after sorting
        for (var i = 0; i < detectedAreas.Count; i++)
        {
            detectedAreas[i] = detectedAreas[i] with { DisplayOrder = i };
        }

        return detectedAreas;
    }

    /// <summary>
    /// Returns default print areas for a product based on its name.
    /// Used as a fallback when detection fails entirely.
    /// </summary>
    public static List<DetectedArea> GetDefaultAreas(string? productName = null)
    {
        var isApparel = IsApparelProduct(productName);

        var defaults = new List<DetectedArea>
        {
            new("front", "Front", null, 0, 0, 1, 0),
            new("back", "Back", null, 0, 0, -1, 1),
        };

        if (isApparel)
        {
            defaults.Add(new DetectedArea("left-sleeve", "Left Sleeve", null, -1, 0, 0, 2));
            defaults.Add(new DetectedArea("right-sleeve", "Right Sleeve", null, 1, 0, 0, 3));
        }

        return defaults;
    }

    private static DetectedArea? TryDetectByName(string name)
    {
        foreach (var (pattern, nameExtractor) in PrintAreaPatterns)
        {
            var match = pattern.Match(name);
            if (!match.Success)
                continue;

            var areaName = nameExtractor(match);
            var areaId = NormalizeAreaId(areaName);
            var rayDirection = GetRayDirectionForArea(areaId);

            return new DetectedArea(areaId, areaName, name, rayDirection.X, rayDirection.Y, rayDirection.Z, 0);
        }

        // Direct keyword match: check if the mesh name itself is a known area
        var directId = NormalizeAreaId(name);
        if (AreaIdMap.ContainsValue(directId))
        {
            var rayDirection = GetRayDirectionForArea(directId);
            return new DetectedArea(
                directId,
                FormatAreaName(name),
                name,
                rayDirection.X,
                rayDirection.Y,
                rayDirection.Z,
                0
            );
        }

        return null;
    }

    private List<DetectedArea> DetectByGeometry(ModelRoot model)
    {
        var areas = new List<DetectedArea>();
        var seenAreaIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var mesh in model.LogicalMeshes)
        {
            var avgNormal = ComputeAverageNormal(mesh);
            if (avgNormal == null)
                continue;

            var (areaId, areaName) = ClassifyByNormal(avgNormal.Value);
            if (!seenAreaIds.Add(areaId))
                continue;

            var ray = GetRayDirectionFromNormal(avgNormal.Value);

            areas.Add(new DetectedArea(areaId, areaName, mesh.Name, ray.X, ray.Y, ray.Z, 0));
        }

        return areas;
    }

    private static Vector3? ComputeAverageNormal(SharpGLTF.Schema2.Mesh mesh)
    {
        var sum = Vector3.Zero;
        var count = 0;

        foreach (var primitive in mesh.Primitives)
        {
            var normals = primitive.GetVertexAccessor("NORMAL");
            if (normals == null)
                continue;

            var normalArray = normals.AsVector3Array();
            foreach (var n in normalArray)
            {
                sum += n;
                count++;
            }
        }

        if (count == 0)
            return null;

        var avg = sum / count;
        var length = avg.Length();
        if (length < 0.001f)
            return null;

        return Vector3.Normalize(avg);
    }

    private static (string AreaId, string Name) ClassifyByNormal(Vector3 normal)
    {
        var absX = Math.Abs(normal.X);
        var absY = Math.Abs(normal.Y);
        var absZ = Math.Abs(normal.Z);

        if (absZ >= absX && absZ >= absY)
        {
            return normal.Z > 0 ? ("front", "Front") : ("back", "Back");
        }

        if (absX >= absY)
        {
            return normal.X < 0 ? ("left-sleeve", "Left Sleeve") : ("right-sleeve", "Right Sleeve");
        }

        return normal.Y > 0 ? ("top", "Top") : ("bottom", "Bottom");
    }

    private static Vector3 GetRayDirectionFromNormal(Vector3 normal)
    {
        return -normal;
    }

    private static Vector3 GetRayDirectionForArea(string areaId) =>
        areaId switch
        {
            "front" => new Vector3(0, 0, 1),
            "back" => new Vector3(0, 0, -1),
            "left-sleeve" => new Vector3(-1, 0, 0),
            "right-sleeve" => new Vector3(1, 0, 0),
            "top" => new Vector3(0, 1, 0),
            "bottom" => new Vector3(0, -1, 0),
            "pocket" => new Vector3(0, 0, 1),
            "collar" => new Vector3(0, 1, 0),
            "hood" => new Vector3(0, 0, -1),
            _ => new Vector3(0, 0, 1),
        };

    private static string NormalizeAreaId(string name)
    {
        var normalized = name.ToLowerInvariant().Trim();

        // Check exact and substring matches against known areas
        foreach (var (key, value) in AreaIdMap)
        {
            if (normalized.Contains(key, StringComparison.OrdinalIgnoreCase))
            {
                return value;
            }
        }

        // Fallback: slugify the name
        return SlugifyRegex().Replace(normalized, "-").Trim('-');
    }

    private static string FormatAreaName(string raw)
    {
        var spaced = raw.Replace('_', ' ').Replace('-', ' ');

        // Insert space before uppercase letters in camelCase
        spaced = CamelCaseSplitRegex().Replace(spaced, "$1 $2");

        return string.Join(
            ' ',
            spaced
                .Split(' ', StringSplitOptions.RemoveEmptyEntries)
                .Select(w => char.ToUpperInvariant(w[0]) + w[1..].ToLowerInvariant())
        );
    }

    private static bool IsApparelProduct(string? productName)
    {
        if (string.IsNullOrWhiteSpace(productName))
            return false;

        var apparelKeywords = new[]
        {
            "shirt",
            "tshirt",
            "t-shirt",
            "hoodie",
            "sweater",
            "sweatshirt",
            "jacket",
            "polo",
            "jersey",
            "tank",
            "top",
            "blouse",
            "vest",
        };

        var lower = productName.ToLowerInvariant();
        return apparelKeywords.Any(k => lower.Contains(k));
    }

    // Regex patterns matching conventions from the frontend detection utility.
    // Exact matches like "PrintArea_Front" or "PrintArea-Back"
    [GeneratedRegex(@"^PrintArea[_\-]?(.+)$", RegexOptions.IgnoreCase)]
    private static partial Regex PrintAreaPrefixRegex();

    // Mesh names like "front_print" or "back_printable"
    [GeneratedRegex(@"^(.+)[_\-]?print(?:able)?$", RegexOptions.IgnoreCase)]
    private static partial Regex PrintSuffixRegex();

    // Mesh names like "print_front" or "printarea_back"
    [GeneratedRegex(@"^print(?:area)?[_\-]?(.+)$", RegexOptions.IgnoreCase)]
    private static partial Regex PrintPrefixRegex();

    [GeneratedRegex(@"([a-z])([A-Z])")]
    private static partial Regex CamelCaseSplitRegex();

    [GeneratedRegex(@"[^a-z0-9]+")]
    private static partial Regex SlugifyRegex();
}
