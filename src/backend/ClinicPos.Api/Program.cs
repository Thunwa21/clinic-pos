using System.Text;
using ClinicPos.Api.Domain.Entities;
using ClinicPos.Api.Infrastructure;
using ClinicPos.Api.Infrastructure.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using RabbitMQ.Client;

var builder = WebApplication.CreateBuilder(args);

// --- OpenAPI ---
builder.Services.AddOpenApi();

// --- Tenant Context ---
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ITenantContext, HttpTenantContext>();

// --- EF Core + PostgreSQL ---
builder.Services.AddDbContext<ClinicPosDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// --- Redis distributed cache ---
builder.Services.AddStackExchangeRedisCache(options =>
{
    options.Configuration = builder.Configuration["Redis:ConnectionString"];
    options.InstanceName = "ClinicPos:";
});

// --- RabbitMQ ---
builder.Services.AddSingleton<IConnection>(sp =>
{
    var config = sp.GetRequiredService<IConfiguration>();
    var factory = new ConnectionFactory
    {
        HostName = config["RabbitMQ:HostName"] ?? "localhost",
        UserName = config["RabbitMQ:UserName"] ?? "guest",
        Password = config["RabbitMQ:Password"] ?? "guest",
        AutomaticRecoveryEnabled = true
    };
    return factory.CreateConnectionAsync().GetAwaiter().GetResult();
});

// --- Health Checks ---
builder.Services.AddHealthChecks()
    .AddDbContextCheck<ClinicPosDbContext>("database")
    .AddRedis(
        builder.Configuration["Redis:ConnectionString"] ?? "localhost:6379",
        name: "redis")
    .AddRabbitMQ(
        name: "rabbitmq");

builder.Services.AddControllers();

// --- JWT Authentication ---
var jwtKey = builder.Configuration["Jwt:Key"] ?? "ClinicPosDefaultSecretKey_MustBeAtLeast32Bytes!";
var keyBytes = Encoding.UTF8.GetBytes(jwtKey);

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "ClinicPos",
            ValidAudience = builder.Configuration["Jwt:Audience"] ?? "ClinicPos",
            IssuerSigningKey = new SymmetricSecurityKey(keyBytes)
        };
    });

// --- Authorization Policies ---
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("CanCreatePatient", policy =>
        policy.RequireRole(Roles.Admin, Roles.User));

    options.AddPolicy("CanViewPatient", policy =>
        policy.RequireRole(Roles.Admin, Roles.User, Roles.Viewer));
});

// --- CORS ---
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

// --- Auto-migrate + seed on startup ---
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ClinicPosDbContext>();
    if (db.Database.ProviderName == "Microsoft.EntityFrameworkCore.Sqlite")
        db.Database.EnsureCreated();
    else
        db.Database.Migrate();
    await DbSeeder.SeedAsync(db);
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.MapHealthChecks("/health");

app.Run();

// Make Program accessible for WebApplicationFactory<Program> in tests
public partial class Program { }
