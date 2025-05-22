# Obsidian Boilerplate

A boilerplate template for developing Obsidian plugins with TypeScript, esbuild, and modern development tools.

## Features

- 🚀 **TypeScript Support**: Full TypeScript integration for type-safe development
- ⚡ **Fast Builds**: Uses esbuild for lightning-fast builds
- 🛠 **Modern Tooling**: Includes ESLint, Prettier, and other modern development tools
- 📦 **Easy Setup**: Simple installation and development workflow
- 📝 **Documentation**: Comprehensive documentation and examples

## Installation

1. Clone this repository:
```bash
git clone https://github.com/admjs/obsidian-boilerplate.git
cd obsidian-boilerplate
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm run dev
```

## Development

### Project Structure

```
obsidian-boilerplate/
├── main.ts           # Main plugin code
├── manifest.json     # Plugin manifest
├── package.json      # Project configuration
├── styles.css        # Plugin styles
└── esbuild.config.mjs # Build configuration
```

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run version` - Bump version and update manifest

## Building for Production

To build the plugin for production:

```bash
npm run build
```

This will create a production-ready build in the `dist` directory.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

- Adam Smith ([@admjs](https://github.com/admjs))

## Support

If you find this boilerplate helpful, please consider giving it a star on GitHub!
