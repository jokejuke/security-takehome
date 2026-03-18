# backend-csharp

ASP.NET Core version of the starter API using SQLite in-memory (`Microsoft.Data.Sqlite`).

## Run

```bash
dotnet run
```

Runs on `http://localhost:3000`.

## Endpoints

- `GET /bio-pages`
- `GET /bio-pages/:id`
- `GET /bio-pages/handle/:handle`
- `POST /bio-pages`
- `PATCH /bio-pages/:id`

This API is intentionally insecure and has no authentication/authorization.
