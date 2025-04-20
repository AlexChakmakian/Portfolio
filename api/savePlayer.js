const { TableClient, AzureNamedKeyCredential } = require("@azure/data-tables");

const accountName = process.env.STORAGE_ACCOUNT_NAME;
const accountKey = process.env.STORAGE_ACCOUNT_KEY;
const tableName = "Players";

module.exports = async function (context, req) {
    try {
        // Log information for debugging (visible in Azure Function logs)
        context.log("Function triggered with request:", JSON.stringify(req.body, null, 2));
        
        const { name, moves } = req.body;

        if (!name || !moves) {
            context.log.error("Missing required fields: name or moves");
            context.res = {
                status: 400,
                body: { error: "Missing required fields: name or moves" }
            };
            return;
        }

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
            body: { message: "Player saved successfully!", name, moves }
        };
    } catch (error) {
        context.log.error(`Error saving player: ${error.message}`);
        context.res = {
            status: 500,
            body: { 
                error: "Failed to save player data",
                details: error.message,
                storageAccount: accountName ? `${accountName} (configured)` : "Not configured"
            }
        };
    }
};
