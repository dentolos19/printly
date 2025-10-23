using DotNetEnv.Configuration;
using EnterpriseServer.Extensions;
using EnterpriseServer.Models;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration.AddDotNetEnv();

builder.Services.SetupCors();
builder.Services.SetupAuth(builder);
builder.Services.SetupDatabase(builder);
builder.Services.SetupRouting();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

app.SetupCors();
app.SetupAuth();

// app.UseHttpsRedirection();
app.UseSwagger();
app.UseSwaggerUI();

app.MapIdentityApi<User>();
await app.MapRoles();
app.MapControllers();

app.Run();