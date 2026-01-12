﻿using System.Net.Http.Headers;
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

    public async Task<Asset> GenerateImageAsync(string prompt)
    {
        var requestBody = new
        {
            model = "google/gemini-2.5-flash-image",
            messages = new[] { new { role = "user", content = prompt } },
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

    /// <summary>
    /// Analyzes an image and generates a caption for social media posts.
    /// </summary>
    /// <param name="imageUrl">The URL of the image to analyze</param>
    /// <param name="userPrompt">Optional user guidance for caption style/content</param>
    /// <returns>A generated caption for the image</returns>
    public async Task<string> GenerateCaptionAsync(string imageUrl, string? userPrompt = null)
    {
        var systemInstruction = """
            You are a creative social media caption writer for Printly, a print-on-demand design platform.
            Your task is to analyze images and generate engaging, creative captions for community posts.

            Guidelines:
            - Keep captions concise (1-3 sentences, max 280 characters)
            - Be creative, engaging, and relatable
            - Use appropriate tone based on the image content
            - Include relevant emojis where appropriate
            - If the user provides guidance, incorporate their preferences
            - Focus on the visual elements and mood of the image
            - Make it suitable for a creative design community

            Only output the caption text, nothing else.
            """;

        var userMessage = string.IsNullOrWhiteSpace(userPrompt)
            ? "Generate an engaging social media caption for this image."
            : $"Generate an engaging social media caption for this image. User guidance: {userPrompt}";

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
                        new { type = "text", text = userMessage },
                        new { type = "image_url", image_url = new { url = imageUrl } }
                    }
                }
            },
            max_tokens = 300,
        };

        var response = await _http.PostAsync(
            "https://openrouter.ai/api/v1/chat/completions",
            new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json")
        );

        if (!response.IsSuccessStatusCode)
        {
            var errorContent = await response.Content.ReadAsStringAsync();
            throw new Exception($"Failed to generate caption: {errorContent}");
        }

        var responseBody = await response.Content.ReadAsStringAsync();
        var responseJson = JsonSerializer.Deserialize<JsonElement>(responseBody);

        return responseJson.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString()
            ?? string.Empty;
    }
}
