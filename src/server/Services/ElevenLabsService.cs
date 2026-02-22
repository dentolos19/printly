using System.Text.Json;

namespace PrintlyServer.Services;

public class ElevenLabsService
{
    private readonly HttpClient _httpClient;
    private readonly string _apiKey;
    private readonly string _agentId;
    private readonly ILogger<ElevenLabsService> _logger;

    public ElevenLabsService(IConfiguration configuration, ILogger<ElevenLabsService> logger)
    {
        _httpClient = new HttpClient { BaseAddress = new Uri("https://api.elevenlabs.io") };
        _apiKey =
            configuration["ELEVENLABS_API_KEY"]
            ?? throw new InvalidOperationException("ELEVENLABS_API_KEY not configured");
        _agentId =
            configuration["ELEVENLABS_AGENT_ID"]
            ?? throw new InvalidOperationException("ELEVENLABS_AGENT_ID not configured");
        _logger = logger;
    }

    /// <summary>
    /// Get a signed URL for the ElevenLabs Conversational AI agent.
    /// The signed URL is valid for 15 minutes and allows the client to
    /// establish a WebSocket connection without exposing the API key.
    /// </summary>
    public async Task<string> GetSignedUrlAsync()
    {
        try
        {
            var request = new HttpRequestMessage(
                HttpMethod.Get,
                $"/v1/convai/conversation/get-signed-url?agent_id={_agentId}"
            );
            request.Headers.Add("xi-api-key", _apiKey);

            var response = await _httpClient.SendAsync(request);
            response.EnsureSuccessStatusCode();

            var json = await response.Content.ReadAsStringAsync();
            var doc = JsonDocument.Parse(json);
            var signedUrl =
                doc.RootElement.GetProperty("signed_url").GetString()
                ?? throw new InvalidOperationException("signed_url not found in response");

            _logger.LogInformation("Generated ElevenLabs signed URL for agent {AgentId}", _agentId);
            return signedUrl;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get ElevenLabs signed URL for agent {AgentId}", _agentId);
            throw;
        }
    }
}
