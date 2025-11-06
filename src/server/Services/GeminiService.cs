using System.Text;
using System.Text.Json;

namespace MocklyServer.Services;

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
        var requestBody = new { instances = new[] { new { prompt } }, parameters = new { sampleCount = 1 } };
        var requestJson = JsonSerializer.Serialize(requestBody);

        var response = await _http.PostAsync(
            "https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict",
            new StringContent(requestJson, Encoding.UTF8, "application/json")
        );

        if (!response.IsSuccessStatusCode)
            throw new Exception("Failed to generate image.");

        // Extract and parse the response
        var responseBody = await response.Content.ReadAsStringAsync();
        using var responseJson = JsonDocument.Parse(responseBody);

        // Extract image data from the response
        var predictions = responseJson.RootElement.GetProperty("predictions");
        var encodedData = predictions[0].GetProperty("bytesBase64Encoded").GetString()!;
        var bytesData = Convert.FromBase64String(encodedData);

        // Store the generated image to storage
        using var stream = new MemoryStream(bytesData);
        await _storage.UploadFileAsync(stream, $"generated/{Guid.NewGuid()}.png");

        return bytesData;
    }
}