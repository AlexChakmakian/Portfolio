const { TableClient, AzureNamedKeyCredential } = require("@azure/data-tables");

const accountName = process.env.STORAGE_ACCOUNT_NAME;
const accountKey = process.env.STORAGE_ACCOUNT_KEY;
const tableName = "Players";

module.exports = async function (context, req) {
    context.log("GetLeaderboard function triggered");
    
    // Set CORS headers for all responses
    const headers = {
        "Access-Control-Allow-Origin": "https://alexjacob.dev",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Content-Type": "application/json"
    };

    // Handle OPTIONS request (CORS preflight)
    if (req.method === "OPTIONS") {
        context.res = {
            status: 204,
            headers: headers,
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
                headers: headers,
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

        context.res = {
            status: 200,
            headers: headers,
            body: entities
        };
    } catch (error) {
        context.log.error(`Error retrieving leaderboard: ${error.message}`);
        context.res = {
            status: 500,
            headers: headers,
            body: { 
                error: "Failed to retrieve leaderboard data",
                details: error.message
            }
        };
    }
};