# Favicon Generation Notes

The site now includes an SVG favicon (`/public/favicon.svg`) which works in all modern browsers.

## Optional: Generate PNG Favicons

If you want to add PNG favicons for older browser support, you can:

1. Use an online tool like https://realfavicongenerator.net/ or https://favicon.io/
2. Upload the SVG favicon and generate:
   - `favicon-32x32.png` (32x32 pixels)
   - `favicon-16x16.png` (16x16 pixels)
   - `apple-touch-icon.png` (180x180 pixels)

3. Place these files in the `/public` directory

The current setup will automatically use these files if they exist, but the SVG favicon will work fine for most use cases.

