const { TableClient, AzureNamedKeyCredential } = require("@azure/data-tables");

const accountName = process.env.STORAGE_ACCOUNT_NAME;
const accountKey = process.env.STORAGE_ACCOUNT_KEY;
const tableName = "Players";

module.exports = async function (context, req) {
    context.log("SavePlayer function triggered");

    const requestOrigin = req.headers.origin;
    const allowedOrigin = requestOrigin === "https://alexjacob.dev" ? requestOrigin : "null";
    
    const headers = {
        "Access-Control-Allow-Origin": allowedOrigin,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, Origin, Accept",
        "Access-Control-Allow-Credentials": "true",
        "Vary": "Origin",
        "Content-Type": "application/json"
    };
    

    // Handle OPTIONS request (CORS preflight)
    if (req.method === "OPTIONS") {
        context.log("Handling OPTIONS request");
        context.res = {
            status: 200,
            headers: headers,
            body: ""
        };
        return;
    }

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
