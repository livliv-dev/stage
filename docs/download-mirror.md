# Backup downloads

GitHub Releases is the primary download source. The optional R2 mirror serves the same installers at
`https://downloads.livliv.ai/stage/index.html`. It does not rebuild, re-sign or change the app.

## Cloudflare setup

Use a dedicated Standard-storage bucket, `livliv-stage-downloads`, so publishing downloads cannot expose
files from another bucket. Connect `downloads.livliv.ai` as its custom domain. The `r2.dev` development
URL is not needed. No Worker or paid Cloudflare zone plan is required for this static mirror.

Create an R2 Object Read & Write token scoped to this bucket only. Store its two credentials as GitHub
Actions repository secrets in `livliv-dev/vtuber-stage`:

- `STAGE_R2_ACCESS_KEY_ID`
- `STAGE_R2_SECRET_ACCESS_KEY`

Add repository variables:

- `STAGE_R2_ACCOUNT_ID`: the Cloudflare account ID
- `STAGE_R2_BUCKET`: `livliv-stage-downloads` (enables the workflow)
- `STAGE_DOWNLOAD_BASE_URL`: `https://downloads.livliv.ai`

Never put credentials in the repository or download bucket. Public downloads need no credentials.

## Publishing

The **Stage backup downloads** workflow runs for published stable releases. Run it manually with
`tag: latest` to copy the current release, or a stable version such as `v0.4.1` to backfill it.
GitHub's asset SHA256 digests and file sizes must match before anything is uploaded. Installers and
checksums upload first; the download page updates only if this is still GitHub's latest stable release.
Backfilling an older version does not replace the latest download page. Historical versions are not deleted.

The page and `stage/latest.json` cache for one minute; versioned files cache for one year. R2 does not
automatically serve `index.html` for directory URLs, so link to `/stage/index.html` explicitly.

To prepare a local preview using existing build artifacts:

```sh
node scripts/prepare-download-mirror.mjs --tag v0.4.1 --asset-dir /absolute/path/to/installers --output /tmp/stage-download-mirror
python3 -m http.server 8080 --directory /tmp/stage-download-mirror
```

Open `http://localhost:8080/stage/index.html`. The generated download links still point at the configured
public domain. Verify a public download against `stage/v0.4.1/SHA256SUMS.txt` after the first upload.

Disable future uploads by removing the `STAGE_R2_BUCKET` repository variable. GitHub downloads continue
to work independently. Remove the mirror links before disconnecting the custom domain or deleting files.
