# LocatorLabs MCP Server

> 🎯 Intelligent Playwright locator generation powered by AI

An MCP (Model Context Protocol) server that provides smart locator generation for Playwright test automation. 

**Works directly in VS Code** (with GitHub Copilot), Cursor, Windsurf, Cline, and Claude Desktop. No extra apps needed - just your favorite IDE!

[![npm version](https://img.shields.io/npm/v/locatorlabs-mcp.svg)](https://www.npmjs.com/package/locatorlabs-mcp)
[![npm downloads](https://img.shields.io/npm/dm/locatorlabs-mcp.svg)](https://www.npmjs.com/package/locatorlabs-mcp)

### ⚡ Quick Install

<a href="#-quick-install"><img src="https://img.shields.io/badge/Install_in_VS_Code-007ACC?style=for-the-badge&logo=visualstudiocode&logoColor=white" alt="Install in VS Code"></a>
<a href="#-quick-install"><img src="https://img.shields.io/badge/Install_in_Cursor-000000?style=for-the-badge&logo=cursor&logoColor=white" alt="Install in Cursor"></a>

**VS Code (v1.99+):**
```bash
code --add-mcp '{"name":"locatorlabs","command":"npx","args":["-y","locatorlabs-mcp"]}'
```

**Cursor:**
```bash
cursor --add-mcp '{"name":"locatorlabs","command":"npx","args":["-y","locatorlabs-mcp"]}'
```

**Windows PowerShell:**
```powershell
code --add-mcp '{\"name\":\"locatorlabs\",\"command\":\"npx\",\"args\":[\"-y\",\"locatorlabs-mcp\"]}'
```

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🎯 **Get Locators** | Get all possible locators for any element (Playwright + Selenium formats) |
| 📊 **Analyze Page** | Scan pages and identify all interactive elements |
| 🏗️ **Generate POM** | Auto-generate Page Object classes for **Playwright** & **Selenium** |
| ✅ **Run Tests** | Execute Playwright tests and get pass/fail results |
| 📝 **Generate Tests** | Create executable test scripts |

## 🔧 Supported Frameworks

| Framework | Locators | Page Object Model |
|-----------|----------|-------------------|
| **Playwright** | ✅ `getByRole`, `getByTestId`, etc. | ✅ TypeScript, JavaScript, Python |
| **Selenium** | ✅ `By.id`, `By.xpath`, `By.cssSelector` | ✅ Java, Python, C# |

## 🚀 Quick Start

### For VS Code (v1.99+ with GitHub Copilot)

**One-Line Install (Mac/Linux):**
```bash
code --add-mcp '{"name":"locatorlabs","command":"npx","args":["-y","locatorlabs-mcp"]}'
```

**One-Line Install (Windows PowerShell):**
```powershell
code --add-mcp '{\"name\":\"locatorlabs\",\"command\":\"npx\",\"args\":[\"-y\",\"locatorlabs-mcp\"]}'
```

**Or Manual Setup:**
1. Open Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
2. Type: `MCP: Add Server`
3. Select: `Command (stdio)`
4. Command: `npx`
5. Args: `-y locatorlabs-mcp`

**Using with GitHub Copilot:**
1. Enable Agent Mode: Settings → Search `chat.agent.enabled` → Enable
2. Open Copilot Chat (`Ctrl+Cmd+I` / `Ctrl+Alt+I`)
3. Switch to **Agent** mode (dropdown at top)
4. Chat: "Get locators for login button on https://saucedemo.com"

### For Claude Desktop

**Step 1:** Open config file

- **Mac:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

**Step 2:** Add this configuration:

```json
{
  "mcpServers": {
    "locatorlabs": {
      "command": "npx",
      "args": ["-y", "locatorlabs-mcp"]
    }
  }
}
```

**Step 3:** Restart Claude Desktop

### For Cursor IDE

**One-Line Install:**
```bash
cursor --add-mcp '{"name":"locatorlabs","command":"npx","args":["-y","locatorlabs-mcp"]}'
```

**Or Manual:** Go to Cursor Settings → MCP → Add new MCP Server
- Name: `locatorlabs`
- Command: `npx -y locatorlabs-mcp`

### For VS Code + Cline Extension

Add to Cline MCP settings:

```json
{
  "mcpServers": {
    "locatorlabs": {
      "command": "npx",
      "args": ["-y", "locatorlabs-mcp"]
    }
  }
}
```

## 📖 Usage Examples

Just chat naturally:

### Get Locators for an Element

> "Get me all locators for the login button on https://www.saucedemo.com"

**Response:**

| Type | Locator | Reliability |
|------|---------|-------------|
| testId | `getByTestId('login-button')` | 98% |
| role | `getByRole('button', { name: 'Login' })` | 95% |
| id | `locator('#login-button')` | 90% |

### Analyze Entire Page

> "Analyze all form elements on https://www.saucedemo.com"

### Generate Page Object Model

**Playwright:**
> "Generate a TypeScript Page Object for https://www.saucedemo.com and call it LoginPage"

**Selenium:**
> "Generate a Java Selenium Page Object for https://www.saucedemo.com and call it LoginPage"

> "Generate a C# Selenium Page Object for https://www.saucedemo.com called LoginPage"

> "Generate a Python Selenium POM for https://www.saucedemo.com named LoginPage"

### Run a Test

> "Run a test that logs into saucedemo.com with standard_user and secret_sauce, then verify Products page appears"

**Response:**
```
✅ Test PASSED (3.2s)
- Navigate to login page ✅
- Enter username ✅
- Enter password ✅
- Click login ✅
- Verify Products visible ✅
```

### Generate Test Script

> "Generate a Python test script for the saucedemo login flow"

## 🛠️ Available Tools

| Tool | Description |
|------|-------------|
| `get_locators` | Get all possible locators (Playwright + Selenium formats) |
| `analyze_page` | List all interactive elements on a page |
| `generate_page_object` | Create POM class (Playwright: TS/JS/Python, Selenium: Java/Python/C#) |
| `run_test` | Execute tests in real browser, get pass/fail |
| `generate_test` | Generate executable test scripts |

## 📦 Supported Languages for Page Objects

| Language | Framework | Example Output |
|----------|-----------|----------------|
| `typescript` | Playwright | `page.getByRole('button')` |
| `javascript` | Playwright | `page.getByRole('button')` |
| `python` | Playwright | `page.get_by_role('button')` |
| `java-selenium` | Selenium | `@FindBy(id = "btn")` |
| `python-selenium` | Selenium | `By.ID, "btn"` |
| `csharp-selenium` | Selenium | `[FindsBy(How = How.Id)]` |

## 🎯 Supported Test Actions

| Action | Description |
|--------|-------------|
| `navigate` | Go to URL |
| `click` | Click element |
| `fill` | Enter text |
| `clear` | Clear input field |
| `check` / `uncheck` | Toggle checkbox |
| `select` | Select dropdown option |
| `hover` | Mouse hover |
| `press` | Keyboard key press |
| `assert_visible` | Verify element visible |
| `assert_hidden` | Verify element hidden |
| `assert_text` | Verify text content |
| `assert_value` | Verify input value |
| `assert_url` | Verify page URL |
| `assert_title` | Verify page title |
| `wait` | Wait for time |
| `wait_for_element` | Wait for element |
| `screenshot` | Capture screenshot |

## 🏆 Locator Priority

LocatorLabs ranks locators by reliability:

1. **data-testid** (98%) - Best, explicitly for testing
2. **Role + Name** (95%) - Playwright recommended
3. **Label** (90%) - Accessible
4. **ID** (90%) - Stable if meaningful
5. **Placeholder** (85%) - Good for inputs
6. **Text** (75%) - May change
7. **CSS** (60%) - Can be brittle
8. **XPath** (40%) - Avoid unless necessary

## 🔄 LocatorLabs vs Playwright MCP

| Feature | Playwright MCP | LocatorLabs MCP |
|---------|----------------|-----------------|
| Get all locators for element | ❌ | ✅ |
| Locator reliability ranking | ❌ | ✅ |
| Selenium locator format | ❌ | ✅ |
| Generate Playwright POM | ❌ | ✅ |
| Generate Selenium POM (Java/C#/Python) | ❌ | ✅ |
| Run tests with pass/fail | ❌ | ✅ |
| Browser automation | ✅ | ✅ |
| Device emulation | ✅ | ❌ |

**They work great together!** Use Playwright MCP for navigation/scraping, LocatorLabs MCP for locators/POMs/tests.

## 📋 Requirements

- Node.js 18+
- Playwright browsers (auto-installed on first run)

## 🔧 Troubleshooting

### Playwright browsers not installed

```bash
npx playwright install chromium
```

### Permission issues on Mac

```bash
chmod +x ~/.npm/_npx/*/node_modules/.bin/locatorlabs-mcp
```

### View logs (Claude Desktop)

```bash
tail -f ~/Library/Logs/Claude/mcp*.log
```

### Auto-approve tools in VS Code

Add to `settings.json`:
```json
{
  "chat.tools.autoApprove": true
}
```

## 🤝 Contributing

Contributions welcome! Please open an issue or PR on GitHub.

## 📺 Author

**Naveen AutomationLabs**

- YouTube: [@naveenautomationlabs](https://www.youtube.com/@naveenautomationlabs) (500K+ subscribers)
- Website: [naveenautomationlabs.com](https://naveenautomationlabs.com)
- LinkedIn: [Naveen AutomationLabs](https://linkedin.com/in/naveenkhunteta)

## 📄 License

MIT

---

