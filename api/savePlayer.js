const { TableClient, AzureNamedKeyCredential } = require("@azure/data-tables");

const accountName = process.env.STORAGE_ACCOUNT_NAME;
const accountKey = process.env.STORAGE_ACCOUNT_KEY;
const tableName = "Players";

module.exports = async function (context, req) {
    context.log("SavePlayer function triggered");
    
    // Handle CORS preflight OPTIONS request
    if (req.method === "OPTIONS") {
        context.res = {
            status: 204,
            headers: {
                "Access-Control-Allow-Origin": "https://alexjacob.dev",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
                "Access-Control-Max-Age": "86400"
            },
            body: ""
        };
        return;
    }
    
    // Set CORS headers for the actual request
    const headers = {
        "Access-Control-Allow-Origin": "https://alexjacob.dev",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Content-Type": "application/json"
    };
    
    try {
        // Log information for debugging (visible in Azure Function logs)
        context.log("Request body:", JSON.stringify(req.body, null, 2));
        
        const { name, moves } = req.body;

        if (!name || !moves) {
            context.log.error("Missing required fields: name or moves");
            context.res = {
                status: 400,
                headers: headers,
                body: { error: "Missing required fields: name or moves" }
            };
            return;
        }

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

        const entity = {
            partitionKey: "Players",
            rowKey: Date.now().toString(),
            name,
            moves
        };

        context.log(`Attempting to save player: ${name} with moves: ${moves}`);
        await client.createEntity(entity);
        context.log("Player saved successfully");

        context.res = {
            status: 200,
            headers: headers,
            body: { message: "Player saved successfully!", name, moves }
        };
    } catch (error) {
        context.log.error(`Error saving player: ${error.message}`);
        context.res = {
            status: 500,
            headers: headers,
            body: { 
                error: "Failed to save player data",
                details: error.message,
                storageAccount: accountName ? `${accountName} (configured)` : "Not configured"
            }
        };
    }
};
