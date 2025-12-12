# Build Stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build

WORKDIR /src

COPY PrintlyServer.csproj .
RUN dotnet restore

COPY . .
RUN dotnet build -c Release -o /app/build

# Publish Stage
FROM build AS publish

RUN dotnet publish -c Release -o /app/publish /p:UseAppHost=false /p:AssemblyName=app

# Runtime Stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime

WORKDIR /app
EXPOSE 8080

ENV ASPNETCORE_ENVIRONMENT=Production

COPY --from=publish /app/publish .

ENTRYPOINT ["dotnet", "app.dll"]
