namespace ClinicPos.Api.Domain.Entities;

public class UserBranch
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public Guid BranchId { get; set; }
}
