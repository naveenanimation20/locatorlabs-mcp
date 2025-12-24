# LocatorLabs MCP Server

> Intelligent Playwright locator generation powered by AI

An MCP (Model Context Protocol) server that provides smart locator generation for Playwright test automation. Works with Claude Desktop, Cursor, Cline, and other MCP-compatible clients.

## Features

- 🎯 **Get All Locators** - Generate every possible locator for an element with reliability rankings
- 📊 **Page Analysis** - Scan entire pages and identify all interactive elements
- 🏗️ **Page Object Generator** - Auto-generate POM classes in TypeScript, JavaScript, or Python
- ✅ **Locator Validation** - Verify locators are unique and stable

## Installation

```bash
npm install -g @naveenautomationlabs/locatorlabs-mcp
```

## Setup

### Claude Desktop

Add to your Claude Desktop config:

**Mac:** `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "locatorlabs": {
      "command": "npx",
      "args": ["-y", "@naveenautomationlabs/locatorlabs-mcp"]
    }
  }
}
```

Restart Claude Desktop after adding the configuration.

### Cursor IDE

Add to `.cursor/mcp.json` in your project:

```json
{
  "mcpServers": {
    "locatorlabs": {
      "command": "npx",
      "args": ["-y", "@naveenautomationlabs/locatorlabs-mcp"]
    }
  }
}
```

### VS Code + Cline

Add to Cline MCP settings:

```json
{
  "mcpServers": {
    "locatorlabs": {
      "command": "npx",
      "args": ["-y", "@naveenautomationlabs/locatorlabs-mcp"]
    }
  }
}
```

## Usage Examples

Once configured, just chat naturally with Claude:

### Get Locators for an Element

> "Get me all locators for the login button on https://example.com/login"

Claude will return:

| Type | Locator | Reliability |
|------|---------|-------------|
| testId | `getByTestId('login-btn')` | ⭐⭐⭐⭐⭐ |
| role | `getByRole('button', { name: 'Login' })` | ⭐⭐⭐⭐⭐ |
| text | `getByText('Login')` | ⭐⭐⭐⭐ |
| css | `locator('.btn-primary')` | ⭐⭐⭐ |

### Analyze Entire Page

> "Analyze all form elements on https://example.com/register"

### Generate Page Object Model

> "Generate a TypeScript Page Object for the login page at https://example.com/login, call it LoginPage"

### Validate a Locator

> "Check if getByRole('button', { name: 'Submit' }) is unique on https://example.com/form"

## Available Tools

| Tool | Description |
|------|-------------|
| `get_locators` | Get all possible locators for a specific element |
| `analyze_page` | List all interactive elements on a page |
| `generate_page_object` | Create POM class (TS/JS/Python) |
| `validate_locator` | Check if locator is unique and valid |
| `run_test` | **Execute a Playwright test and return pass/fail** |
| `generate_test` | **Generate executable test script** |

## 🚀 Test Execution (Killer Feature!)

LocatorLabs can actually RUN your tests, not just generate code!

### Example: Run a Login Test

Ask Claude:

> "Run a test that logs into saucedemo.com with user 'standard_user' and password 'secret_sauce', then verify the inventory page loads"

Claude will:
1. Generate test steps
2. Execute them in a real browser
3. Return: ✅ PASSED or ❌ FAILED with details

### Example Response:

```json
{
  "testName": "Login Test",
  "status": "passed",
  "duration": 3420,
  "steps": [
    { "step": "Navigate to login page", "status": "passed", "duration": 1200 },
    { "step": "Enter username", "status": "passed", "duration": 150 },
    { "step": "Enter password", "status": "passed", "duration": 120 },
    { "step": "Click login button", "status": "passed", "duration": 180 },
    { "step": "Verify inventory page visible", "status": "passed", "duration": 1770 }
  ]
}
```

## Locator Priority

LocatorLabs ranks locators by reliability:

1. **data-testid** (98%) - Best, explicitly for testing
2. **Role + Name** (95%) - Playwright recommended
3. **ID** (90%) - Stable if meaningful
4. **Label/Placeholder** (85%) - Good for forms
5. **Text** (75%) - May change
6. **CSS** (60%) - Can be brittle
7. **XPath** (40%) - Avoid unless necessary

## Requirements

- Node.js 18+
- Playwright browsers (auto-installed)

## Development

```bash
# Clone repo
git clone https://github.com/naveenautomationlabs/locatorlabs-mcp.git
cd locatorlabs-mcp

# Install dependencies
npm install

# Build
npm run build

# Run locally
npm start
```

## Author

**Naveen AutomationLabs**
- YouTube: [Naveen AutomationLabs](https://youtube.com/@naboratory)
- Website: [naveenautomationlabs.com](https://naveenautomationlabs.com)

## License

MIT