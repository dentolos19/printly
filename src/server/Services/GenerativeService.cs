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
        var imageAsset = await _storage.UploadFileAsync(imageStream, prompt, AssetCategory.Generated);
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
                        new { type = "image_url", image_url = new { url = imageUrl } },
                    },
                },
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

    /// <summary>
    /// Processes audio from a call recording and generates a transcript with notes.
    /// Converts audio to WAV format first (universally supported by OpenRouter/Gemini),
    /// then sends it for transcription and note generation.
    /// </summary>
    public async Task<(string Transcript, string Notes)> GenerateCallNotesAsync(byte[] audioBytes, string mimeType)
    {
        // Convert the audio to WAV using ffmpeg for maximum compatibility
        // OpenRouter reliably supports WAV format for all audio models
        byte[] wavBytes;
        try
        {
            wavBytes = await ConvertToWavAsync(audioBytes, mimeType);
        }
        catch (Exception ex)
        {
            // If conversion fails, try sending the original format
            Console.WriteLine($"[GenerativeService] WAV conversion failed, trying original format: {ex.Message}");
            wavBytes = audioBytes;
        }

        var audioFormat =
            wavBytes == audioBytes
                ? (
                    mimeType.Contains("ogg") ? "ogg"
                    : mimeType.Contains("wav") ? "wav"
                    : "ogg"
                )
                : "wav";

        // Build the multimodal request with audio input for OpenRouter
        var requestBody = new
        {
            model = "google/gemini-2.5-flash",
            messages = new object[]
            {
                new
                {
                    role = "user",
                    content = new object[]
                    {
                        new
                        {
                            type = "input_audio",
                            input_audio = new { data = Convert.ToBase64String(wavBytes), format = audioFormat },
                        },
                        new
                        {
                            type = "text",
                            text = @"You are an AI assistant for Printly, a customer support platform.
Listen carefully to this support call recording and produce two sections based ONLY on what you actually hear.

IMPORTANT: Only transcribe speech that you can actually hear in the audio. If the audio is silent, very short, or unclear, say so honestly. Do NOT make up or fabricate any dialogue.

TRANSCRIPT:
Provide a clean transcript of what was actually said. Identify speakers where possible. If you cannot hear clear speech, write ""[No clear speech detected]"".

NOTES:
Based ONLY on what was actually said in the recording:
- A 1-2 sentence summary
- Key points discussed
- Any action items mentioned

If the recording has no audible speech, write ""No audible conversation detected in this recording.""

Format your response exactly like this:
---TRANSCRIPT---
[transcript here]
---NOTES---
[notes here]",
                        },
                    },
                },
            },
            max_tokens = 4000,
        };

        var response = await _http.PostAsync(
            "https://openrouter.ai/api/v1/chat/completions",
            new StringContent(System.Text.Json.JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json")
        );

        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync();
            throw new Exception($"Failed to generate call notes: {errorBody}");
        }

        var responseBody = await response.Content.ReadAsStringAsync();
        var responseJson = System.Text.Json.JsonSerializer.Deserialize<JsonElement>(responseBody);
        var fullResponse =
            responseJson.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString()
            ?? string.Empty;

        // Parse the two sections from the response
        var transcript = "";
        var notes = "";

        var transcriptMarker = "---TRANSCRIPT---";
        var notesMarker = "---NOTES---";

        var transcriptIdx = fullResponse.IndexOf(transcriptMarker, StringComparison.OrdinalIgnoreCase);
        var notesIdx = fullResponse.IndexOf(notesMarker, StringComparison.OrdinalIgnoreCase);

        if (transcriptIdx >= 0 && notesIdx >= 0)
        {
            transcript = fullResponse
                .Substring(transcriptIdx + transcriptMarker.Length, notesIdx - transcriptIdx - transcriptMarker.Length)
                .Trim();
            notes = fullResponse.Substring(notesIdx + notesMarker.Length).Trim();
        }
        else
        {
            notes = fullResponse.Trim();
            transcript = "";
        }

        return (transcript, notes);
    }

    /// <summary>
    /// Converts audio bytes from any format to WAV using ffmpeg.
    /// WAV is the most universally supported audio format for AI models.
    /// </summary>
    private static async Task<byte[]> ConvertToWavAsync(byte[] inputBytes, string mimeType)
    {
        // Determine input format for ffmpeg
        var inputExt = mimeType switch
        {
            var m when m.Contains("ogg") => "ogg",
            var m when m.Contains("webm") => "webm",
            var m when m.Contains("mp4") || m.Contains("m4a") => "m4a",
            var m when m.Contains("mp3") || m.Contains("mpeg") => "mp3",
            _ => "webm",
        };

        // Create temp files for ffmpeg
        var inputPath = Path.Combine(Path.GetTempPath(), $"call-input-{Guid.NewGuid()}.{inputExt}");
        var outputPath = Path.Combine(Path.GetTempPath(), $"call-output-{Guid.NewGuid()}.wav");

        try
        {
            // Write input to temp file
            await File.WriteAllBytesAsync(inputPath, inputBytes);

            // Run ffmpeg to convert to WAV (16kHz mono, good for speech recognition)
            var process = new System.Diagnostics.Process
            {
                StartInfo = new System.Diagnostics.ProcessStartInfo
                {
                    FileName = "ffmpeg",
                    Arguments = $"-i \"{inputPath}\" -ar 16000 -ac 1 -f wav \"{outputPath}\" -y",
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true,
                },
            };

            process.Start();
            var stderr = await process.StandardError.ReadToEndAsync();
            await process.WaitForExitAsync();

            if (process.ExitCode != 0)
            {
                throw new Exception($"ffmpeg conversion failed (exit {process.ExitCode}): {stderr}");
            }

            // Read the converted WAV file
            return await File.ReadAllBytesAsync(outputPath);
        }
        finally
        {
            // Clean up temp files
            if (File.Exists(inputPath))
                File.Delete(inputPath);
            if (File.Exists(outputPath))
                File.Delete(outputPath);
        }
    }
}
