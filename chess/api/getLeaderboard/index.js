const { TableClient, AzureNamedKeyCredential } = require("@azure/data-tables");

const accountName = process.env.STORAGE_ACCOUNT_NAME;
const accountKey = process.env.STORAGE_ACCOUNT_KEY;
const tableName = "Players";

module.exports = async function (context, req) {
    context.log("GetLeaderboard function triggered");
    
    // Set CORS headers for all responses
    const headers = {
        "Access-Control-Allow-Origin": req.headers.origin || "*",
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

        const players = [];

        try {
            context.log("Attempting to retrieve players from table storage");
            // Use listEntities to get all players from the table
            const entities = client.listEntities();
            
            for await (const entity of entities) {
                players.push({
                    name: entity.name,
                    moves: entity.moves,
                    timestamp: entity.rowKey // Using rowKey as timestamp
                });
            }
            
            context.log(`Successfully retrieved ${players.length} players`);
        } catch (tableError) {
            context.log.error(`Error retrieving players: ${tableError.message}`);
            context.res = {
                status: 500,
                headers: headers,
                body: { 
                    error: "Failed to retrieve player data", 
                    details: tableError.message,
                    storageAccount: accountName
                }
            };
            return;
        }

        // Sort players by moves (ascending = better score)
        players.sort((a, b) => a.moves - b.moves);
        const top10 = players.slice(0, 10);

        context.res = {
            status: 200,
            headers: headers,
            body: top10
        };
    } catch (error) {
        context.log.error(`Error in getLeaderboard function: ${error.message}`);
        context.res = {
            status: 500,
            headers: headers,
            body: { 
                error: "Failed to process leaderboard request",
                details: error.message,
                storageAccount: accountName ? `${accountName} (configured)` : "Not configured"
            }
        };
    }
};