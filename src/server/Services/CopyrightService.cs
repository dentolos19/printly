using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace PrintlyServer.Services;

public class CopyrightService
{
    private readonly HttpClient _http;

    public CopyrightService(IConfiguration configuration)
    {
        var apiKey = configuration["OPENROUTER_API_KEY"]!;

        _http = new HttpClient();
        _http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        _http.DefaultRequestHeaders.Add("HTTP-Referer", "https://printly.dennise.me");
        _http.DefaultRequestHeaders.Add("X-Title", "Printly");
    }

    /// <summary>
    /// Checks an image URL for copyrighted material using Gemini vision analysis.
    /// </summary>
    public async Task<ImageCopyrightResult> CheckImageAsync(string imageUrl)
    {
        var systemInstruction = """
            You are a copyright detection system. Analyze the provided image and determine whether it
            contains any recognizable copyrighted material, including but not limited to:
            - Trademarked logos or brand symbols (Nike swoosh, Apple logo, etc.)
            - Copyrighted fictional characters (Disney, Marvel, DC, anime, video game characters, etc.)
            - Copyrighted artwork or illustrations that are clearly derivative of known works
            - Sports team logos or league emblems
            - Celebrity likenesses used in a way that implies endorsement

            Do NOT flag:
            - Generic shapes, patterns, or color combinations
            - Original artwork that merely uses a similar art style
            - Public domain imagery or symbols
            - Common objects or scenes

            Respond ONLY with a valid JSON object (no markdown, no code fences) in this exact format:
            {
              "isViolation": true/false,
              "confidence": "high"/"medium"/"low",
              "detectedItems": ["item1", "item2"],
              "reason": "Brief explanation of what was detected"
            }

            If no copyrighted material is found, respond with:
            { "isViolation": false, "confidence": "high", "detectedItems": [], "reason": null }
            """;

        var requestBody = new
        {
            model = "google/gemini-2.5-flash",
            messages = new object[]
            {
                new { role = "system", content = systemInstruction },
                new
                {
                    role = "user",
                    content = new object[]
                    {
                        new { type = "text", text = "Analyze this image for copyrighted material." },
                        new { type = "image_url", image_url = new { url = imageUrl } },
                    },
                },
            },
            max_tokens = 500,
        };

        var response = await _http.PostAsync(
            "https://openrouter.ai/api/v1/chat/completions",
            new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json")
        );

        if (!response.IsSuccessStatusCode)
        {
            Console.WriteLine("[CopyrightService] Vision API call failed, allowing image through.");
            return ImageCopyrightResult.Clean;
        }

        try
        {
            var responseBody = await response.Content.ReadAsStringAsync();
            var responseJson = JsonSerializer.Deserialize<JsonElement>(responseBody);

            var content =
                responseJson.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString()
                ?? "{}";

            // Strip markdown code fences if the model wraps the JSON
            content = content.Trim();
            if (content.StartsWith("```"))
            {
                var firstNewline = content.IndexOf('\n');
                var lastFence = content.LastIndexOf("```");
                if (firstNewline >= 0 && lastFence > firstNewline)
                    content = content[(firstNewline + 1)..lastFence].Trim();
            }

            var result = JsonSerializer.Deserialize<JsonElement>(content);

            var isViolation = result.GetProperty("isViolation").GetBoolean();
            var confidence = result.TryGetProperty("confidence", out var conf) ? conf.GetString() ?? "low" : "low";

            // Only block on high confidence violations
            if (!isViolation || confidence == "low")
                return ImageCopyrightResult.Clean;

            var detectedItems = new List<string>();
            if (result.TryGetProperty("detectedItems", out var items) && items.ValueKind == JsonValueKind.Array)
            {
                foreach (var item in items.EnumerateArray())
                {
                    var val = item.GetString();
                    if (!string.IsNullOrWhiteSpace(val))
                        detectedItems.Add(val);
                }
            }

            var reason = result.TryGetProperty("reason", out var r) ? r.GetString() : "Copyrighted material detected.";

            return new ImageCopyrightResult(true, reason, detectedItems.ToArray());
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[CopyrightService] Failed to parse vision response: {ex.Message}");
            return ImageCopyrightResult.Clean;
        }
    }

    /// <summary>
    /// Checks a prompt for copyrighted references using the blocklist first, then an AI fallback
    /// for anything the blocklist might miss.
    /// </summary>
    public async Task<PromptCopyrightResult> CheckAndRewritePromptAsync(string prompt)
    {
        // Phase 1: fast blocklist scan
        var blocklistHits = CopyrightBlocklist.ScanPrompt(prompt);

        if (blocklistHits.Count > 0)
        {
            var rewritten = CopyrightBlocklist.RewritePrompt(prompt);
            var terms = blocklistHits.Select(h => h.MatchedTerm).ToArray();
            return new PromptCopyrightResult(
                true,
                terms,
                rewritten,
                $"Copyrighted terms detected: {string.Join(", ", terms)}. The prompt has been rewritten to avoid them."
            );
        }

        // Phase 2: AI fallback for terms the blocklist might miss
        var systemInstruction = """
            You are a copyright detection system for an AI image generation platform.
            Analyze the user's image generation prompt and determine whether it contains
            any DIRECT references to copyrighted material — including character names,
            brand names, trademarked terms, movie/show titles, or other protected IP.

            Do NOT flag:
            - Generic descriptions (e.g. "a superhero", "a cartoon mouse")
            - Art style references (e.g. "anime style", "Disney style" is acceptable phrasing for style)
            - Common words that happen to be trademarked in other contexts
            - Historical or mythological references

            If a violation is found, rewrite the prompt to use descriptive language that
            captures the user's intent without referencing the copyrighted material.

            Respond ONLY with a valid JSON object (no markdown, no code fences):
            {
              "hasViolation": true/false,
              "detectedTerms": ["term1", "term2"],
              "rewrittenPrompt": "the rewritten prompt if violation found, or the original if clean",
              "explanation": "Brief explanation or null"
            }
            """;

        var requestBody = new
        {
            model = "google/gemini-2.5-flash",
            messages = new object[]
            {
                new { role = "system", content = systemInstruction },
                new { role = "user", content = $"Check this image generation prompt: \"{prompt}\"" },
            },
            max_tokens = 500,
        };

        try
        {
            var response = await _http.PostAsync(
                "https://openrouter.ai/api/v1/chat/completions",
                new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json")
            );

            if (!response.IsSuccessStatusCode)
            {
                Console.WriteLine("[CopyrightService] Prompt check API call failed, allowing prompt through.");
                return PromptCopyrightResult.Clean(prompt);
            }

            var responseBody = await response.Content.ReadAsStringAsync();
            var responseJson = JsonSerializer.Deserialize<JsonElement>(responseBody);

            var content =
                responseJson.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString()
                ?? "{}";

            content = content.Trim();
            if (content.StartsWith("```"))
            {
                var firstNewline = content.IndexOf('\n');
                var lastFence = content.LastIndexOf("```");
                if (firstNewline >= 0 && lastFence > firstNewline)
                    content = content[(firstNewline + 1)..lastFence].Trim();
            }

            var result = JsonSerializer.Deserialize<JsonElement>(content);
            var hasViolation = result.GetProperty("hasViolation").GetBoolean();

            if (!hasViolation)
                return PromptCopyrightResult.Clean(prompt);

            var detectedTerms = new List<string>();
            if (result.TryGetProperty("detectedTerms", out var terms) && terms.ValueKind == JsonValueKind.Array)
            {
                foreach (var term in terms.EnumerateArray())
                {
                    var val = term.GetString();
                    if (!string.IsNullOrWhiteSpace(val))
                        detectedTerms.Add(val);
                }
            }

            var rewrittenPrompt = result.TryGetProperty("rewrittenPrompt", out var rp)
                ? rp.GetString() ?? prompt
                : prompt;

            var explanation = result.TryGetProperty("explanation", out var exp) ? exp.GetString() : null;

            return new PromptCopyrightResult(true, detectedTerms.ToArray(), rewrittenPrompt, explanation);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[CopyrightService] Prompt analysis failed: {ex.Message}");
            return PromptCopyrightResult.Clean(prompt);
        }
    }
}

public record ImageCopyrightResult(bool IsViolation, string? Reason, string[] DetectedItems)
{
    public static readonly ImageCopyrightResult Clean = new(false, null, []);
}

public record PromptCopyrightResult(
    bool HasViolation,
    string[] DetectedTerms,
    string RewrittenPrompt,
    string? Explanation
)
{
    public static PromptCopyrightResult Clean(string originalPrompt) => new(false, [], originalPrompt, null);
}
