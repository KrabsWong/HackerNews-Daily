# worker-deployment-tooling Specification Delta

## Overview
Update the Worker deployment tooling specification to clarify that Cloudflare Workers is the sole deployment method, removing references to GitHub Actions as an alternative.

## MODIFIED Requirements

### Requirement: Continuous Integration for Worker Deployment
The system SHALL optionally support automated Worker deployment via GitHub Actions for deploying the Worker code itself (distinct from the removed daily export workflow).

#### Scenario: Optional GitHub Actions Workflow for Worker Deployment
**Given** the project includes `.github/workflows/deploy-worker.yml`  
**When** code changes are pushed to the `main` branch affecting `src/worker/**` or `wrangler.toml`  
**Then** the GitHub Actions workflow SHALL:  
  1. Checkout repository  
  2. Setup Node.js environment  
  3. Install dependencies (`npm ci`)  
  4. Build Worker bundle (`npm run build:worker`)  
  5. Deploy to Cloudflare using `cloudflare/wrangler-action@v3`  
**And** the workflow SHALL use `CLOUDFLARE_API_TOKEN` secret for authentication  
**And** the workflow SHALL fail if bundle validation or deployment fails  
**And** this is a CI/CD pipeline for deploying the Worker itself (not for daily exports)

#### Scenario: Manual Workflow Trigger
**Given** the GitHub Actions workflow is configured  
**When** a developer triggers the workflow manually via `workflow_dispatch`  
**Then** the workflow SHALL allow selecting target environment (staging/production)  
**And** the workflow SHALL deploy to the selected environment  
**And** the workflow SHALL post deployment status as a comment (if triggered from PR)

#### Scenario: Deployment Rollback on Failure
**Given** the Worker deployment is automated via CI/CD  
**When** the post-deployment health check fails  
**Then** the workflow SHALL trigger a rollback to the previous Worker version  
**And** the workflow SHALL use `wrangler rollback` command  
**And** the workflow SHALL notify the team via configured channels (Slack, email, etc.)  
**And** the workflow SHALL fail with exit code 1 to prevent marking the deployment as successful

**Note**: This requirement refers to deploying the Worker code itself (CI/CD for infrastructure), NOT the removed daily export workflow. The daily export automation is now exclusively handled by the Worker's cron triggers.
