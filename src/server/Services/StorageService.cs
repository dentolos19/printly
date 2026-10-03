using Amazon.S3;
using Amazon.S3.Model;
using PrintlyServer.Data;
using PrintlyServer.Data.Entities;

namespace PrintlyServer.Services;

public class StorageService : IDisposable
{
    private const string Bucket = "main";
    private readonly DatabaseContext _context;
    private readonly AmazonS3Client _client;
    private readonly string _appUrl;

    public StorageService(IConfiguration configuration, DatabaseContext context)
    {
        _context = context;
        _appUrl = (configuration["APP_URL"] ?? "http://localhost:3000").TrimEnd('/');
        _client = new AmazonS3Client(
            configuration["AWS_ACCESS_KEY_ID"] ?? throw new InvalidOperationException("AWS_ACCESS_KEY_ID is required."),
            configuration["AWS_SECRET_ACCESS_KEY"] ?? throw new InvalidOperationException("AWS_SECRET_ACCESS_KEY is required."),
            new AmazonS3Config
            {
                ServiceURL = configuration["AWS_ENDPOINT_URL_S3"] ?? throw new InvalidOperationException("AWS_ENDPOINT_URL_S3 is required."),
                AuthenticationRegion = configuration["AWS_REGION"] ?? "us-east-2",
                ForcePathStyle = true,
            }
        );
    }

    public void Dispose()
    {
        _client.Dispose();
        GC.SuppressFinalize(this);
    }

    public async Task<Asset> UploadFileAsync(Stream file, string name, string? category = null)
    {
        var fileId = Guid.NewGuid();
        var fileType = Utilities.GetContentType(file);
        var fileHash = Utilities.ComputeHash(file);
        var fileSize = file.Length;
        file.Seek(0, SeekOrigin.Begin);

        await _client.PutObjectAsync(new PutObjectRequest
        {
            BucketName = Bucket,
            Key = fileId.ToString(),
            InputStream = file,
            ContentType = fileType,
            AutoCloseStream = false,
            UseChunkEncoding = false,
            DisableDefaultChecksumValidation = true,
        });

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
        var response = await _client.GetObjectAsync(Bucket, file.Id.ToString());
        return response.ResponseStream;
    }

    public async Task DeleteFileAsync(Asset file)
    {
        // Keep the existing soft-delete behavior. Asset routes exclude deleted records.
        file.IsDeleted = true;
        _context.Assets.Update(file);
        await _context.SaveChangesAsync();
    }
}
