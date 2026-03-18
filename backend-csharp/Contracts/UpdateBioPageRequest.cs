namespace BackendCsharp.Contracts;

public class UpdateBioPageRequest
{
    public string? Handle { get; set; }
    public string? DisplayName { get; set; }
    public string? Bio { get; set; }
    public List<BioLinkRequest>? Links { get; set; }
}
