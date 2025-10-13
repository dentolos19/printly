# Build stage
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY EnterpriseServer.csproj .
RUN dotnet restore

COPY . .
RUN dotnet build -c Release -o /app/build

# Publish stage
FROM build AS publish

RUN dotnet publish -c Release -o /app/publish /p:UseAppHost=false

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime

WORKDIR /app
EXPOSE 8080

COPY --from=publish /app/publish .

ENTRYPOINT ["dotnet", "EnterpriseServer.dll"]