# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Captia** is a ticket scanner web application that uses AI to digitize purchase receipts. Users can upload or capture ticket images, which are processed using Google Gemini AI to extract product information, then saved to Airtable for record-keeping.

**Language Note**: The application UI, comments, and user-facing content are in Spanish.

## Technology Stack

- **Backend**: Node.js (v20) with Express.js
- **Templating**: EJS
- **AI Processing**: Google Gemini API (gemini-1.5-flash model)
- **Database**: Airtable (two tables: Tickets and Products/Lines)
- **Authentication**: JWT-based authentication with httpOnly cookies
- **File Handling**: Multer (memory storage)

## Development Commands

```bash
# Install dependencies
npm install

# Start the server (development/production)
npm start

# Server runs on PORT environment variable or defaults to 3000
```

**Note**: There are currently no tests configured. The `npm test` command will fail.

## Environment Setup

This application requires a `.env` file with the following variables:

**Required:**
- `GEMINI_API_KEY` - Google Gemini API key for image processing
- `AIRTABLE_API_KEY` - Airtable API key
- `AIRTABLE_BASE_ID` - Airtable base ID
- `AIRTABLE_TICKETS_TABLE` - Name of the tickets table in Airtable
- `AIRTABLE_LINES_TABLE` - Name of the products/lines table in Airtable
- `APP_PASSWORD` - Simple password for application access
- `SESSION_SECRET` - Secret for session encryption
- `GEMINI_PROMPT` - The prompt sent to Gemini AI for ticket data extraction (should instruct the model to return JSON with ticket structure)

**Optional:**
- `PORT` - Server port (default: 3000)
- `BASE_PATH` - Base path for deployment under a subdirectory (e.g., '/captia')

## Architecture

### Application Flow

1. **Authentication** (`/login`, `/logout`):
   - Simple password-based JWT authentication stored in httpOnly cookies
   - JWT tokens are valid for 7 days
   - `requireLogin` middleware verifies JWT and protects all main routes

2. **Ticket Scanning** (`/`, `/upload`):
   - Main page (`index.ejs`) provides camera capture and file upload options
   - Client-side JS (`public/js/app.js`) handles camera access and image capture
   - POST to `/upload` sends image to Gemini AI
   - AI extracts structured ticket data (establishment, date, products with units and prices)

3. **Data Editing** (`edit.ejs`):
   - User reviews and corrects AI-extracted data before saving
   - Form submission goes to `/save`

4. **Data Storage** (`/save`):
   - Creates ticket record in Airtable Tickets table
   - Creates linked product records in Airtable Lines table (batched in chunks of 10)
   - Products are linked to parent ticket via Airtable record ID

5. **Viewing Tickets** (`/tickets`, `/ticket/:id`):
   - List all tickets sorted by date (descending)
   - View individual ticket details with all product lines

### Key Files

- **server.js**: Main application file containing all routes and business logic
- **views/*.ejs**: EJS templates with `basePath` support for flexible deployment
- **public/js/app.js**: Camera/upload UI interactions
- **public/css/style.css**: Application styling

### Data Model

**Tickets Table (Airtable):**
- Establecimiento (string) - Store name
- Fecha (date) - Purchase date
- Productos (linked records) - References to Lineas_Ticket table

**Lineas_Ticket Table (Airtable):**
- Producto (string) - Product description
- Unidades (number) - Quantity
- Precio_Unitario (number) - Unit price
- Ticket (linked record) - Reference to parent ticket

### BASE_PATH Support

The application supports deployment under a subdirectory path via the `BASE_PATH` environment variable. All routes and static file serving are prefixed with this path. Templates receive `basePath` via `res.locals` for constructing links.

## Common Development Patterns

### Adding New Routes

All routes should:
1. Be prefixed with `basePath` template literal
2. Include `requireLogin` middleware if they require authentication
3. Handle errors and redirect/render appropriate error pages

Example:
```javascript
app.get(`${basePath}/new-route`, requireLogin, (req, res) => {
    // Route logic
});
```

### Modifying AI Extraction

To change what data is extracted from tickets, modify:
1. The `GEMINI_PROMPT` environment variable to adjust AI instructions
2. The `edit.ejs` template to match new data structure
3. The `/save` route to handle new fields when saving to Airtable
4. Airtable table schema if adding new columns

### Working with Airtable

- The application uses Airtable's JavaScript SDK
- Batch operations are limited to 10 records per request (see `/save` route for chunking example)
- Linked records use Airtable record IDs in array format

## Architecture Considerations

- **Single Server File**: All backend logic is in `server.js`. For larger features, consider extracting routes, middleware, or services into separate modules.
- **No Database Migrations**: Airtable schema changes must be done manually in the Airtable UI.
- **JWT Authentication**: Uses stateless JWT tokens in httpOnly cookies, making it compatible with serverless environments like Vercel.
- **File Storage**: Images are processed in memory and not persisted. Original ticket images are not stored anywhere.
- **Error Handling**: Most routes have basic try/catch blocks. Consider implementing more structured error handling and logging for production.

## Deployment

### Vercel (Serverless)

The application is fully compatible with Vercel's serverless platform:

1. **Configuration**: `vercel.json` routes all requests to `server.js`
2. **Authentication**: JWT-based auth works seamlessly in serverless environment
3. **Environment Variables**: Configure all required environment variables in Vercel dashboard (Settings → Environment Variables)
4. **Important**: Set `NODE_ENV=production` in Vercel to enable secure cookies

**Required Environment Variables for Vercel:**
- All variables listed in "Environment Setup" section above
- `NODE_ENV=production` (for secure cookie settings)

**Deployment Steps:**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Standard Web Server (VPS, Dedicated)

For traditional server deployment:

1. **Requirements**: Node.js v20+
2. **Setup**: Configure environment variables in `.env` file or server environment
3. **Start**: `npm start` or use process manager like PM2
4. **Reverse Proxy**: Recommended to use Nginx or Apache as reverse proxy

**Example with PM2:**
```bash
npm install -g pm2
pm2 start server.js --name captia
pm2 save
pm2 startup
```

**Note**: JWT authentication works identically on both Vercel and standard servers.
