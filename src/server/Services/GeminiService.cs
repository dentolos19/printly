using System.Text;
using System.Text.Json;

namespace PrintlyServer.Services;

public class GeminiService
{
    private readonly HttpClient _http;
    private readonly StorageService _storage;

    public GeminiService(IConfiguration configuration, StorageService storage)
    {
        // Load environment variables
        var googleApiKey = configuration["GOOGLE_API_KEY"]!;

        // Initialize HTTP client
        _http = new HttpClient();
        _http.DefaultRequestHeaders.Add("X-Goog-Api-Key", googleApiKey);

        // Attach services
        _storage = storage;
    }

    public async Task<byte[]> GenerateImageAsync(string prompt)
    {
        var requestBody = new { contents = new[] { new { parts = new[] { new { text = prompt } } } } };
        var requestJson = JsonSerializer.Serialize(requestBody);

        var response = await _http.PostAsync(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent",
            new StringContent(requestJson, Encoding.UTF8, "application/json")
        );

        if (!response.IsSuccessStatusCode)
            throw new Exception("Failed to generate image.");

        // Extract and parse the response
        var responseBody = await response.Content.ReadAsStringAsync();
        using var responseJson = JsonDocument.Parse(responseBody);

        // Extract image data from the response
        var candidates = responseJson.RootElement.GetProperty("candidates");
        var inlineData = candidates[0].GetProperty("content").GetProperty("parts")[0].GetProperty("inlineData");
        var encodedData = inlineData.GetProperty("data").GetString()!;
        var bytesData = Convert.FromBase64String(encodedData);

        // Store the generated image to storage
        using var stream = new MemoryStream(bytesData);
        await _storage.UploadFileAsync(stream, $"generated/{Guid.NewGuid()}.png");

        return bytesData;
    }
}