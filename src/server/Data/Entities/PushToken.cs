namespace PrintlyServer.Data.Entities;

public enum PushPlatform
{
    iOS,
    Android,
    Web,
}

public class PushToken : BaseEntity
{
    public string UserId { get; set; } = null!;
    public User User { get; set; } = null!;

    public string Token { get; set; } = null!;

    public PushPlatform Platform { get; set; }
}
