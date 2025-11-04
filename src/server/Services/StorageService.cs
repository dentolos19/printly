using Amazon.Runtime;
using Amazon.S3;

namespace MocklyServer.Services;

public class StorageService
{
    private readonly IAmazonS3 _client;
    private readonly string _bucketName;
    private readonly string _bucketPrefix;

    public StorageService(IConfiguration configuration)
    {
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
                RegionEndpoint = Amazon.RegionEndpoint.USEast1,
                ServiceURL = bucketEndpointUrl,
                ForcePathStyle = true,
            }
        );

        // Assign bucket details
        _bucketName = bucketName;
        _bucketPrefix = bucketPrefix;
    }

    public async Task UploadFileAsync(Stream file, string name)
    {
        var request = new Amazon.S3.Model.PutObjectRequest
        {
            BucketName = _bucketName,
            Key = $"{_bucketPrefix}/{name}",
            InputStream = file,
            ContentType = Utilities.GetContentType(file),
            DisablePayloadSigning = true,
            UseChunkEncoding = false,
        };

        await _client.PutObjectAsync(request);
    }

    public async Task<Stream> DownloadFileAsync(string name)
    {
        var request = new Amazon.S3.Model.GetObjectRequest
        {
            BucketName = _bucketName,
            Key = $"{_bucketPrefix}/{name}",
        };

        var response = await _client.GetObjectAsync(request);
        return response.ResponseStream;
    }

    public async Task DeleteFileAsync(string name)
    {
        var request = new Amazon.S3.Model.DeleteObjectRequest
        {
            BucketName = _bucketName,
            Key = $"{_bucketPrefix}/{name}",
        };

        await _client.DeleteObjectAsync(request);
    }

    public async Task<string> GeneratePreSignedUrl(string name)
    {
        var request = new Amazon.S3.Model.GetPreSignedUrlRequest
        {
            BucketName = _bucketName,
            Key = $"{_bucketPrefix}/{name}",
            Expires = DateTime.UtcNow.AddMinutes(60),
        };

        return _client.GetPreSignedURL(request);
    }
}