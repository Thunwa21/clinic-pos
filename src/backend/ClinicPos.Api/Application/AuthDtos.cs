using System.ComponentModel.DataAnnotations;

namespace ClinicPos.Api.Application;

public record RegisterRequest
{
    [Required, MaxLength(100)] public string Username { get; init; } = string.Empty;
    [Required, MinLength(4)] public string Password { get; init; } = string.Empty;
    [Required] public string TenantCode { get; init; } = string.Empty;
    public Guid? BranchId { get; init; }
}

public record LoginRequest
{
    [Required] public string Username { get; init; } = string.Empty;
    [Required] public string Password { get; init; } = string.Empty;
    [Required] public string TenantCode { get; init; } = string.Empty;
}

public record LoginResponse
{
    public string Token { get; init; } = string.Empty;
    public string Username { get; init; } = string.Empty;
    public string Role { get; init; } = string.Empty;
    public Guid TenantId { get; init; }
    public string TenantCode { get; init; } = string.Empty;
    public string TenantName { get; init; } = string.Empty;
    public Guid? BranchId { get; init; }
}

public record TenantResponse
{
    public Guid Id { get; init; }
    public string Code { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
}

public record AssignRoleRequest
{
    [Required] public string Role { get; init; } = string.Empty;
}

public record AssignTenantRequest
{
    [Required] public Guid TenantId { get; init; }
    public Guid? BranchId { get; init; }
}

public record UserResponse
{
    public Guid Id { get; init; }
    public string Username { get; init; } = string.Empty;
    public string Role { get; init; } = string.Empty;
    public Guid TenantId { get; init; }
    public Guid? BranchId { get; init; }
    public DateTime CreatedAt { get; init; }
}
