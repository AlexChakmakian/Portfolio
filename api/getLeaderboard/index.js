const { TableClient, AzureNamedKeyCredential } = require("@azure/data-tables");

const accountName = process.env.STORAGE_ACCOUNT_NAME;
const accountKey = process.env.STORAGE_ACCOUNT_KEY;
const tableName = "Players";

module.exports = async function (context, req) {
    context.log("GetLeaderboard function triggered");
    context.log("Request method:", req.method);
    context.log("Request headers:", JSON.stringify(req.headers, null, 2));

    // Dynamically set CORS based on request origin
    const requestOrigin = req.headers.origin;
    const allowedOrigin = requestOrigin === "https://alexjacob.dev" ? requestOrigin : "null";

    const headers = {
        "Access-Control-Allow-Origin": allowedOrigin,
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, Origin, Accept, X-Requested-With",
        "Access-Control-Allow-Credentials": "true",
        "Vary": "Origin",
        "Content-Type": "application/json"
    };

    // Handle OPTIONS preflight request
    if (req.method === "OPTIONS") {
        context.log("Handling OPTIONS request");
        context.res = {
            status: 204,
            headers: headers,
            body: ""
        };
        return;
    }

    try {
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

        const entities = [];
        for await (const entity of client.listEntities()) {
            entities.push({
                name: entity.name,
                moves: entity.moves,
                timestamp: entity.rowKey,
                date: new Date(parseInt(entity.rowKey)).toLocaleDateString()
            });
        }

        // Sort by most recent
        entities.sort((a, b) => parseInt(b.timestamp) - parseInt(a.timestamp));

        context.log(`Retrieved ${entities.length} players from the leaderboard`);

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
                details: error.message,
                storageAccount: accountName ? `${accountName} (configured)` : "Not configured"
            }
        };
    }
};
