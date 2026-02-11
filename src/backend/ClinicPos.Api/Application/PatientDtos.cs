using System.ComponentModel.DataAnnotations;

namespace ClinicPos.Api.Application;

public record CreatePatientRequest
{
    [Required, MaxLength(200)] public string FirstName { get; init; } = string.Empty;
    [Required, MaxLength(200)] public string LastName { get; init; } = string.Empty;
    [Required, MaxLength(50)] public string PhoneNumber { get; init; } = string.Empty;
    public Guid? PrimaryBranchId { get; init; }
}

public record PatientResponse
{
    public Guid Id { get; init; }
    public Guid TenantId { get; init; }
    public string FirstName { get; init; } = string.Empty;
    public string LastName { get; init; } = string.Empty;
    public string PhoneNumber { get; init; } = string.Empty;
    public DateTime CreatedAt { get; init; }
    public Guid? PrimaryBranchId { get; init; }
}
