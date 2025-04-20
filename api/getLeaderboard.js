const { TableClient, AzureNamedKeyCredential } = require("@azure/data-tables");

const accountName = process.env.STORAGE_ACCOUNT_NAME;
const accountKey = process.env.STORAGE_ACCOUNT_KEY;
const tableName = "Players";

module.exports = async function (context, req) {
    try {
        context.log("GetLeaderboard function triggered");
        
        // Verify environment variables are set
        if (!accountName || !accountKey) {
            context.log.error("Missing storage account credentials. Please check environment variables.");
            context.res = {
                status: 500,
                body: { error: "Server configuration error: Missing storage credentials" }
            };
            return;
        }

        const credential = new AzureNamedKeyCredential(accountName, accountKey);
        const client = new TableClient(`https://${accountName}.table.core.windows.net`, tableName, credential);

        const players = [];

        try {
            context.log("Attempting to retrieve players from table storage");
            for await (const entity of client.listEntities()) {
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
                body: { 
                    error: "Failed to retrieve player data", 
                    details: tableError.message,
                    storageAccount: accountName
                }
            };
            return;
        }

        players.sort((a, b) => a.moves - b.moves);
        const top10 = players.slice(0, 10);

        context.res = {
            status: 200,
            body: top10
        };
    } catch (error) {
        context.log.error(`Error in getLeaderboard function: ${error.message}`);
        context.res = {
            status: 500,
            body: { 
                error: "Failed to process leaderboard request",
                details: error.message,
                storageAccount: accountName ? `${accountName} (configured)` : "Not configured"
            }
        };
    }
};
