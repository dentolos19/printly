using System.Net.Http.Headers;
using PrintlyServer.Data;
using PrintlyServer.Data.Entities;

namespace PrintlyServer.Services;

public class StorageService : IDisposable
{
    private readonly DatabaseContext _context;

    private readonly HttpClient _client;
    private readonly string _appUrl;

    public StorageService(IConfiguration configuration, DatabaseContext context)
    {
        _context = context;

        _appUrl = (configuration["APP_URL"] ?? "http://localhost:3000").TrimEnd('/');
        _client = new HttpClient { BaseAddress = new Uri(_appUrl) };
        _client.DefaultRequestHeaders.Add("X-Storage-Key", configuration["SECRET_KEY"]);
    }

    public void Dispose()
    {
        _client?.Dispose();
        GC.SuppressFinalize(this);
    }

    public async Task<Asset> UploadFileAsync(Stream file, string name, string? category = null)
    {
        var fileId = Guid.NewGuid();
        var fileType = Utilities.GetContentType(file);
        var fileHash = Utilities.ComputeHash(file);
        var fileSize = file.Length;

        file.Seek(0, SeekOrigin.Begin);

        using var content = new StreamContent(file);
        content.Headers.ContentType = new MediaTypeHeaderValue(fileType);
        using var response = await _client.PutAsync($"/internal/storage/{fileId}", content);
        response.EnsureSuccessStatusCode();

        // Record file in the database
        var asset = _context.Add(
            new Asset
            {
                Id = fileId,
                Name = name,
                Type = fileType,
                Hash = fileHash,
                Size = fileSize,
                Category = category ?? AssetCategory.User,
            }
        );

        await _context.SaveChangesAsync();

        return asset.Entity;
    }

    public Task<string> DownloadFileAsync(Asset file) => Task.FromResult($"{_appUrl}/assets/{file.Id}/view");

    public async Task<Stream> StreamFileAsync(Asset file)
    {
        return await _client.GetStreamAsync($"/internal/storage/{file.Id}");
    }

    public async Task DeleteFileAsync(Asset file)
    {
        // Mark the file as deleted in the database
        file.IsDeleted = true;
        _context.Assets.Update(file);
        await _context.SaveChangesAsync();
    }
}
