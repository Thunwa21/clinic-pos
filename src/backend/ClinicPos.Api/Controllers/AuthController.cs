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
            FullName = request.Username,
            Role = Roles.Viewer,
            TenantId = tenant.Id
        };

        _db.Users.Add(user);

        // If a BranchId is provided, create the UserBranch association
        if (request.BranchId.HasValue)
        {
            _db.UserBranches.Add(new UserBranch
            {
                UserId = user.Id,
                BranchId = request.BranchId.Value
            });
        }

        await _db.SaveChangesAsync();

        return Created($"/auth/users/{user.Id}", await ToResponseAsync(user));
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

        // Fetch user branches
        var branches = await _db.UserBranches
            .Where(ub => ub.UserId == user.Id)
            .Join(_db.Branches, ub => ub.BranchId, b => b.Id, (ub, b) => new BranchInfo { Id = b.Id, Name = b.Name })
            .ToArrayAsync();

        var token = GenerateJwt(user, branches);

        return Ok(new LoginResponse
        {
            Token = token,
            Username = user.Username,
            FullName = user.FullName,
            Role = user.Role,
            TenantId = user.TenantId,
            TenantCode = tenant.Code,
            TenantName = tenant.Name,
            Branches = branches
        });
    }

    // --- POST /auth/users (Admin only) ---
    [HttpPost("users")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest request)
    {
        var tenantId = GetTenantId();
        if (tenantId == null)
            return Forbid();

        var validRoles = new[] { Roles.Admin, Roles.User, Roles.Viewer };
        if (!validRoles.Contains(request.Role))
            return BadRequest(new { error = $"Invalid role. Must be one of: {string.Join(", ", validRoles)}" });

        if (await _db.Users.AnyAsync(u => u.Username == request.Username))
            return Conflict(new { error = "Username already exists." });

        // Validate that all branchIds belong to the current tenant
        if (request.BranchIds.Length > 0)
        {
            var validBranchCount = await _db.Branches
                .Where(b => b.TenantId == tenantId.Value && request.BranchIds.Contains(b.Id))
                .CountAsync();
            if (validBranchCount != request.BranchIds.Length)
                return BadRequest(new { error = "One or more branch IDs do not belong to your tenant." });
        }

        var user = new User
        {
            Username = request.Username,
            PasswordHash = HashPassword(request.Password),
            FullName = request.FullName,
            Role = request.Role,
            TenantId = tenantId.Value
        };

        _db.Users.Add(user);

        foreach (var branchId in request.BranchIds)
        {
            _db.UserBranches.Add(new UserBranch
            {
                UserId = user.Id,
                BranchId = branchId
            });
        }

        await _db.SaveChangesAsync();

        return Created($"/auth/users/{user.Id}", await ToResponseAsync(user));
    }

    // --- PUT /auth/users/{id}/role (Admin only) ---
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

        return Ok(await ToResponseAsync(user));
    }

    // --- POST /auth/users/{id}/branches (Admin only) ---
    [HttpPost("users/{id:guid}/branches")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> AddBranches(Guid id, [FromBody] AddBranchesRequest request)
    {
        var tenantId = GetTenantId();
        if (tenantId == null)
            return Forbid();

        var user = await _db.Users.FindAsync(id);
        if (user == null)
            return NotFound(new { error = "User not found." });

        if (user.TenantId != tenantId.Value)
            return Forbid();

        // Validate branches belong to tenant
        var validBranchCount = await _db.Branches
            .Where(b => b.TenantId == tenantId.Value && request.BranchIds.Contains(b.Id))
            .CountAsync();
        if (validBranchCount != request.BranchIds.Length)
            return BadRequest(new { error = "One or more branch IDs do not belong to your tenant." });

        // Get existing associations
        var existing = await _db.UserBranches
            .Where(ub => ub.UserId == id)
            .Select(ub => ub.BranchId)
            .ToListAsync();

        foreach (var branchId in request.BranchIds)
        {
            if (!existing.Contains(branchId))
            {
                _db.UserBranches.Add(new UserBranch
                {
                    UserId = id,
                    BranchId = branchId
                });
            }
        }

        await _db.SaveChangesAsync();

        return Ok(await ToResponseAsync(user));
    }

    // --- PUT /auth/users/{id}/tenant (Admin only) ---
    [HttpPut("users/{id:guid}/tenant")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> AssignTenant(Guid id, [FromBody] AssignTenantRequest request)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null)
            return NotFound(new { error = "User not found." });

        user.TenantId = request.TenantId;
        await _db.SaveChangesAsync();

        // If a branch is provided, add association
        if (request.BranchId.HasValue)
        {
            var exists = await _db.UserBranches.AnyAsync(ub => ub.UserId == id && ub.BranchId == request.BranchId.Value);
            if (!exists)
            {
                _db.UserBranches.Add(new UserBranch
                {
                    UserId = id,
                    BranchId = request.BranchId.Value
                });
                await _db.SaveChangesAsync();
            }
        }

        return Ok(await ToResponseAsync(user));
    }

    private string GenerateJwt(User user, BranchInfo[] branches)
    {
        var key = _config["Jwt:Key"] ?? "ClinicPosDefaultSecretKey_MustBeAtLeast32Bytes!";
        var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
        var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

        var branchIds = string.Join(",", branches.Select(b => b.Id));

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Username),
            new Claim(ClaimTypes.Role, user.Role),
            new Claim("TenantId", user.TenantId.ToString()),
            new Claim("BranchIds", branchIds),
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

    private Guid? GetTenantId()
    {
        var claim = User.FindFirst("TenantId")?.Value;
        return Guid.TryParse(claim, out var id) ? id : null;
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

    private async Task<UserResponse> ToResponseAsync(User u)
    {
        var branches = await _db.UserBranches
            .Where(ub => ub.UserId == u.Id)
            .Join(_db.Branches, ub => ub.BranchId, b => b.Id, (ub, b) => new BranchInfo { Id = b.Id, Name = b.Name })
            .ToArrayAsync();

        return new UserResponse
        {
            Id = u.Id,
            Username = u.Username,
            FullName = u.FullName,
            Role = u.Role,
            TenantId = u.TenantId,
            Branches = branches,
            CreatedAt = u.CreatedAt
        };
    }
}
