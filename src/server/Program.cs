using DotNetEnv.Configuration;
using PrintlyServer.Extensions;
using PrintlyServer.Hubs;
using PrintlyServer.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration.AddDotNetEnv();

builder.Services.SetupCors();
builder.Services.SetupCommunications();
builder.Services.SetupAuth();
builder.Services.SetupDatabase();
builder.Services.SetupRouting();
builder.Services.SetupDocumentation();

builder.Services.AddScoped<IdentityService>();
builder.Services.AddScoped<StorageService>();
builder.Services.AddScoped<ModelDetectionService>();
builder.Services.AddScoped<GenerativeService>();
builder.Services.AddScoped<ChatService>();
builder.Services.AddScoped<ElevenLabsService>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddSingleton<ILiveKitService, LiveKitService>();
builder.Services.AddSingleton<IEmailService, EmailService>();
builder.Services.AddHostedService<NotificationCleanupService>();

var app = builder.Build();

app.SetupMiddlewares();
app.SetupCors();
app.SetupAuth();
app.SetupDocumentation();

await app.SetupProductionAsync();
await app.SetupDevelopmentAsync();
await app.SetupRolesAsync();

app.MapControllers();
app.MapHubs();

app.Run();
