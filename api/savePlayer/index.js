const { TableClient, AzureNamedKeyCredential } = require("@azure/data-tables");

const accountName = process.env.STORAGE_ACCOUNT_NAME;
const accountKey = process.env.STORAGE_ACCOUNT_KEY;
const tableName = "Players";

module.exports = async function (context, req) {
    context.log("SavePlayer function triggered");
    context.log("Storage Account Name:", accountName);
    context.log("Table Name:", tableName);

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
            context.log.error("Missing storage account credentials");
            context.log("Account Name:", accountName ? "Present" : "Missing");
            context.log("Account Key:", accountKey ? "Present" : "Missing");
            throw new Error("Storage account credentials not configured");
        }

        context.log("Creating TableClient with credentials");
        const credential = new AzureNamedKeyCredential(accountName, accountKey);
        const client = new TableClient(`https://${accountName}.table.core.windows.net`, tableName, credential);

        // Ensure table exists
        try {
            await client.createTable();
            context.log("Table created successfully");
        } catch (error) {
            if (error.code !== "TableAlreadyExists") {
                throw error;
            }
            context.log("Table already exists");
        }

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
        context.log.error("Error in savePlayer function:", error);
        context.log.error("Error details:", error.message);
        context.log.error("Error stack:", error.stack);
        
        context.res = {
            status: 500,
            headers: headers,
            body: {
                error: "Failed to save player data",
                details: error.message
            }
        };
    }
};
