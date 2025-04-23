const { TableClient, AzureNamedKeyCredential } = require("@azure/data-tables");

const accountName = process.env.STORAGE_ACCOUNT_NAME;
const accountKey = process.env.STORAGE_ACCOUNT_KEY;
const tableName = "Players";

// Define CORS headers
const corsHeaders = {
    "Access-Control-Allow-Origin": "https://alexjacob.dev",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Origin, Accept, X-Requested-With",
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin",
    "Content-Type": "application/json"
};

module.exports = async function (context, req) {
    context.log("GetLeaderboard function triggered");
    context.log("Request method:", req.method);
    context.log("Request headers:", JSON.stringify(req.headers, null, 2));
    
    // Handle OPTIONS request (CORS preflight)
    if (req.method === "OPTIONS") {
        context.log("Handling OPTIONS request");
        context.res = {
            status: 200,
            headers: corsHeaders,
            body: ""
        };
        return;
    }
    
    try {
        // Verify environment variables are set
        if (!accountName || !accountKey) {
            context.log.error("Missing storage account credentials. Please check environment variables.");
            context.res = {
                status: 500,
                headers: corsHeaders,
                body: { error: "Server configuration error: Missing storage credentials" }
            };
            return;
        }

        const credential = new AzureNamedKeyCredential(accountName, accountKey);
        const client = new TableClient(`https://${accountName}.table.core.windows.net`, tableName, credential);

        // Query all players
        const entities = [];
        for await (const entity of client.listEntities()) {
            entities.push({
                name: entity.name,
                moves: entity.moves,
                timestamp: entity.rowKey,
                date: new Date(parseInt(entity.rowKey)).toLocaleDateString()
            });
        }

        // Sort by timestamp (most recent first)
        entities.sort((a, b) => parseInt(b.timestamp) - parseInt(a.timestamp));

        context.log(`Retrieved ${entities.length} players from the leaderboard`);

        context.res = {
            status: 200,
            headers: corsHeaders,
            body: entities
        };
    } catch (error) {
        context.log.error(`Error retrieving leaderboard: ${error.message}`);
        context.res = {
            status: 500,
            headers: corsHeaders,
            body: { 
                error: "Failed to retrieve leaderboard data",
                details: error.message,
                storageAccount: accountName ? `${accountName} (configured)` : "Not configured"
            }
        };
    }
};