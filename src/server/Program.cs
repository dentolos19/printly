using DotNetEnv.Configuration;
using PrintlyServer.Extensions;
using PrintlyServer.Hubs;
using PrintlyServer.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration.AddDotNetEnv();

builder.Services.SetupCors();
builder.Services.SetupSignalR();
builder.Services.SetupAuth();
builder.Services.SetupDatabase();
builder.Services.SetupRouting();
builder.Services.SetupDocumentation();

builder.Services.AddScoped<IdentityService>();
builder.Services.AddScoped<StorageService>();
builder.Services.AddScoped<GenerativeService>();

var app = builder.Build();

app.SetupMiddlewares();
app.SetupCors();
app.SetupAuth();
app.SetupDocumentation();

await app.SetupProductionAsync();
await app.SetupDevelopmentAsync();
await app.SetupRolesAsync();

app.MapControllers();
app.MapHub<ChatHub>("/hubs/chat");

app.Run();
