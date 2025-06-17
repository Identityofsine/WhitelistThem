# Chrome Extension Architecture

This Chrome extension has been refactored into a modular architecture for better maintainability and organization.

## Project Structure

### Core Files

- **`index.ts`** - Main entry point that re-exports all public APIs and imports the bootstrap process
- **`bootstrap.ts`** - Initialization logic and message handling setup

### Modules

#### `/cache`
- **`channelcache.ts`** - `ChannelCache` class for managing channel object lifecycle and caching

#### `/core` 
- **`extension.ts`** - `ChromeExtension` class containing the main extension logic including:
  - Video filtering and channel management
  - UI injection (header buttons, channel page controls)
  - YouTube Shorts removal
  - State management

#### `/interfaces`
- **`html.ts`** - HTML-related TypeScript interfaces like `HTMLChannelElement`

#### `/util`
- **`serializer.ts`** - `Serializer` class for JSON import/export of channel data

### Existing Structure
The following folders maintain their original structure:
- `/constants` - Settings and configuration
- `/factory` - Video object factory
- `/framework` - UI component framework
- `/handler` - Message and page handlers  
- `/object` - Data model classes
- `/styles` - SCSS stylesheets

## Key Features

1. **Channel Whitelisting** - Users can whitelist YouTube channels to show only videos from those channels
2. **UI Injection** - Adds controls to YouTube's interface for managing channel lists
3. **Shorts Removal** - Hides YouTube Shorts from feeds
4. **Real-time Filtering** - Dynamically shows/hides videos based on whitelist status
5. **Import/Export** - Serialize channel lists for backup and sharing

## Usage

The extension automatically injects when loaded on YouTube pages. The `bootstrap.ts` handles initialization and the `ChromeExtension` class manages all core functionality. 