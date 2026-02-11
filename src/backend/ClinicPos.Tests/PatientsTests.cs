using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

namespace ClinicPos.Tests;

public class PatientsTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly HttpClient _client;
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    public PatientsTests(TestWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    private async Task<string> LoginAsync(string username, string password, string tenantCode)
    {
        var res = await _client.PostAsJsonAsync("/auth/login", new { username, password, tenantCode });
        res.EnsureSuccessStatusCode();
        var doc = await JsonDocument.ParseAsync(await res.Content.ReadAsStreamAsync());
        return doc.RootElement.GetProperty("token").GetString()!;
    }

    private void SetToken(string token)
    {
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
    }

    // ─── Test 1: Tenant Isolation ───────────────────────────────────────
    [Fact]
    public async Task Tenant1_Cannot_See_Tenant2_Patients()
    {
        // Login as Tenant 1 admin and create a patient
        var token1 = await LoginAsync("admin@aura", "Admin123!", "AURA");
        SetToken(token1);

        var createRes = await _client.PostAsJsonAsync("/patients", new
        {
            firstName = "TenantOne",
            lastName = "Patient",
            phoneNumber = "0111111111"
        });
        Assert.Equal(HttpStatusCode.Created, createRes.StatusCode);

        // Verify Tenant 1 can see the patient
        var getRes1 = await _client.GetAsync("/patients");
        var patients1 = await getRes1.Content.ReadFromJsonAsync<JsonElement[]>(JsonOpts);
        Assert.Contains(patients1!, p => p.GetProperty("phoneNumber").GetString() == "0111111111");

        // Login as Tenant 2 admin
        var token2 = await LoginAsync("admin@silom", "Admin123!", "SLM");
        SetToken(token2);

        // Verify Tenant 2 cannot see Tenant 1's patient
        var getRes2 = await _client.GetAsync("/patients");
        var patients2 = await getRes2.Content.ReadFromJsonAsync<JsonElement[]>(JsonOpts);
        Assert.DoesNotContain(patients2!, p => p.GetProperty("phoneNumber").GetString() == "0111111111");
    }

    // ─── Test 2: Duplicate Phone Within Tenant ──────────────────────────
    [Fact]
    public async Task Duplicate_Phone_Within_Same_Tenant_Returns_409()
    {
        var token = await LoginAsync("admin@aura", "Admin123!", "AURA");
        SetToken(token);

        var body = new
        {
            firstName = "Dup",
            lastName = "Test",
            phoneNumber = "0999000999"
        };

        var first = await _client.PostAsJsonAsync("/patients", body);
        Assert.Equal(HttpStatusCode.Created, first.StatusCode);

        var second = await _client.PostAsJsonAsync("/patients", body);
        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
    }

    // ─── Test 3: Smoke Test — Health & Auth ─────────────────────────────
    [Fact]
    public async Task Unauthenticated_Request_Returns_401()
    {
        _client.DefaultRequestHeaders.Authorization = null;

        var res = await _client.GetAsync("/patients");
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    // ─── Test 4: Viewer Cannot Create Patient ───────────────────────────
    [Fact]
    public async Task Viewer_Cannot_Create_Patient()
    {
        var token = await LoginAsync("viewer@aura", "Viewer123!", "AURA");
        SetToken(token);

        var res = await _client.PostAsJsonAsync("/patients", new
        {
            firstName = "No",
            lastName = "Access",
            phoneNumber = "0000000000"
        });
        Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);
    }
}
