namespace ClinicPos.Api.Infrastructure;

public interface ITenantContext
{
    Guid? TenantId { get; }
}

public class HttpTenantContext : ITenantContext
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public HttpTenantContext(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public Guid? TenantId
    {
        get
        {
            var claim = _httpContextAccessor.HttpContext?.User.FindFirst("TenantId")?.Value;
            return Guid.TryParse(claim, out var id) ? id : null;
        }
    }
}
