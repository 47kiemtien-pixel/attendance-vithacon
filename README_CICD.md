# Attendance CI/CD

## Runtime

- Frontend: Vercel project connected to `47kiemtien-pixel/attendance-vithacon`.
- Backend: PM2 on the local Windows server, port `5005`.
- Public API: Cloudflare Tunnel.
- Database: PostgreSQL 16 in Docker, bound locally to `127.0.0.1:5433`.
- Stable deployed code: `%USERPROFILE%\attendance-vithacon-production`.

PostgreSQL is the only production data store. Deploys never remove or overwrite
the Docker database volume.

## Initial setup

Run PowerShell from the repository root:

```powershell
.\SETUP_CICD.ps1 `
  -VercelToken '<token>' `
  -VercelProjectId '<project-id>' `
  -VercelOrgId '<team-id>' `
  -GitHubRunnerToken '<temporary-runner-token>'
```

The GitHub runner token is created at:

`Repository Settings > Actions > Runners > New self-hosted runner`

Choose Windows x64 and pass the temporary token to the setup script. The runner receives the `attendance-local` label.

## Deployment flow

1. Push to `main`.
2. GitHub-hosted CI validates Electron, server JavaScript, and the Vite build.
3. Vercel deploys the client from `client/`.
4. The local runner mirrors backend code to the stable production directory and reloads PM2.
5. The tunnel watcher health-checks the public API, updates `VITE_API_URL`, and triggers a new Vercel production deployment when the tunnel URL changes.

## Useful commands

```powershell
pm2 status
pm2 logs attendance-backend
pm2 logs attendance-cloudflare-tunnel
pm2 logs attendance-tunnel-url-sync
```
