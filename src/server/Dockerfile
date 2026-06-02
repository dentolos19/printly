FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build

WORKDIR /src

COPY *.csproj .
RUN dotnet restore

COPY . .

RUN dotnet publish -c Release -o /app/publish /p:UseAppHost=false /p:AssemblyName=app

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime

WORKDIR /app

COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://*:3001

EXPOSE 3001

ENTRYPOINT ["dotnet", "app.dll"]
