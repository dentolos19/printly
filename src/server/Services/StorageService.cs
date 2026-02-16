using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using PrintlyServer.Data;
using PrintlyServer.Data.Entities;

namespace PrintlyServer.Services;

public class StorageService
{
    private readonly DatabaseContext _context;

    private readonly IAmazonS3 _client;
    private readonly string _bucketName;
    private readonly string _bucketPrefix;

    public StorageService(IConfiguration configuration, DatabaseContext context)
    {
        _context = context;

        // Load environment variables
        var bucketEndpointUrl = configuration["BUCKET_ENDPOINT_URL"]!;
        var bucketAccessId = configuration["BUCKET_ACCESS_ID"]!;
        var bucketSecretKey = configuration["BUCKET_SECRET_KEY"]!;
        var bucketName = configuration["BUCKET_NAME"]!;
        var bucketPrefix = configuration["BUCKET_PREFIX"]!;

        // Initialize S3 client
        _client = new AmazonS3Client(
            new BasicAWSCredentials(bucketAccessId, bucketSecretKey),
            new AmazonS3Config
            {
                ServiceURL = bucketEndpointUrl,
                AuthenticationRegion = "auto",
                ForcePathStyle = true,
                RequestChecksumCalculation = RequestChecksumCalculation.WHEN_REQUIRED,
                ResponseChecksumValidation = ResponseChecksumValidation.WHEN_REQUIRED,
            }
        );

        // Assign bucket details
        _bucketName = bucketName;
        _bucketPrefix = bucketPrefix;
    }

    public async Task<Asset> UploadFileAsync(Stream file, string name, string? category = null)
    {
        var fileId = Guid.NewGuid();
        var fileType = Utilities.GetContentType(file);
        var fileHash = Utilities.ComputeHash(file);
        var fileSize = file.Length;

        file.Seek(0, SeekOrigin.Begin);

        var request = new PutObjectRequest
        {
            BucketName = _bucketName,
            Key = $"{_bucketPrefix}/{fileId}",
            InputStream = file,
            ContentType = fileType,
            DisablePayloadSigning = true,
            DisableDefaultChecksumValidation = true,
            UseChunkEncoding = false,
        };

        // Execute upload request
        await _client.PutObjectAsync(request);

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

    public async Task<string> DownloadFileAsync(Asset file)
    {
        var request = new GetPreSignedUrlRequest
        {
            BucketName = _bucketName,
            Key = $"{_bucketPrefix}/{file.Id}",
            Expires = DateTime.UtcNow.AddMinutes(60),
        };

        // Generate and return the pre-signed URL
        return _client.GetPreSignedURL(request);
    }

    public async Task<Stream> StreamFileAsync(Asset file)
    {
        var request = new GetObjectRequest { BucketName = _bucketName, Key = $"{_bucketPrefix}/{file.Id}" };

        // Execute request and return download stream
        var response = await _client.GetObjectAsync(request);
        return response.ResponseStream;
    }

    public async Task DeleteFileAsync(Asset file)
    {
        // Mark the file as deleted in the database
        file.IsDeleted = true;
        _context.Assets.Update(file);
        await _context.SaveChangesAsync();
    }
}
