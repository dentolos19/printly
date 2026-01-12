using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using PrintlyServer.Data.Entities;

namespace PrintlyServer.Services;

public class GenerativeService
{
    private readonly HttpClient _http;
    private readonly StorageService _storage;

    public GenerativeService(IConfiguration configuration, StorageService storage)
    {
        _storage = storage;

        // Load environment variables
        var apiKey = configuration["OPENROUTER_API_KEY"]!;

        // Initialize HTTP client
        _http = new HttpClient();
        _http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        _http.DefaultRequestHeaders.Add("HTTP-Referer", "https://printly.dennise.me");
        _http.DefaultRequestHeaders.Add("X-Title", "Printly");
    }

    public async Task<string> GenerateTextAsync(string prompt)
    {
        var requestBody = new
        {
            model = "google/gemini-2.5-flash",
            messages = new[] { new { role = "user", content = prompt } },
        };

        var response = await _http.PostAsync(
            "https://openrouter.ai/api/v1/chat/completions",
            new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json")
        );

        if (!response.IsSuccessStatusCode)
            throw new Exception("Failed to generate text.");

        var responseBody = await response.Content.ReadAsStringAsync();
        var responseJson = JsonSerializer.Deserialize<JsonElement>(responseBody);

        // Extract and return generated text
        return responseJson.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString()
            ?? string.Empty;
    }

    public async Task<Asset> GenerateImageAsync(string prompt, string? style = null)
    {
        var styledPrompt = string.IsNullOrEmpty(style) ? prompt : $"{prompt}, in {style.Replace("-", " ")} style";

        var requestBody = new
        {
            model = "google/gemini-2.5-flash-image",
            messages = new[] { new { role = "user", content = styledPrompt } },
            modalities = new[] { "image", "text" },
            stream = false,
        };

        var response = await _http.PostAsync(
            "https://openrouter.ai/api/v1/chat/completions",
            new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json")
        );

        if (!response.IsSuccessStatusCode)
            throw new Exception("Failed to generate text.");

        var responseBody = await response.Content.ReadAsStringAsync();
        var responseJson = JsonSerializer.Deserialize<JsonElement>(responseBody);

        // Extract image URL from response
        var imageUrl =
            responseJson
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("images")[0]
                .GetProperty("image_url")
                .GetProperty("url")
                .GetString()
            ?? string.Empty;

        // Convert base64 image to stream
        var imageText = imageUrl.Split(',')[1];
        var imageBytes = Convert.FromBase64String(imageText);
        var imageStream = new MemoryStream(imageBytes);

        // Upload image to storage and return asset
        var imageAsset = await _storage.UploadFileAsync(imageStream, prompt);
        return imageAsset;
    }
}
