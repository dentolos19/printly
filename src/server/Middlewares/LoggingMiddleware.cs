using System.Diagnostics;

namespace PrintlyServer.Middlewares;

public class LoggingMiddleware(RequestDelegate next, ILogger<LoggingMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        var stopwatch = Stopwatch.StartNew();
        await next(context);
        stopwatch.Stop();

        var method = context.Request.Method;
        var path = context.Request.Path + context.Request.QueryString;
        var status = context.Response.StatusCode;
        var duration = stopwatch.ElapsedMilliseconds;

        var statusColor = status switch
        {
            >= 200 and < 300 => "\u001b[32m", // Green
            >= 300 and < 400 => "\u001b[36m", // Cyan
            >= 400 and < 500 => "\u001b[33m", // Yellow
            >= 500 => "\u001b[31m", // Red
            _ => "\u001b[37m", // White
        };

        var methodColor = method switch
        {
            "GET" => "\u001b[36m", // Cyan
            "POST" => "\u001b[32m", // Green
            "PUT" => "\u001b[33m", // Yellow
            "DELETE" => "\u001b[31m", // Red
            "PATCH" => "\u001b[35m", // Magenta
            _ => "\u001b[37m", // White
        };

        var reset = "\u001b[0m";

        logger.LogInformation(
            "{MethodColor}{Method}{Reset} {Path} {StatusColor}{Status}{Reset} in {Duration}ms",
            methodColor,
            method,
            reset,
            path,
            statusColor,
            status,
            reset,
            duration
        );
    }
}