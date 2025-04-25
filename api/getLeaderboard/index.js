const { TableClient, AzureNamedKeyCredential } = require("@azure/data-tables");

const accountName = process.env.STORAGE_ACCOUNT_NAME;
const accountKey = process.env.STORAGE_ACCOUNT_KEY;
const tableName = "Players";

module.exports = async function (context, req) {
    context.log("GetLeaderboard function triggered");
    context.log("Storage Account Name:", accountName);
    context.log("Table Name:", tableName);

    const requestOrigin = req.headers.origin;
    const allowedOrigin = requestOrigin === "https://alexjacob.dev" ? requestOrigin : "null";

    const headers = {
        "Access-Control-Allow-Origin": allowedOrigin,
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, Origin, Accept",
        "Access-Control-Allow-Credentials": "true",
        "Vary": "Origin",
        "Content-Type": "application/json"
    };

    // Handle preflight CORS
    if (req.method === "OPTIONS") {
        context.log("Handling OPTIONS request");
        context.res = {
            status: 204,
            headers,
            body: ""
        };
        return;
    }

    try {
        if (!accountName || !accountKey) {
            context.log.error("Missing storage account credentials");
            context.log("Account Name:", accountName ? "Present" : "Missing");
            context.log("Account Key:", accountKey ? "Present" : "Missing");
            throw new Error("Storage account credentials not configured");
        }

        context.log("Creating TableClient with credentials");
        const credential = new AzureNamedKeyCredential(accountName, accountKey);
        const client = new TableClient("https://chessleaderboard.table.core.windows.net", tableName, credential);

        context.log("Attempting to list entities");
        const entities = [];
        for await (const entity of client.listEntities()) {
            entities.push({
                name: entity.name,
                moves: entity.moves,
                timestamp: entity.rowKey,
                date: new Date(parseInt(entity.rowKey)).toLocaleDateString()
            });
        }

        context.log(`Retrieved ${entities.length} entities from table`);

        // Sort by most recent first
        entities.sort((a, b) => parseInt(b.timestamp) - parseInt(a.timestamp));

        context.res = {
            status: 200,
            headers,
            body: entities
        };
    } catch (error) {
        context.log.error("Error in getLeaderboard function:", error);
        context.log.error("Error details:", error.message);
        context.log.error("Error stack:", error.stack);
        
        context.res = {
            status: 500,
            headers,
            body: {
                error: "Failed to retrieve leaderboard data",
                details: error.message,
                stack: error.stack
            }
        };
    }
};
