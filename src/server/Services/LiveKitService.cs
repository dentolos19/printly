using Livekit.Server.Sdk.Dotnet;

namespace PrintlyServer.Services;

public interface ILiveKitService
{
    string GenerateToken(string participantId, string participantName, string roomName);
}

public class LiveKitService : ILiveKitService
{
    private readonly string _apiKey;
    private readonly string _apiSecret;
    private readonly ILogger<LiveKitService> _logger;

    public LiveKitService(IConfiguration configuration, ILogger<LiveKitService> logger)
    {
        _apiKey =
            configuration["LIVEKIT_API_KEY"] ?? throw new InvalidOperationException("LIVEKIT_API_KEY not configured");
        _apiSecret =
            configuration["LIVEKIT_API_SECRET"]
            ?? throw new InvalidOperationException("LIVEKIT_API_SECRET not configured");
        _logger = logger;
    }

    public string GenerateToken(string participantId, string participantName, string roomName)
    {
        try
        {
            var token = new AccessToken(_apiKey, _apiSecret)
                .WithIdentity(participantId)
                .WithName(participantName)
                .WithGrants(
                    new VideoGrants
                    {
                        RoomJoin = true,
                        Room = roomName,
                        CanPublish = true,
                        CanSubscribe = true,
                    }
                )
                .WithTtl(TimeSpan.FromHours(2));

            var jwt = token.ToJwt();
            _logger.LogInformation(
                "Generated LiveKit token for {ParticipantId} in room {RoomName}",
                participantId,
                roomName
            );
            return jwt;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate LiveKit token for {ParticipantId}", participantId);
            throw;
        }
    }
}
