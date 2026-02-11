using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using ClinicPos.Api.Application;
using ClinicPos.Api.Domain.Entities;
using ClinicPos.Api.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace ClinicPos.Api.Controllers;

[ApiController]
[Route("[controller]")]
public class AuthController : ControllerBase
{
    private readonly ClinicPosDbContext _db;
    private readonly IConfiguration _config;

    public AuthController(ClinicPosDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    [HttpGet("tenants")]
    public async Task<IActionResult> GetTenants()
    {
        var tenants = await _db.Tenants
            .OrderBy(t => t.Code)
            .Select(t => new TenantResponse { Id = t.Id, Code = t.Code, Name = t.Name })
            .ToListAsync();

        return Ok(tenants);
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        var tenant = await _db.Tenants.FirstOrDefaultAsync(t => t.Code == request.TenantCode.ToUpper());
        if (tenant == null)
            return BadRequest(new { error = "Invalid tenant code." });

        if (await _db.Users.AnyAsync(u => u.Username == request.Username))
            return Conflict(new { error = "Username already exists." });

        var user = new User
        {
            Username = request.Username,
            PasswordHash = HashPassword(request.Password),
            Role = Roles.Viewer,
            TenantId = tenant.Id,
            BranchId = request.BranchId
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        return Created($"/auth/users/{user.Id}", ToResponse(user));
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var tenant = await _db.Tenants.FirstOrDefaultAsync(t => t.Code == request.TenantCode.ToUpper());
        if (tenant == null)
            return BadRequest(new { error = "Invalid tenant code." });

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Username == request.Username && u.TenantId == tenant.Id);
        if (user == null || !VerifyPassword(request.Password, user.PasswordHash))
            return Unauthorized(new { error = "Invalid username or password." });

        var token = GenerateJwt(user);

        return Ok(new LoginResponse
        {
            Token = token,
            Username = user.Username,
            Role = user.Role,
            TenantId = user.TenantId,
            TenantCode = tenant.Code,
            TenantName = tenant.Name,
            BranchId = user.BranchId
        });
    }

    [HttpPut("users/{id:guid}/role")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> AssignRole(Guid id, [FromBody] AssignRoleRequest request)
    {
        var validRoles = new[] { Roles.Admin, Roles.User, Roles.Viewer };
        if (!validRoles.Contains(request.Role))
            return BadRequest(new { error = $"Invalid role. Must be one of: {string.Join(", ", validRoles)}" });

        var user = await _db.Users.FindAsync(id);
        if (user == null)
            return NotFound(new { error = "User not found." });

        user.Role = request.Role;
        await _db.SaveChangesAsync();

        return Ok(ToResponse(user));
    }

    [HttpPut("users/{id:guid}/tenant")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> AssignTenant(Guid id, [FromBody] AssignTenantRequest request)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null)
            return NotFound(new { error = "User not found." });

        user.TenantId = request.TenantId;
        user.BranchId = request.BranchId;
        await _db.SaveChangesAsync();

        return Ok(ToResponse(user));
    }

    private string GenerateJwt(User user)
    {
        var key = _config["Jwt:Key"] ?? "ClinicPosDefaultSecretKey_MustBeAtLeast32Bytes!";
        var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
        var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Username),
            new Claim(ClaimTypes.Role, user.Role),
            new Claim("TenantId", user.TenantId.ToString()),
            new Claim("BranchId", user.BranchId?.ToString() ?? ""),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"] ?? "ClinicPos",
            audience: _config["Jwt:Audience"] ?? "ClinicPos",
            claims: claims,
            expires: DateTime.UtcNow.AddHours(8),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static string HashPassword(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(16);
        var hash = Rfc2898DeriveBytes.Pbkdf2(password, salt, 100_000, HashAlgorithmName.SHA256, 32);
        return $"{Convert.ToBase64String(salt)}.{Convert.ToBase64String(hash)}";
    }

    private static bool VerifyPassword(string password, string stored)
    {
        var parts = stored.Split('.');
        if (parts.Length != 2) return false;

        var salt = Convert.FromBase64String(parts[0]);
        var storedHash = Convert.FromBase64String(parts[1]);
        var hash = Rfc2898DeriveBytes.Pbkdf2(password, salt, 100_000, HashAlgorithmName.SHA256, 32);

        return CryptographicOperations.FixedTimeEquals(hash, storedHash);
    }

    private static UserResponse ToResponse(User u) => new()
    {
        Id = u.Id,
        Username = u.Username,
        Role = u.Role,
        TenantId = u.TenantId,
        BranchId = u.BranchId,
        CreatedAt = u.CreatedAt
    };
}
