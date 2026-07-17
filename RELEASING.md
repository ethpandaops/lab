# Releasing

## Stable release

Run the [Release workflow](../../actions/workflows/release.yaml) (or `gh workflow run release.yaml`), picking a `patch`/`minor`/`major` bump. Everything else is automatic:

1. The workflow computes the next `vX.Y.Z` tag and publishes a GitHub release from `master`.
2. It builds the frontend and attaches `lab-<tag>.tar.gz` / `lab-<tag>.zip` to the release.
3. It then dispatches a `frontend-release` event to [lab-backend](https://github.com/ethpandaops/lab-backend), which tags its own next release and builds Docker images embedding this exact frontend version.

End to end this takes ~10 minutes; the lab-backend release notes and `/lab-backend/version` output record which frontend tag was embedded.

Publishing a release by hand through the GitHub UI also works — the release publish event runs the same workflow from step 2 onwards.

Deploying the resulting image is still a manual bump of `image.tag` in the [platform](https://github.com/ethpandaops/platform) lab application values.

## Alpha releases

Pushing to a `release/<name>` branch auto-tags and publishes a prerelease named `<name>-vX.Y.Z` with the same archives attached. Prereleases do **not** trigger a lab-backend release; to build a backend image against one, run the lab-backend `release` workflow manually with `frontend_tag: <name>-vX.Y.Z`.
