# Pulsar Website

The official website for the Pulsar Discord bot.

[https://benjifilly.github.io/Pulsar-website/](https://benjifilly.github.io/Pulsar-website/)

## Deployment

This site uses GitHub Pages for deployment via GitHub Actions.

### Configuration Required

To enable automatic deployment:

1. Go to **Settings** → **Pages** in the repository
2. Under **Build and deployment**:
   - Set **Source** to "GitHub Actions"
3. The workflow will automatically deploy on pushes to the `main` branch

### Manual Deployment

You can also trigger a deployment manually:
1. Go to the **Actions** tab
2. Select "Deploy static content to Pages"
3. Click "Run workflow"

### Troubleshooting

If deployments are stuck in "waiting" status:
- Ensure GitHub Pages is enabled with "GitHub Actions" as the source
- Check that the repository has the required permissions
- The first deployment may require manual approval in the Actions tab
